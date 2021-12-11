import 'reflect-metadata';
import * as sts from '@aws-sdk/client-sts';
import { Command, flags as flagsParser } from '@oclif/command';
import { Listr } from 'listr2';
import { Config } from '../config/Config';
import DeployClient from '../lib/DeployClient';

export class DeleteCommand extends Command {
  static description = 'Delete app/version';

  static examples = [
    `$ microapps-publish delete -a release -n 0.0.13
✔ App/Version deleted: release/0.0.13 [1.2s]
`,
  ];

  static flags = {
    version: flagsParser.version({
      char: 'v',
    }),
    help: flagsParser.help(),
    appName: flagsParser.string({
      char: 'a',
      multiple: false,
      required: false,
      description: 'Name of the MicroApp',
    }),
    newVersion: flagsParser.string({
      char: 'n',
      multiple: false,
      required: true,
      description: 'New semantic version to apply',
    }),
    deployerLambdaName: flagsParser.string({
      char: 'd',
      multiple: false,
      required: true,
      description: 'Name of the deployer lambda function',
    }),
  };

  async run(): Promise<void> {
    const config = Config.instance;

    // const RUNNING_TEXT = ' RUNS ';
    // const RUNNING = chalk.reset.inverse.yellow.bold(RUNNING_TEXT) + ' ';
    const RUNNING = ''; //chalk.reset.inverse.yellow.bold(RUNNING_TEXT) + ' ';

    const { flags: parsedFlags } = this.parse(DeleteCommand);
    const version = parsedFlags.newVersion;
    const appName = parsedFlags.appName ?? config.app.name;
    const deployerLambdaName = parsedFlags.deployerLambdaName ?? config.deployer.lambdaName;
    const semVer = parsedFlags.newVersion ?? config.app.semVer;

    // Override the config value
    config.deployer.lambdaName = deployerLambdaName;
    config.app.name = appName;
    config.app.semVer = semVer;

    // TODO: Pick and validate the appname/semver from the config and flags

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
            task.output = `Deleting app/version ${config.app.name}/${version}`;
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
