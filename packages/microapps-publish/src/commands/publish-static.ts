import 'reflect-metadata';
import * as s3 from '@aws-sdk/client-s3';
import * as sts from '@aws-sdk/client-sts';
import { Upload } from '@aws-sdk/lib-storage';
import { Command, flags as flagsParser } from '@oclif/command';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pMap = require('p-map');
import * as path from 'path';
import { pathExists, createReadStream } from 'fs-extra';
import { Listr, ListrTask } from 'listr2';
import { contentType } from 'mime-types';
import { Config } from '../config/Config';
import DeployClient, {
  DeployVersionArgs,
  IDeployVersionPreflightResult,
} from '../lib/DeployClient';
import { S3Uploader } from '../lib/S3Uploader';
import { S3TransferUtility } from '../lib/S3TransferUtility';

interface IContext {
  preflightResult: IDeployVersionPreflightResult;
  files: string[];
}

export class PublishCommand extends Command {
  static description = 'Publish arbitrary framework static app - deploy static assets to S3 only.';

  static examples = [
    `$ microapps-publish publish-static -d microapps-deployer-dev -l microapps-app-release-dev -a release -n 0.0.21
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
    // Deprecated
    deployerLambdaName: flagsParser.string({
      multiple: false,
      required: false,
      hidden: true,
    }),
    'deployer-lambda-name': flagsParser.string({
      char: 'd',
      multiple: false,
      exactlyOne: ['deployer-lambda-name', 'deployerLambdaName'],
      description: 'Name of the deployer lambda function',
    }),
    // Deprecated
    newVersion: flagsParser.string({
      multiple: false,
      required: false,
      hidden: true,
    }),
    'new-version': flagsParser.string({
      char: 'n',
      multiple: false,
      exactlyOne: ['new-version', 'newVersion'],
      description: 'New semantic version to apply',
    }),
    // Deprecated
    appName: flagsParser.string({
      multiple: false,
      required: false,
      hidden: true,
    }),
    'app-name': flagsParser.string({
      char: 'a',
      multiple: false,
      exactlyOne: ['app-name', 'appName'],
      description: 'MicroApps app name (this becomes the path the app is rooted at)',
    }),
    // Deprecated
    staticAssetsPath: flagsParser.string({
      multiple: false,
      required: false,
      hidden: true,
    }),
    'static-assets-path': flagsParser.string({
      char: 's',
      multiple: false,
      required: false,
      exactlyOne: ['static-assets-path', 'staticAssetsPath'],
      description:
        'Path to files to be uploaded to S3 static bucket at app/version/ path.  Do include app/version/ in path if files are already "rooted" under that path locally.',
    }),
    // Deprecated
    defaultFile: flagsParser.string({
      multiple: false,
      required: false,
      hidden: true,
      exclusive: ['default-file'],
    }),
    'default-file': flagsParser.string({
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
    // Deprecated
    noCache: flagsParser.boolean({
      required: false,
      default: false,
      hidden: true,
    }),
    'no-cache': flagsParser.boolean({
      required: false,
      default: false,
      description: 'Force revalidation of CloudFront and browser caching of static assets',
    }),
  };

  async run(): Promise<void> {
    const config = Config.instance;

    // const RUNNING_TEXT = ' RUNS ';
    // const RUNNING = chalk.reset.inverse.yellow.bold(RUNNING_TEXT) + ' ';
    const RUNNING = ''; //chalk.reset.inverse.yellow.bold(RUNNING_TEXT) + ' ';

    const { flags: parsedFlags } = this.parse(PublishCommand);
    const appName = parsedFlags.appName ?? parsedFlags['app-name'] ?? config.app.name;
    const deployerLambdaName =
      parsedFlags.deployerLambdaName ??
      parsedFlags['deployer-lambda-name'] ??
      config.deployer.lambdaName;
    const semVer = parsedFlags.newVersion ?? parsedFlags['new-version'] ?? config.app.semVer;
    const staticAssetsPath =
      parsedFlags.staticAssetsPath ??
      parsedFlags['static-assets-path'] ??
      config.app.staticAssetsPath;
    const defaultFile =
      parsedFlags.defaultFile ?? parsedFlags['default-file'] ?? config.app.defaultFile;
    const overwrite = parsedFlags.overwrite;
    const noCache = parsedFlags.noCache;

    // Override the config value
    config.deployer.lambdaName = deployerLambdaName;
    delete config.app.lambdaName;
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

    if (config.app.staticAssetsPath === undefined) {
      this.error('staticAssetsPath must be specified');
    }
    if (config.app.defaultFile === undefined || config.app.defaultFile === '') {
      this.error('defaultFile must be specified');
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
          task: (ctx, task) => {
            const origTitle = task.title;
            task.title = RUNNING + origTitle;

            ctx.files = S3TransferUtility.GetFiles(S3Uploader.TempDir);

            task.title = origTitle;
          },
        },
        {
          // TODO: Disable this task if no static assets path
          title: 'Upload Static Files to S3',
          task: async (ctx, task) => {
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
            // Listr causes OOM if passes a list of, say, 5,000 to 20,000 files
            if (ctx.files.length > 200) {
              const fileCountMsgInterval = Math.floor(ctx.files.length / 10);
              let filesPublished = 0;

              await pMap(
                ctx.files,
                async (filePath: string) => {
                  // Can't use tasks for each file
                  const relFilePath = path.relative(pathWithoutAppAndVer, filePath);

                  if (
                    ctx.files.length > 1000 &&
                    (filesPublished % fileCountMsgInterval === 0 ||
                      filesPublished === ctx.files.length)
                  ) {
                    task.output = `Uploaded ${filesPublished} of ${ctx.files.length} files`;
                  } else if (ctx.files.length <= 1000) {
                    task.output = `Uploading ${relFilePath}`;
                  }

                  const upload = new Upload({
                    client: s3Client,
                    leavePartsOnError: false,
                    params: {
                      Bucket: bucketName,
                      Key: path.relative(S3Uploader.TempDir, filePath),
                      Body: createReadStream(filePath),
                      ContentType:
                        contentType(path.basename(filePath)) || 'application/octet-stream',
                      CacheControl,
                    },
                  });
                  await upload.done();
                  filesPublished++;
                },
                { concurrency: 40 },
              );
            } else {
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
                      ContentType:
                        contentType(path.basename(filePath)) || 'application/octet-stream',
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
            }
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

            const request: DeployVersionArgs = {
              appName: config.app.name,
              semVer: config.app.semVer,
              deployerLambdaName: config.deployer.lambdaName,
              defaultFile: config.app.defaultFile,
              appType: 'static',
              overwrite,
              output: (message: string) => (task.output = message),
            };

            // Use DeployVersionLite if createAlias is supported
            if (ctx.preflightResult.response.capabilities?.['createAlias'] === 'true') {
              task.output = 'Using DeployVersionLite';
              await DeployClient.DeployVersionLite(request);
            } else {
              // Use legacy DeployVersion if createAlias is not supported
              task.output = 'Using DeployVersion';
              await DeployClient.DeployVersion(request);
            }

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
