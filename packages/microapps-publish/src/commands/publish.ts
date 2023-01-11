import 'reflect-metadata';
import * as util from 'util';
import * as lambda from '@aws-sdk/client-lambda';
import * as s3 from '@aws-sdk/client-s3';
import * as sts from '@aws-sdk/client-sts';
import { Command, flags as flagsParser } from '@oclif/command';
import * as path from 'path';
import { pathExists, createReadStream } from 'fs-extra';
import { Listr, ListrTask } from 'listr2';
import { Config, IConfig } from '../config/Config';
import DeployClient, { IDeployVersionPreflightResult } from '../lib/DeployClient';
import S3Uploader from '../lib/S3Uploader';
import S3TransferUtility from '../lib/S3TransferUtility';
import { Upload } from '@aws-sdk/lib-storage';
import { contentType } from 'mime-types';
import { TaskWrapper } from 'listr2/dist/lib/task-wrapper';
import { DefaultRenderer } from 'listr2/dist/renderer/default.renderer';
import { createVersions, IVersions } from '../lib/Versions';
const asyncSetTimeout = util.promisify(setTimeout);

const lambdaClient = new lambda.LambdaClient({
  maxAttempts: 8,
});

interface IContext {
  preflightResult: IDeployVersionPreflightResult;
  files: string[];
}

export class PublishCommand extends Command {
  static description =
    'Publish arbitrary framework app - deploy static assets to S3, alias the $LATEST Lambda function, and add integration/route to API Gateway.';

  static examples = [
    `$ microapps-publish publish -d microapps-deployer-dev -l microapps-app-release-dev -a release -n 0.0.21
✔ Get S3 Temp Credentials [1s]
✔ Deploy to Lambda [0.6s]
✔ Confirm Static Assets Folder Exists [0.0s]
✔ Copy Static Files to Local Upload Dir [0.0s]
✔ Enumerate Files to Upload to S3 [0.0s]
✔ Upload Static Files to S3 [1s]
✔ Creating MicroApp Application: release [0.0s]
✔ Creating MicroApp Version: 0.0.21 [1s]
`,
  ];

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
    appLambdaName: flagsParser.string({
      char: 'l',
      multiple: false,
      required: false,
      description: 'Name of the application lambda function',
    }),
    appName: flagsParser.string({
      char: 'a',
      multiple: false,
      required: false,
      description: 'MicroApps app name',
    }),
    staticAssetsPath: flagsParser.string({
      char: 's',
      multiple: false,
      required: false,
      description:
        'Path to files to be uploaded to S3 static bucket at app/version/ path.  Do include app/version/ in path if files are already "rooted" under that path locally.',
    }),
    defaultFile: flagsParser.string({
      char: 'i',
      multiple: false,
      required: false,
      description:
        'Default file to return when the app is loaded via the router without a version (e.g. when app/ is requested).',
    }),
    overwrite: flagsParser.boolean({
      char: 'o',
      required: false,
      default: false,
      description:
        'Allow overwrite - Warn but do not fail if version exists. Discouraged outside of test envs if cacheable static files have changed.',
    }),
    noCache: flagsParser.boolean({
      required: false,
      default: false,
      description: 'Force revalidation of CloudFront and browser caching of static assets',
    }),
    'startup-type': flagsParser.enum({
      multiple: false,
      required: false,
      options: ['iframe', 'direct'],
      default: 'iframe',
      description: 'How the app should be loaded',
    }),
    type: flagsParser.enum({
      char: 't',
      multiple: false,
      required: false,
      options: ['apigwy', 'lambda-url'],
      default: 'apigwy',
      description: 'Type of the application and how its requests are routed',
    }),
  };

  private VersionAndAlias: IVersions;

  async run(): Promise<void> {
    const config = Config.instance;

    // const RUNNING_TEXT = ' RUNS ';
    // const RUNNING = chalk.reset.inverse.yellow.bold(RUNNING_TEXT) + ' ';
    const RUNNING = ''; //chalk.reset.inverse.yellow.bold(RUNNING_TEXT) + ' ';

    const { flags: parsedFlags } = this.parse(PublishCommand);
    const appLambdaName = parsedFlags.appLambdaName ?? config.app.lambdaName;
    const appName = parsedFlags.appName ?? config.app.name;
    const deployerLambdaName = parsedFlags.deployerLambdaName ?? config.deployer.lambdaName;
    const semVer = parsedFlags.newVersion ?? config.app.semVer;
    const staticAssetsPath = parsedFlags.staticAssetsPath ?? config.app.staticAssetsPath;
    const defaultFile = parsedFlags.defaultFile ?? config.app.defaultFile;
    const overwrite = parsedFlags.overwrite;
    const noCache = parsedFlags.noCache;

    // Override the config value
    config.deployer.lambdaName = deployerLambdaName;
    config.app.lambdaName = appLambdaName;
    config.app.name = appName;
    config.app.semVer = semVer;
    config.app.staticAssetsPath = staticAssetsPath;
    config.app.defaultFile = defaultFile;

    // Get the account ID and region from STS
    // TODO: Move this to the right place
    if (config.app.awsAccountID === '' || config.app.awsRegion === '') {
      const stsClient = new sts.STSClient({
        maxAttempts: 8,
      });
      const stsResponse = await stsClient.send(new sts.GetCallerIdentityCommand({}));
      if (config.app.awsAccountID === '') {
        config.app.awsAccountID = stsResponse.Account;
      }
      if (config.app.awsRegion === '') {
        config.app.awsRegion = stsClient.config.region as string;
      }
    }

    this.VersionAndAlias = createVersions(semVer);

    if (config.app.staticAssetsPath === undefined) {
      this.error('staticAssetsPath must be specified');
    }

    //
    // Setup Tasks
    //

    const tasks = new Listr<IContext>(
      [
        {
          // TODO: Disable this task if no static assets path
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
          // TODO: Disable this task if no static assets path
          title: 'Get S3 Temp Credentials',
          task: async (ctx, task) => {
            const origTitle = task.title;
            task.title = RUNNING + origTitle;

            // Confirm the Version Does Not Exist in Published State
            task.output = `Checking if deployed app/version already exists for ${config.app.name}/${semVer}`;
            ctx.preflightResult = await DeployClient.DeployVersionPreflight({
              config,
              overwrite,
              output: (message: string) => (task.output = message),
            });
            if (ctx.preflightResult.exists) {
              if (!overwrite) {
                throw new Error(
                  `App/Version already exists: ${config.app.name}/${config.app.semVer}`,
                );
              } else {
                task.title = `Warning: App/Version already exists: ${config.app.name}/${config.app.semVer}`;
              }
            } else {
              task.title = `App/Version does not exist: ${config.app.name}/${config.app.semVer}`;
            }
          },
        },
        {
          // TODO: Disable this task if no Lambda function
          title: 'Deploy to Lambda',
          task: async (ctx, task) => {
            // Allow overwriting a non-overwritable app if the prior
            // publish was not completely successful - in that case
            // the lambda alias may exist and need updating
            const allowOverwrite = overwrite || !ctx.preflightResult.exists;
            const origTitle = task.title;
            task.title = RUNNING + origTitle;

            // Update the Lambda function
            await this.deployToLambda({
              config,
              versions: this.VersionAndAlias,
              overwrite: allowOverwrite,
              task,
            });

            task.title = origTitle;
          },
        },
        {
          // TODO: Disable this task if no static assets path
          title: 'Copy Static Files to Local Upload Dir',
          task: async (ctx, task) => {
            const origTitle = task.title;
            task.title = RUNNING + origTitle;

            // Copy files to local dir to be uploaded
            await S3Uploader.CopyToUploadDir(config, ctx.preflightResult.response.s3UploadUrl);

            task.title = origTitle;
          },
        },
        {
          // TODO: Disable this task if no static assets path
          title: 'Enumerate Files to Upload to S3',
          task: async (ctx, task) => {
            const origTitle = task.title;
            task.title = RUNNING + origTitle;

            ctx.files = (await S3TransferUtility.GetFiles(S3Uploader.TempDir)) as string[];

            task.title = origTitle;
          },
        },
        {
          // TODO: Disable this task if no static assets path
          title: 'Upload Static Files to S3',
          task: (ctx, task) => {
            const origTitle = task.title;
            task.title = RUNNING + origTitle;

            const { bucketName, destinationPrefix } = S3Uploader.ParseUploadPath(
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

            // Setup caching on static assets
            // NoCache - Only used for test deploys, requires browser and CloudFront to refetch every time
            // Overwrite - Reduces default cache time period from 24 hours to 15 minutes
            // Default - 24 hours
            const CacheControl = noCache
              ? 'max-age=0, must-revalidate, public'
              : overwrite
              ? `max-age=${15 * 60}, public`
              : `max-age=${24 * 60 * 60}, public`;

            const pathWithoutAppAndVer = path.join(S3Uploader.TempDir, destinationPrefix);

            const tasks: ListrTask<IContext>[] = ctx.files.map((filePath) => ({
              task: async (ctx: IContext, subtask) => {
                const relFilePath = path.relative(pathWithoutAppAndVer, filePath);

                const origTitle = relFilePath;
                subtask.title = RUNNING + origTitle;

                const upload = new Upload({
                  client: s3Client,
                  leavePartsOnError: false,
                  params: {
                    Bucket: bucketName,
                    Key: path.relative(S3Uploader.TempDir, filePath),
                    Body: createReadStream(filePath),
                    ContentType: contentType(path.basename(filePath)) || 'application/octet-stream',
                    CacheControl,
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
            await DeployClient.CreateApp({ config });

            task.title = origTitle;
          },
        },
        {
          title: `Creating MicroApp Version: ${config.app.semVer}`,
          task: async (ctx, task) => {
            const origTitle = task.title;
            task.title = RUNNING + origTitle;

            const appType =
              parsedFlags.type === 'apigwy'
                ? 'lambda'
                : parsedFlags.type === 'lambda-url'
                ? 'lambda-url'
                : 'url';

            // Call Deployer to Deploy AppName/Version
            await DeployClient.DeployVersion({
              config,
              appType,
              startupType: parsedFlags['startup-type'] as 'iframe' | 'direct',
              overwrite,
              output: (message: string) => (task.output = message),
            });

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
    } finally {
      await S3Uploader.removeTempDirIfExists();
    }
  }

  /**
   * Publish an app version to Lambda
   * @param config
   * @param versions
   */
  private async deployToLambda(opts: {
    config: IConfig;
    versions: IVersions;
    overwrite: boolean;
    task: TaskWrapper<IContext, typeof DefaultRenderer>;
  }): Promise<void> {
    const { config, overwrite, versions, task } = opts;

    // Create Lambda version
    task.output = 'Creating version for Lambda $LATEST';
    const resultUpdate = await lambdaClient.send(
      new lambda.PublishVersionCommand({
        FunctionName: config.app.lambdaName,
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
    try {
      const resultLambdaAlias = await lambdaClient.send(
        new lambda.CreateAliasCommand({
          FunctionName: config.app.lambdaName,
          Name: versions.alias,
          FunctionVersion: lambdaVersion,
        }),
      );
      task.output = `Lambda alias created, name: ${resultLambdaAlias.Name}`;
    } catch (error) {
      if (overwrite && error.name === 'ResourceConflictException') {
        task.output = `Alias exists, updating the lambda alias for version: ${lambdaVersion}`;

        const resultLambdaAlias = await lambdaClient.send(
          new lambda.UpdateAliasCommand({
            FunctionName: config.app.lambdaName,
            Name: versions.alias,
            FunctionVersion: lambdaVersion,
          }),
        );
        task.output = `Lambda alias updated, name: ${resultLambdaAlias.Name}`;
      } else {
        throw error;
      }
    }
  }
}
