const { NodePackageManager, NodeProject, NpmAccess, ProjectType } = require('projen');
const project = new NodeProject({
  copyrightOwner: 'PwrDrvr LLC',
  copyrightPeriod: '2020',
  defaultReleaseBranch: 'main',
  jest: false,
  license: 'MIT',
  name: '@pwrdrvr/microapps-publish',
  npmAccess: NpmAccess.RESTRICTED,
  packageManager: NodePackageManager.NPM,
  repositoryUrl: 'git@github.com:pwrdrvr/microapps-core.git',
  projectType: ProjectType.APP,

  gitignore: [
    '/lib',
  ],

  releaseToNpm: false,

  bin: {
    'microapps-publish': 'lib/index.js',
  },

  // deps: [],                          /* Runtime dependencies of this module. */
  deps: [
    '@aws-sdk/client-lambda@^3.20.0',
    '@aws-sdk/client-s3@^3.20.0',
    '@aws-sdk/client-sts@^3.20.0',
    '@aws-sdk/lib-storage@^3.20.0',
    'commander@^7.1.0',
    'convict@^6.1.0',
    'convict-format-with-validator@^6.0.1',
    'fs-extra@^9.1.0',
    'js-yaml@^4.1.0',
    'mime-types@^2.1.30',
    'p-map@^4.0.0',
    'reflect-metadata@^0.1.13',
    'source-map-support@^0.5.19',
    'ts-convict@^1.1.0',
    'tslib@^2.1.0',
  ],
  // description: undefined,            /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],                       /* Build dependencies for this module. */
  devDeps: [
    '@types/convict@^6.0.2',
    '@types/convict-format-with-validator@^6.0.2',
    '@types/fs-extra@^9.0.11',
    '@types/js-yaml@^4.0.1',
    '@types/mime-types@^2.1.0',
    '@types/source-map-support@^0.5.4',
  ],
  // packageName: undefined,            /* The "name" in package.json. */
  // projectType: ProjectType.UNKNOWN,  /* Which type of project this is (library/app). */
  // release: undefined,                /* Add release management to this project. */
});

project.compileTask.exec('tsc --build tsconfig.json');

project.synth();