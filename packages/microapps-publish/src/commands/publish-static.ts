import 'reflect-metadata';
import * as s3 from '@aws-sdk/client-s3';
import * as sts from '@aws-sdk/client-sts';
import { Command, flags as flagsParser } from '@oclif/command';
import * as path from 'path';
import { pathExists, createReadStream } from 'fs-extra';
import { Listr, ListrTask } from 'listr2';
import { Config } from '../config/Config';
import DeployClient, { IDeployVersionPreflightResult } from '../lib/DeployClient';
import S3Uploader from '../lib/S3Uploader';
import S3TransferUtility from '../lib/S3TransferUtility';
import { Upload } from '@aws-sdk/lib-storage';
import { contentType } from 'mime-types';
import { createVersions, IVersions } from '../lib/Versions';

interface IContext {
  preflightResult: IDeployVersionPreflightResult;
  files: string[];
}

export class PublishCommand extends Command {
  static description = 'Publish arbitrary framework static app - deploy static assets to S3 only.';

  static examples = [
    `$ microapps-publish publish-static -d microapps-deployer-dev -n 0.0.21 -l microapps-app-release-dev -a release
✔ Get S3 Temp Credentials [1s]
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
      description: 'Allow overwrite - Warn but do not fail if version exists',
    }),
  };

  private VersionAndAlias: IVersions;

  async run(): Promise<void> {
    const config = Config.instance;

    // const RUNNING_TEXT = ' RUNS ';
    // const RUNNING = chalk.reset.inverse.yellow.bold(RUNNING_TEXT) + ' ';
    const RUNNING = ''; //chalk.reset.inverse.yellow.bold(RUNNING_TEXT) + ' ';

    const { flags: parsedFlags } = this.parse(PublishCommand);
    const appName = parsedFlags.appName ?? config.app.name;
    const deployerLambdaName = parsedFlags.deployerLambdaName ?? config.deployer.lambdaName;
    const semVer = parsedFlags.newVersion ?? config.app.semVer;
    const staticAssetsPath = parsedFlags.staticAssetsPath ?? config.app.staticAssetsPath;
    const defaultFile = parsedFlags.defaultFile ?? config.app.defaultFile;
    const overwrite = parsedFlags.overwrite;

    // Override the config value
    config.deployer.lambdaName = deployerLambdaName;
    delete config.app.lambdaName;
    config.app.name = appName;
    config.app.semVer = semVer;
    config.app.staticAssetsPath = staticAssetsPath;
    config.app.defaultFile = defaultFile;

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

    this.VersionAndAlias = createVersions(semVer);

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
            await DeployClient.DeployVersion(
              config,
              'static',
              (message: string) => (task.output = message),
            );

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
}
