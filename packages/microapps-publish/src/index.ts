#!/usr/bin/env node
/* eslint-disable no-console */

import 'source-map-support/register';
// Used by ts-convict
import 'reflect-metadata';
import { exec } from 'child_process';
import * as util from 'util';
import * as lambda from '@aws-sdk/client-lambda';
import * as s3 from '@aws-sdk/client-s3';
import * as sts from '@aws-sdk/client-sts';
import { Command, flags as flagsParser } from '@oclif/command';
import { IConfig as OCLIFIConfig } from '@oclif/config';
import { handle as errorHandler } from '@oclif/errors';
import chalk from 'chalk';
import path from 'path';
import { promises as fs, pathExists, createReadStream } from 'fs-extra';
import { Listr, ListrTask } from 'listr2';
import { Config, IConfig } from './config/Config';
import DeployClient, { IDeployVersionPreflightResult } from './DeployClient';
import S3Uploader from './S3Uploader';
import S3TransferUtility from './S3TransferUtility';
import { Upload } from '@aws-sdk/lib-storage';
import { contentType } from 'mime-types';
import { TaskWrapper } from 'listr2/dist/lib/task-wrapper';
import { DefaultRenderer } from 'listr2/dist/renderer/default.renderer';
const asyncSetTimeout = util.promisify(setTimeout);
const asyncExec = util.promisify(exec);

const RUNNING_TEXT = ' RUNS ';
const RUNNING = chalk.reset.inverse.yellow.bold(RUNNING_TEXT) + ' ';

const lambdaClient = new lambda.LambdaClient({
  maxAttempts: 8,
});

interface IVersions {
  version: string;
  alias?: string;
}

export interface IContext {
  preflightResult: IDeployVersionPreflightResult;
  files: string[];
}

class PublishTool extends Command {
  static flags = {
    version: flagsParser.version({
      char: 'v',
    }),
    help: flagsParser.help(),
    deployerLambdaName: flagsParser.string({
      char: 'd',
      multiple: false,
      required: true,
      description: 'Name of the deployer lambda function',
    }),
    newVersion: flagsParser.string({
      char: 'n',
      multiple: false,
      required: true,
      description: 'New semantic version to apply',
    }),
    repoName: flagsParser.string({
      char: 'r',
      multiple: false,
      required: true,
      description: 'Name (not URI) of the Docker repo for the app',
    }),
    leaveCopy: flagsParser.boolean({
      char: 'l',
      default: false,
      required: false,
      description: 'Leave a copy of the modifed files as .modified',
    }),
  };

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
  private static escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }

  private VersionAndAlias: IVersions;
  private IMAGE_TAG = '';
  private IMAGE_URI = '';
  private FILES_TO_MODIFY: {
    path: string;
    versions: IVersions;
  }[];
  private _restoreFilesStarted = false;

  constructor(argv: string[], config: OCLIFIConfig) {
    super(argv, config);
    this.restoreFiles = this.restoreFiles.bind(this);
  }

  async run(): Promise<void> {
    const { flags: parsedFlags } = this.parse(PublishTool);
    const version = parsedFlags.newVersion;
    const leaveFiles = parsedFlags.leaveCopy;
    const lambdaName = parsedFlags.deployerLambdaName;
    const ecrRepo = parsedFlags.repoName;

    // Override the config value
    const config = Config.instance;
    config.deployer.lambdaName = lambdaName;
    config.app.semVer = version;

    // Get the account ID and region from STS
    // TODO: Move this to the right place
    if (config.app.awsAccountID === 0 || config.app.awsRegion === '') {
      const stsClient = new sts.STSClient({
        maxAttempts: 8,
      });
      const stsResponse = await stsClient.send(new sts.GetCallerIdentityCommand({}));
      if (config.app.awsAccountID === 0) {
        config.app.awsAccountID = parseInt(stsResponse.Account, 10);
      }
      if (config.app.awsRegion === '') {
        config.app.awsRegion = stsClient.config.region as string;
      }
    }
    if (config.app.ecrHost === '') {
      config.app.ecrHost = `${config.app.awsAccountID}.dkr.ecr.${config.app.awsRegion}.amazonaws.com`;
    }
    if (ecrRepo) {
      config.app.ecrRepoName = ecrRepo;
    } else if (config.app.ecrRepoName === '') {
      config.app.ecrRepoName = `microapps-app-${config.app.name}${Config.envLevel}-repo`;
    }

    this.VersionAndAlias = this.createVersions(version);
    const versionOnly = { version: this.VersionAndAlias.version };

    this.FILES_TO_MODIFY = [
      { path: 'package.json', versions: versionOnly },
      // { path: 'deploy.json', versions: this.VersionAndAlias },
      { path: 'next.config.js', versions: versionOnly },
    ] as { path: string; versions: IVersions }[];

    // Install handler to ensure that we restore files
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    process.on('SIGINT', async () => {
      if (this._restoreFilesStarted) {
        return;
      } else {
        this._restoreFilesStarted = true;
      }
      this.log('Caught Ctrl-C, restoring files');
      await S3Uploader.removeTempDirIfExists();
      await this.restoreFiles();
    });

    if (config === undefined) {
      this.error('Failed to load the config file');
    }
    if (config.app.staticAssetsPath === undefined) {
      this.error('StaticAssetsPath must be specified in the config file');
    }

    //
    // Setup Tasks
    //

    const tasks = new Listr<IContext>(
      [
        {
          title: 'Logging into ECR',
          task: async (ctx, task) => {
            const origTitle = task.title;
            task.title = RUNNING + origTitle;

            await this.loginToECR(config);

            task.title = origTitle;
          },
        },
        {
          title: 'Modifying Config Files',
          task: async (ctx, task) => {
            const origTitle = task.title;
            task.title = RUNNING + origTitle;

            // Modify the existing files with the new version
            for (const fileToModify of this.FILES_TO_MODIFY) {
              task.output = `Patching version (${this.VersionAndAlias.version}) into ${fileToModify.path}`;
              if (
                !(await this.writeNewVersions(fileToModify.path, fileToModify.versions, leaveFiles))
              ) {
                task.output = `Failed modifying file: ${fileToModify.path}`;
              }
            }

            task.title = origTitle;
          },
        },
        {
          title: 'Preflight Version Check',
          task: async (ctx, task) => {
            const origTitle = task.title;
            task.title = RUNNING + origTitle;

            // Confirm the Version Does Not Exist in Published State
            task.output = `Checking if deployed app/version already exists for ${config.app.name}/${version}`;
            ctx.preflightResult = await DeployClient.DeployVersionPreflight(config, task);
            if (ctx.preflightResult.exists) {
              task.output = `Warning: App/Version already exists: ${config.app.name}/${config.app.semVer}`;
            }

            task.title = origTitle;
          },
        },
        {
          title: 'Serverless Next.js Build',
          task: async (ctx, task) => {
            const origTitle = task.title;
            task.title = RUNNING + origTitle;

            task.output = `Invoking serverless next.js build for ${config.app.name}/${version}`;

            // Run the serverless next.js build
            await asyncExec('serverless');

            if (config.app.serverlessNextRouterPath !== undefined) {
              task.output = 'Copying Serverless Next.js router to build output directory';
              await fs.copyFile(
                config.app.serverlessNextRouterPath,
                './.serverless_nextjs/index.js',
              );
            }

            task.title = origTitle;
          },
        },
        {
          title: 'Publish to ECR',
          task: async (ctx: IContext, task: TaskWrapper<IContext, typeof DefaultRenderer>) => {
            const origTitle = task.title;
            task.title = RUNNING + origTitle;

            // Docker, build, tag, push to ECR
            // Note: Need to already have AWS env vars set
            await this.publishToECR(config, task);

            task.title = origTitle;
          },
        },
        {
          title: 'Deploy to Lambda',
          task: async (ctx, task) => {
            const origTitle = task.title;
            task.title = RUNNING + origTitle;

            // Update the Lambda function
            await this.deployToLambda(config, this.VersionAndAlias, task);

            task.title = origTitle;
          },
        },
        {
          title: 'Confirm Static Assets Folder Exists',
          task: async (ctx, task) => {
            const origTitle = task.title;
            task.title = RUNNING + origTitle;

            // Check that Static Assets Folder exists
            if (!(await pathExists(config.app.staticAssetsPath))) {
              this.error(`Static asset path does not exist: ${config.app.staticAssetsPath}`);
            }

            task.title = origTitle;
          },
        },
        {
          title: 'Copy Static Files to Local Upload Dir',
          task: async (ctx, task) => {
            const origTitle = task.title;
            task.title = RUNNING + origTitle;

            // Copy files to local dir to be uploaded
            await S3Uploader.CopyToUploadDir(config, ctx.preflightResult.response.s3UploadUrl);

            task.title = origTitle;
          },
        },
        // {
        //   title: 'Upload Files to S3 Staging AppName/Version Prefix',
        //   task: async (ctx, task) => {
        //     const origTitle = task.title;
        //     task.title = RUNNING + origTitle;

        //     const { destinationPrefix, bucketName } = S3Uploader.ParseUploadPath(
        //       ctx.preflightResult.response.s3UploadUrl,
        //     );

        //     // Upload Files to S3 Staging AppName/Version Prefix
        //     await S3TransferUtility.UploadDir(
        //       S3Uploader.TempDir,
        //       destinationPrefix,
        //       bucketName,
        //       ctx.preflightResult.response,
        //     );

        //     task.title = origTitle;
        //   },
        // },
        {
          title: 'Enumerate Files to Upload to S3',
          task: async (ctx, task) => {
            const origTitle = task.title;
            task.title = RUNNING + origTitle;

            ctx.files = (await S3TransferUtility.GetFiles(S3Uploader.TempDir)) as string[];

            task.title = origTitle;
          },
        },
        {
          title: 'Upload Static Files to S3',
          task: (ctx, task) => {
            const origTitle = task.title;
            task.title = RUNNING + origTitle;

            const { bucketName } = S3Uploader.ParseUploadPath(
              ctx.preflightResult.response.s3UploadUrl,
            );

            // Use temp credentials for S3
            const s3Client = new s3.S3Client({
              maxAttempts: 16,
              credentials: {
                accessKeyId: ctx.preflightResult.response.awsCredentials.accessKeyId,
                secretAccessKey: ctx.preflightResult.response.awsCredentials.secretAccessKey,
                sessionToken: ctx.preflightResult.response.awsCredentials.sessionToken,
              },
            });

            const tasks: ListrTask<IContext>[] = ctx.files.map((filePath) => ({
              task: async (ctx: IContext, subtask) => {
                const origTitle = subtask.title;
                subtask.title = RUNNING + origTitle;

                const upload = new Upload({
                  client: s3Client,
                  leavePartsOnError: false,
                  params: {
                    Bucket: bucketName,
                    Key: path.relative(S3Uploader.TempDir, filePath),
                    Body: createReadStream(filePath),
                    ContentType: contentType(path.basename(filePath)) || 'application/octet-stream',
                    CacheControl: 'max-age=86400; public',
                  },
                });
                await upload.done();

                subtask.title = origTitle;
              },
            }));

            task.title = origTitle;

            return task.newListr(tasks, {
              concurrent: 8,
              rendererOptions: {
                clearOutput: false,
                showErrorMessage: true,
                showTimer: true,
              },
            });
          },
        },
        {
          title: `Creating MicroApp Application: ${config.app.name}`,
          task: async (ctx, task) => {
            const origTitle = task.title;
            task.title = RUNNING + origTitle;

            // Call Deployer to Create App if Not Exists
            await DeployClient.CreateApp(config);

            task.title = origTitle;
          },
        },
        {
          title: `Creating MicroApp Version: ${config.app.semVer}`,
          task: async (ctx, task) => {
            const origTitle = task.title;
            task.title = RUNNING + origTitle;

            // Call Deployer to Deploy AppName/Version
            await DeployClient.DeployVersion(config, task);

            task.title = origTitle;
          },
        },
      ],
      {
        rendererOptions: {
          showTimer: true,
        },
      },
    );

    try {
      await tasks.run();
      // this.log(`Published: ${config.app.name}/${config.app.semVer}`);
    } catch (error) {
      this.log(`Caught exception: ${error.message}`);
    } finally {
      await S3Uploader.removeTempDirIfExists();
      await this.restoreFiles();
    }
  }

  /**
   * Restore files that the version was patched into
   */
  private async restoreFiles(): Promise<void> {
    // Put the old files back when succeeded or failed
    for (const fileToModify of this.FILES_TO_MODIFY) {
      try {
        const stats = await fs.stat(`${fileToModify.path}.original`);
        if (stats.isFile()) {
          // Remove the possibly modified file
          await fs.unlink(fileToModify.path);

          // Move the original file back
          await fs.rename(`${fileToModify.path}.original`, fileToModify.path);
        }
      } catch {
        // don't care... if the file doesn't exist we can't do anything
      }
    }
  }

  /**
   * Setup version and alias strings
   * @param version
   * @returns
   */
  private createVersions(version: string): IVersions {
    return { version, alias: `v${version.replace(/\./g, '_')}` };
  }

  /**
   * Write new versions into specified config files
   * @param path
   * @param requiredVersions
   * @param leaveFiles
   * @returns
   */
  private async writeNewVersions(
    path: string,
    requiredVersions: IVersions,
    leaveFiles: boolean,
  ): Promise<boolean> {
    const stats = await fs.stat(path);
    if (!stats.isFile) {
      return false;
    }

    // Make a backup of the file
    await fs.copyFile(path, `${path}.original`);

    // File exists, check that it has the required version strings
    let fileText = await fs.readFile(path, 'utf8');

    for (const key of Object.keys(requiredVersions)) {
      const placeHolder = key === 'version' ? '0.0.0' : 'v0_0_0';
      if (fileText.indexOf(placeHolder) === -1) {
        // The required placeholder is missing
        return false;
      } else {
        const regExp = new RegExp(PublishTool.escapeRegExp(placeHolder), 'g');
        fileText = fileText.replace(
          regExp,
          key === 'version' ? requiredVersions.version : (requiredVersions.alias as string),
        );
      }
    }

    // Write the updated file contents
    await fs.writeFile(path, fileText, 'utf8');

    // Leave a copy of the modified file if requested
    if (leaveFiles) {
      // This copy will overwrite an existing file
      await fs.copyFile(path, `${path}.modified`);
    }

    return true;
  }

  /**
   * Login to ECR for Lambda Docker functions
   * @param config
   * @returns
   */
  private async loginToECR(config: IConfig): Promise<boolean> {
    this.IMAGE_TAG = `${config.app.ecrRepoName}:${this.VersionAndAlias.version}`;
    this.IMAGE_URI = `${config.app.ecrHost}/${this.IMAGE_TAG}`;

    try {
      await asyncExec(
        `aws ecr get-login-password --region ${config.app.awsRegion} | docker login --username AWS --password-stdin ${config.app.ecrHost}`,
      );
    } catch (error) {
      throw new Error(`ECR Login Failed: ${error.message}`);
    }

    return true;
  }

  /**
   * Publish to ECR for Lambda Docker function
   * @param config
   */
  private async publishToECR(
    config: IConfig,
    task: TaskWrapper<IContext, typeof DefaultRenderer>,
  ): Promise<void> {
    task.output = 'Starting Docker build';
    await asyncExec(`docker build -f Dockerfile -t ${this.IMAGE_TAG}  .`);
    await asyncExec(`docker tag ${this.IMAGE_TAG} ${config.app.ecrHost}/${this.IMAGE_TAG}`);
    task.output = 'Starting Docker push to ECR';
    await asyncExec(`docker push ${config.app.ecrHost}/${this.IMAGE_TAG}`);
  }

  /**
   * Publish an app version to Lambda
   * @param config
   * @param versions
   */
  private async deployToLambda(
    config: IConfig,
    versions: IVersions,
    task: TaskWrapper<IContext, typeof DefaultRenderer>,
  ): Promise<void> {
    // Create Lambda version
    task.output = 'Updating Lambda code to point to new Docker image';
    const resultUpdate = await lambdaClient.send(
      new lambda.UpdateFunctionCodeCommand({
        FunctionName: config.app.lambdaName,
        ImageUri: this.IMAGE_URI,
        Publish: true,
      }),
    );
    const lambdaVersion = resultUpdate.Version;
    task.output = `Lambda version created: ${resultUpdate.Version}`;

    let lastUpdateStatus = resultUpdate.LastUpdateStatus;
    for (let i = 0; i < 5; i++) {
      // When the function is created the status will be "Pending"
      // and we have to wait until it's done creating
      // before we can point an alias to it
      if (lastUpdateStatus === 'Successful') {
        task.output = `Lambda function updated, version: ${lambdaVersion}`;
        break;
      }

      // If it didn't work, wait and try again
      await asyncSetTimeout(1000 * i);

      const resultGet = await lambdaClient.send(
        new lambda.GetFunctionCommand({
          FunctionName: config.app.lambdaName,
          Qualifier: lambdaVersion,
        }),
      );

      // Save the last update status so we can check on re-loop
      lastUpdateStatus = resultGet?.Configuration?.LastUpdateStatus;
    }

    // Create Lambda alias point
    task.output = `Creating the lambda alias for the new version: ${lambdaVersion}`;
    const resultLambdaAlias = await lambdaClient.send(
      new lambda.CreateAliasCommand({
        FunctionName: config.app.lambdaName,
        Name: versions.alias,
        FunctionVersion: lambdaVersion,
      }),
    );
    task.output = `Lambda alias created, name: ${resultLambdaAlias.Name}`;
  }
}

// @ts-expect-error catch is actually defined
PublishTool.run().catch(errorHandler);

export default PublishTool;
