import 'reflect-metadata';
import * as sts from '@aws-sdk/client-sts';
import { Command, flags as flagsParser } from '@oclif/command';
import { Listr } from 'listr2';
import { Config } from '../config/Config';
import DeployClient from '../lib/DeployClient';

export class DeleteCommand extends Command {
  static description = 'Delete app/version';

  static examples = [
    `$ pwrdrvr delete -d microapps-deployer-dev -a release -n 0.0.13
✔ App/Version deleted: release/0.0.13 [1.2s]
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
  };

  async run(): Promise<void> {
    const config = Config.instance;

    // const RUNNING_TEXT = ' RUNS ';
    // const RUNNING = chalk.reset.inverse.yellow.bold(RUNNING_TEXT) + ' ';
    const RUNNING = ''; //chalk.reset.inverse.yellow.bold(RUNNING_TEXT) + ' ';

    const { flags: parsedFlags } = this.parse(DeleteCommand);
    const semVer = parsedFlags.newVersion ?? parsedFlags['new-version'] ?? config.app.semVer;
    const appName = parsedFlags.appName ?? parsedFlags['app-name'] ?? config.app.name;
    const deployerLambdaName =
      parsedFlags.deployerLambdaName ??
      parsedFlags['deployer-lambda-name'] ??
      config.deployer.lambdaName;

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
          title: 'Deleting Version',
          task: async (ctx, task) => {
            const origTitle = task.title;
            task.title = RUNNING + origTitle;

            // Confirm the Version Does Not Exist in Published State
            task.output = `Deleting app/version ${config.app.name}/${semVer}`;
            const result = await DeployClient.DeleteVersion({
              config,
              output: (message: string) => (task.output = message),
            });
            if (result.statusCode === 200) {
              task.title = `App/Version deleted: ${config.app.name}/${config.app.semVer}`;
            } else if (result.statusCode === 404) {
              task.title = `App/Version does not exist: ${config.app.name}/${config.app.semVer}`;
            } else {
              task.title = `App/Version delete failed: ${config.app.name}/${config.app.semVer}`;
              throw new Error(`App/Version delete failed: ${config.app.name}/${config.app.semVer}`);
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
