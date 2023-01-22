import 'reflect-metadata';
import { Command, flags as flagsParser } from '@oclif/command';
import { Listr } from 'listr2';
import { createVersions, IVersions, restoreFiles, writeNewVersions } from '../lib/Versions';
import { Config } from '../config/Config';

export class NextJSVersionCommand extends Command {
  static description = 'Apply version to next.config.js overtop of 0.0.0 placeholder';

  static examples = [
    `$ microapps-publish nextjs-version -n 0.0.13
✔ Modifying Config Files [0.0s]
`,
  ];

  static flags = {
    version: flagsParser.version({
      char: 'v',
    }),
    help: flagsParser.help(),
    newVersion: flagsParser.string({
      char: 'n',
      multiple: false,
      required: true,
      description: 'New semantic version to apply',
    }),
    leaveCopy: flagsParser.boolean({
      char: 'l',
      default: false,
      required: false,
      description: 'Leave a copy of the modifed files as .modified',
    }),
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

    const { flags: parsedFlags } = this.parse(NextJSVersionCommand);
    const version = parsedFlags.newVersion;
    const leaveFiles = parsedFlags.leaveCopy;

    // Override the config value
    const config = Config.instance;
    config.app.semVer = version;

    this.VersionAndAlias = createVersions(version);
    const versionOnly = { version: this.VersionAndAlias.version };

    this.FILES_TO_MODIFY = [{ path: 'next.config.js', versions: versionOnly }];

    // TODO: Pick and validate the appname/semver from the config and flags

    if (config === undefined) {
      this.error('Failed to load the config file');
    }

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
        {
          title: 'Modifying Config Files',
          task: async (ctx, task) => {
            const origTitle = task.title;
            task.title = RUNNING + origTitle;

            // Modify the existing files with the new version
            for (const fileToModify of this.FILES_TO_MODIFY) {
              task.output = `Patching version (${this.VersionAndAlias.version}) into ${fileToModify.path}`;
              if (!(await writeNewVersions(fileToModify.path, fileToModify.versions, leaveFiles))) {
                task.output = `Failed modifying file: ${fileToModify.path}`;
              }
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

    await tasks.run();
  }
}
