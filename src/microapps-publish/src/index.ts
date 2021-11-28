#!/usr/bin/env node
/* eslint-disable no-console */

import 'source-map-support/register';
// Used by ts-convict
import 'reflect-metadata';
import { exec } from 'child_process';
import * as util from 'util';
import * as lambda from '@aws-sdk/client-lambda';
import * as sts from '@aws-sdk/client-sts';
import { Command, flags as flagsParser } from '@oclif/command';
import { IConfig as OCLIFIConfig } from '@oclif/config';
import { handle as errorHandler } from '@oclif/errors';
import chalk from 'chalk';
import { promises as fs, pathExists } from 'fs-extra';
import { Listr, ListrErrorTypes, ListrTask, ListrTaskObject } from 'listr2';
import { Config, IConfig } from './config/Config';
import DeployClient, { IDeployVersionPreflightResult } from './DeployClient';
import S3Uploader from './S3Uploader';
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

interface IContext {
  preflightResult: IDeployVersionPreflightResult;
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
    process.on(
      'SIGINT',
      void (async () => {
        if (this._restoreFilesStarted) {
          return;
        } else {
          this._restoreFilesStarted = true;
        }
        console.log('Caught Ctrl-C, restoring files');
        await S3Uploader.removeTempDirIfExists();
        await this.restoreFiles();
      })(),
    );

    if (config === undefined) {
      this.error('Failed to load the config file');
    }
    if (config.app.staticAssetsPath === undefined) {
      this.error('StaticAssetsPath must be specified in the config file');
    }

    //
    // TODO: Setup Tasks
    //

    const tasks = new Listr<IContext>([
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
          ctx.preflightResult = await DeployClient.DeployVersionPreflight(config);
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
            await fs.copyFile(config.app.serverlessNextRouterPath, './.serverless_nextjs/index.js');
          }

          task.title = origTitle;
        },
      },
      {
        title: 'Publish to ECR',
        task: async (ctx, task) => {
          const origTitle = task.title;
          task.title = RUNNING + origTitle;

          // Docker, build, tag, push to ECR
          // Note: Need to already have AWS env vars set
          await this.publishToECR(config);

          task.title = origTitle;
        },
      },
      {
        title: 'Deploy to Lambda',
        task: async (ctx, task) => {
          const origTitle = task.title;
          task.title = RUNNING + origTitle;

          // Update the Lambda function
          await this.deployToLambda(config, this.VersionAndAlias);

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
        title: 'Upload Files to S3 Staging AppName/Version Prefix',
        task: async (ctx, task) => {
          const origTitle = task.title;
          task.title = RUNNING + origTitle;

          // Upload Files to S3 Staging AppName/Version Prefix
          await S3Uploader.Upload(
            config,
            ctx.preflightResult.response.s3UploadUrl,
            ctx.preflightResult.response,
          );

          task.title = origTitle;
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
          await DeployClient.DeployVersion(config);

          task.title = origTitle;
        },
      },
    ]);

    try {
      await tasks.run();
      console.log(`Published: ${config.app.name}/${config.app.semVer}`);
    } catch (error) {
      console.log(`Caught exception: ${error.message}`);
    } finally {
      await this.restoreFiles();
    }
  }

  public async restoreFiles(): Promise<void> {
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

  private createVersions(version: string): IVersions {
    return { version, alias: `v${version.replace(/\./g, '_')}` };
  }

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

  private async publishToECR(config: IConfig): Promise<void> {
    console.log('Starting Docker build');
    await asyncExec(`docker build -f Dockerfile -t ${this.IMAGE_TAG}  .`);
    await asyncExec(`docker tag ${this.IMAGE_TAG} ${config.app.ecrHost}/${this.IMAGE_TAG}`);
    console.log('Starting Docker push to ECR');
    await asyncExec(`docker push ${config.app.ecrHost}/${this.IMAGE_TAG}`);
  }

  private async deployToLambda(config: IConfig, versions: IVersions): Promise<void> {
    // Create Lambda version
    console.log('Updating Lambda code to point to new Docker image');
    const resultUpdate = await lambdaClient.send(
      new lambda.UpdateFunctionCodeCommand({
        FunctionName: config.app.lambdaName,
        ImageUri: this.IMAGE_URI,
        Publish: true,
      }),
    );
    const lambdaVersion = resultUpdate.Version;
    console.log('Lambda version created: ', resultUpdate.Version);

    let lastUpdateStatus = resultUpdate.LastUpdateStatus;
    for (let i = 0; i < 5; i++) {
      // When the function is created the status will be "Pending"
      // and we have to wait until it's done creating
      // before we can point an alias to it
      if (lastUpdateStatus === 'Successful') {
        console.log(`Lambda function updated, version: ${lambdaVersion}`);
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
    console.log(`Creating the lambda alias for the new version: ${lambdaVersion}`);
    const resultLambdaAlias = await lambdaClient.send(
      new lambda.CreateAliasCommand({
        FunctionName: config.app.lambdaName,
        Name: versions.alias,
        FunctionVersion: lambdaVersion,
      }),
    );
    console.log(`Lambda alias created, name: ${resultLambdaAlias.Name}`);
  }
}

// @ts-expect-error catch is actually defined
PublishTool.run().catch(errorHandler);

export default PublishTool;
