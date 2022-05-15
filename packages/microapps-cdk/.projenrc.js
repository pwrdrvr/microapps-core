// eslint-disable-next-line import/no-extraneous-dependencies
const { AwsCdkConstructLibrary, NodePackageManager, NpmAccess } = require('projen');
const project = new AwsCdkConstructLibrary({
  author: 'Harold Hunt',
  authorAddress: 'harold@pwrdrvr.com',
  authorOrganization: 'PwrDrvr LLC',
  description:
    'MicroApps framework, by PwrDrvr LLC, delivered as an AWS CDK construct that provides the DynamoDB, Router service, Deploy service, API Gateway, and CloudFront distribution.',
  cdkVersion: '2.23.0',
  copyrightOwner: 'PwrDrvr LLC',
  copyrightPeriod: '2020',
  defaultReleaseBranch: 'main',
  license: 'MIT',
  name: '@pwrdrvr/microapps-cdk',
  npmAccess: NpmAccess.PUBLIC,
  packageManager: NodePackageManager.NPM,
  minNodeVersion: '12.0.0',
  // .projenrc.ts causes failed `ts-node` runs from `npx projen` unless
  // the generated `tsconfig.json` (but .gitignore'd) file is deleted before
  // running `npx projen` - It's just not worth the trouble to try to
  // get `.projenrc.ts` to work
  projenrcTs: false,
  repositoryUrl: 'https://github.com/pwrdrvr/microapps-core',
  homepage: 'https://github.com/pwrdrvr/microapps-core',
  stability: 'experimental',
  jest: false,
  projenVersion: '0.34.20',
  keywords: ['awscdk', 'microapps'],

  // Can't do this because it's automatically invoked
  // when running `npm ci` at the top-level when there is no
  // module installed in this local directory.
  // scripts: {
  //   postinstall: 'patch-package',
  // },

  // Which AWS CDK modules (those that start with "@aws-cdk/") does this library require when consumed?
  cdkDependencies: ['aws-cdk-lib'],

  // cdkTestDependencies: undefined,    /* AWS CDK modules required for testing. */
  // deps: [],                          /* Runtime dependencies of this module. */

  // description: undefined,            /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],                       /* Build dependencies for this module. */

  devDeps: [
    'aws-cdk-lib@^2.23.0',
    'esbuild',
    '@aws-cdk/aws-apigatewayv2-alpha@^2.23.0-alpha.0',
    '@aws-cdk/aws-apigatewayv2-integrations-alpha@^2.23.0-alpha.0',
    'patch-package@^6.4.7',
  ],
  peerDeps: [
    '@aws-cdk/aws-apigatewayv2-alpha@^2.23.0-alpha.0',
    '@aws-cdk/aws-apigatewayv2-integrations-alpha@^2.23.0-alpha.0',
  ],

  // packageName: undefined,            /* The "name" in package.json. */
  // projectType: ProjectType.UNKNOWN,  /* Which type of project this is (library/app). */
  // release: undefined,                /* Add release management to this project. */

  publishToMaven: {
    mavenArtifactId: 'microapps-cdk',
    javaPackage: 'com.pwrdrvr.microapps.cdk',
    mavenGroupId: 'com.pwrdrvr.microapps',
  },
  publishToNuget: {
    dotNetNamespace: 'PwrDrvr.MicroApps.CDK',
    packageId: 'PwrDrvr.MicroApps.CDK',
  },
  publishToPypi: {
    distName: 'pwrdrvr.microapps.cdk',
    module: 'pwrdrvr.microapps.cdk',
  },
});

project.preCompileTask.exec(
  'patch-package && if [ -d ../../node_modules ] ; then mv ../../node_modules ../../node_modules_hide; fi',
);

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
project.compileTask.exec('cp -R ../microapps-router/templates lib/microapps-router/');

project.synth();
