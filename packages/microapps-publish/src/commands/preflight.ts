import 'reflect-metadata';
import * as sts from '@aws-sdk/client-sts';
import { Command, flags as flagsParser } from '@oclif/command';
import { Listr } from 'listr2';
import { Config } from '../config/Config';
import DeployClient from '../lib/DeployClient';

export class PreflightCommand extends Command {
  static description = 'Check if app/version are available';

  static examples = [
    `$ microapps-publish preflight -d microapps-deployer-dev -a release -n 0.0.13
✔ Preflight Version Check [0.2s]
`,
  ];

  static flags = {
    version: flagsParser.version({
      char: 'v',
    }),
    help: flagsParser.help(),
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
    overwrite: flagsParser.boolean({
      char: 'o',
      required: false,
      default: false,
      description:
        'Allow overwrite - Warn but do not fail if version exists. Discouraged outside of test envs if cacheable static files have changed.',
    }),
  };

  async run(): Promise<void> {
    const config = Config.instance;

    // const RUNNING_TEXT = ' RUNS ';
    // const RUNNING = chalk.reset.inverse.yellow.bold(RUNNING_TEXT) + ' ';
    const RUNNING = ''; //chalk.reset.inverse.yellow.bold(RUNNING_TEXT) + ' ';

    const { flags: parsedFlags } = this.parse(PreflightCommand);
    const appName = parsedFlags.appName ?? parsedFlags['app-name'] ?? config.app.name;
    const deployerLambdaName =
      parsedFlags.deployerLambdaName ??
      parsedFlags['deployer-lambda-name'] ??
      config.deployer.lambdaName;
    const semVer = parsedFlags.newVersion ?? parsedFlags['new-version'] ?? config.app.semVer;
    const overwrite = parsedFlags.overwrite;

    // Override the config value
    config.deployer.lambdaName = deployerLambdaName;
    config.app.name = appName;
    config.app.semVer = semVer;

    // TODO: Pick and validate the appname/semver from the config and flags

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

    //
    // Setup Tasks
    //

    const tasks = new Listr(
      [
        {
          title: 'Preflight Version Check',
          task: async (ctx, task) => {
            const origTitle = task.title;
            task.title = RUNNING + origTitle;

            // Confirm the Version Does Not Exist in Published State
            task.output = `Checking if deployed app/version already exists for ${config.app.name}/${semVer}`;
            const preflightResult = await DeployClient.DeployVersionPreflight({
              config,
              needS3Creds: false,
              overwrite,
              output: (message: string) => (task.output = message),
            });
            if (preflightResult.exists) {
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
      ],
      {
        rendererOptions: {
          showTimer: true,
        },
      },
    );

    await tasks.run();
  }
}
