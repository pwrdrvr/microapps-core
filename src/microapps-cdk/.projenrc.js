// eslint-disable-next-line import/no-extraneous-dependencies
const { AwsCdkConstructLibrary, NodePackageManager, NpmAccess } = require('projen');
const project = new AwsCdkConstructLibrary({
  author: 'Harold Hunt',
  authorAddress: 'harold@pwrdrvr.com',
  cdkVersion: '1.95.2',
  copyrightOwner: 'PwrDrvr LLC',
  copyrightPeriod: '2020',
  defaultReleaseBranch: 'main',
  license: 'MIT',
  name: '@pwrdrvr/microapps-cdk',
  npmAccess: NpmAccess.PUBLIC,
  packageManager: NodePackageManager.NPM,
  // .projenrc.ts causes failed `ts-node` runs from `npx projen` unless
  // the generated (but .gitignore'd) is deleted before running
  // `npx projen` - It's just not worth the trouble
  projenrcTs: false,
  repositoryUrl: 'git@github.com:pwrdrvr/microapps-core.git',
  jest: false,

  // cdkDependencies: undefined,        /* Which AWS CDK modules (those that start with "@aws-cdk/") does this library require when consumed? */
  cdkDependencies: [
    '@aws-cdk/aws-apigatewayv2',
    '@aws-cdk/aws-apigatewayv2-integrations',
    '@aws-cdk/aws-certificatemanager',
    '@aws-cdk/aws-cloudfront',
    '@aws-cdk/aws-cloudfront-origins',
    '@aws-cdk/aws-dynamodb',
    '@aws-cdk/aws-ecr',
    '@aws-cdk/aws-iam',
    '@aws-cdk/aws-lambda',
    '@aws-cdk/aws-lambda-nodejs',
    '@aws-cdk/aws-logs',
    '@aws-cdk/aws-route53',
    '@aws-cdk/aws-route53-targets',
    '@aws-cdk/aws-s3',
    '@aws-cdk/core',
  ],

  // cdkTestDependencies: undefined,    /* AWS CDK modules required for testing. */
  // deps: [],                          /* Runtime dependencies of this module. */
  deps: ['@cloudcomponents/cdk-deletable-bucket'],

  peerDeps: ['@cloudcomponents/cdk-deletable-bucket'],

  // description: undefined,            /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],                       /* Build dependencies for this module. */
  devDeps: ['esbuild'],

  // packageName: undefined,            /* The "name" in package.json. */
  // projectType: ProjectType.UNKNOWN,  /* Which type of project this is (library/app). */
  // release: undefined,                /* Add release management to this project. */
});

// Move the parent node_modules back into place now that jsii is done
project.compileTask.exec(
  'if [ -d ../../node_modules_hide ] ; then mv ../../node_modules_hide ../../node_modules; fi',
);

project.compileTask.exec(
  'esbuild ../microapps-deployer/src/index.ts --bundle --minify --sourcemap --platform=node --target=node14 --external:aws-sdk --outfile=lib/microapps-deployer/index.js',
);
project.compileTask.exec(
  'esbuild ../microapps-router/src/index.ts --bundle --minify --sourcemap --platform=node --target=node14 --external:aws-sdk --outfile=lib/microapps-router/index.js',
);
project.compileTask.exec(
  'cp -R ../microapps-router/templates lib/microapps-router/',
);

project.synth();
