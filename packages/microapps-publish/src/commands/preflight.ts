import 'reflect-metadata';
import * as sts from '@aws-sdk/client-sts';
import { Command, flags as flagsParser } from '@oclif/command';
import * as chalk from 'chalk';
import { Listr } from 'listr2';
import { Config } from '../config/Config';
import DeployClient from '../lib/DeployClient';

export class PreflightCommand extends Command {
  static description = 'Check if app/version are available';

  static examples = [
    `$ microapps-publish preflight -a release -n 0.0.13
✔ Preflight Version Check [0.2s]
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

    const { flags: parsedFlags } = this.parse(PreflightCommand);
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

    if (config === undefined) {
      this.error('Failed to load the config file');
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
            task.output = `Checking if deployed app/version already exists for ${config.app.name}/${version}`;
            const preflightResult = await DeployClient.DeployVersionPreflight({
              config,
              needS3Creds: false,
              output: (message: string) => (task.output = message),
            });
            if (preflightResult.exists) {
              task.output = `Warning: App/Version already exists: ${config.app.name}/${config.app.semVer}`;
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
    } catch (error) {
      this.log(`Caught exception: ${error.message}`);
    }
  }
}
