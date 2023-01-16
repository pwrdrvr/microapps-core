import 'reflect-metadata';
import { Command, flags as flagsParser } from '@oclif/command';
import { Listr } from 'listr2';
import { createVersions, IVersions } from '@pwrdrvr/microapps-deployer-lib';
import { restoreFiles } from '../lib/Versions';

export class NextJSVersionRestoreCommand extends Command {
  static description = 'Restore next.config.js';

  static examples = [
    `$ microapps-publish nextjs-version-restore
✔ Restoring Modified Config Files [0.0s]
`,
  ];

  static flags = {
    version: flagsParser.version({
      char: 'v',
    }),
    help: flagsParser.help(),
  };

  private VersionAndAlias: IVersions;
  private FILES_TO_MODIFY: {
    path: string;
    versions: IVersions;
  }[];

  async run(): Promise<void> {
    // const RUNNING_TEXT = ' RUNS ';
    // const RUNNING = chalk.reset.inverse.yellow.bold(RUNNING_TEXT) + ' ';
    const RUNNING = ''; //chalk.reset.inverse.yellow.bold(RUNNING_TEXT) + ' ';

    // const { flags: parsedFlags } =
    this.parse(NextJSVersionRestoreCommand);

    this.VersionAndAlias = createVersions('0.0.0');
    const versionOnly = { version: this.VersionAndAlias.version };

    this.FILES_TO_MODIFY = [{ path: 'next.config.js', versions: versionOnly }];

    // TODO: Pick and validate the appname/semver from the config and flags

    //
    // Setup Tasks
    //

    const tasks = new Listr(
      [
        {
          title: 'Restoring Modified Config Files',
          task: async (ctx, task) => {
            const origTitle = task.title;
            task.title = RUNNING + origTitle;

            await restoreFiles(this.FILES_TO_MODIFY);

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

    await tasks.run();
  }
}
