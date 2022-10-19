// eslint-disable-next-line import/no-extraneous-dependencies
const { awscdk, javascript } = require('projen');
const { NodePackageManager } = require('projen/lib/javascript');
const project = new awscdk.AwsCdkConstructLibrary({
  author: 'PwrDrvr LLC',
  authorAddress: 'harold@pwrdrvr.com',
  authorOrganization: true,
  description:
    'MicroApps framework, by PwrDrvr LLC, delivered as an AWS CDK construct that provides the DynamoDB, Router service, Deploy service, API Gateway, and CloudFront distribution.',
  cdkVersion: '2.24.1',
  copyrightOwner: 'PwrDrvr LLC',
  copyrightPeriod: '2020',
  defaultReleaseBranch: 'main',
  license: 'MIT',
  name: '@pwrdrvr/microapps-cdk',
  releaseToNpm: true,
  npmAccess: javascript.NpmAccess.PUBLIC,
  packageManager: javascript.NodePackageManager.YARN,
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
  keywords: ['awscdk', 'microapps'],
  docgen: true,

  // Can't do this because it's automatically invoked
  // when running `npm ci` at the top-level when there is no
  // module installed in this local directory.
  // scripts: {
  //   postinstall: 'patch-package',
  // },

  // cdkTestDependencies: undefined,    /* AWS CDK modules required for testing. */
  // deps: [],                          /* Runtime dependencies of this module. */
  deps: [
    '@aws-cdk/aws-apigatewayv2-alpha',
    '@aws-cdk/aws-apigatewayv2-authorizers-alpha',
    '@aws-cdk/aws-apigatewayv2-integrations-alpha',
  ],

  // description: undefined,            /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],                       /* Build dependencies for this module. */

  bundledDeps: [
    '@henrist/cdk-cross-region-params',
  ],
  devDeps: [
    'esbuild',
    // '@aws-cdk/aws-apigatewayv2-alpha@2.24.1-alpha.0',
    // '@aws-cdk/aws-apigatewayv2-integrations-alpha@2.24.1-alpha.0',
    // 'patch-package@^6.4.7',
  ],
  peerDeps: [
    '@aws-cdk/aws-apigatewayv2-alpha',
    '@aws-cdk/aws-apigatewayv2-authorizers-alpha',
    '@aws-cdk/aws-apigatewayv2-integrations-alpha',
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

//
// Types from the monorepo that are not used by CDK are causing build failures
// and `jsii` appears to not have a way to pass `skipLibCheck: true`
//
// Errors:
// ../../node_modules/@types/convict-format-with-validator/index.d.ts:7:26 - error TS2306: File '/workspaces/microapps-core/node_modules/@types/convict/index.d.ts' is not a module.

// 7 import * as convict from 'convict';
// ~~~~~~~~~
// ../../node_modules/@types/convict/index.d.ts:114:23 - error TS1110: Type expected.

// 114                 ? K | `${K}.${PathImpl<T[K], Exclude<keyof T[K], keyof any[]>>}`
//
project.preCompileTask.exec(
  'rm -rf  ../../node_modules/@types/prettier/  ../../node_modules/@types/convict/ ../../node_modules/@types/convict-format-with-validator/',
  // 'patch-package && if [ -d ../../node_modules ] ; then mv ../../node_modules ../../node_modules_hide; fi',
);

// Move the parent node_modules back into place now that jsii is done
// project.compileTask.exec(
//   'if [ -d ../../node_modules_hide ] ; then mv ../../node_modules_hide ../../node_modules; fi',
// );

project.compileTask.exec(
  'esbuild ../microapps-edge-to-origin/src/index.ts --bundle --minify --sourcemap --platform=node --target=node14 --external:aws-sdk --outfile=lib/microapps-edge-to-origin/index.js',
);
project.compileTask.exec(
  'esbuild ../microapps-deployer/src/index.ts --bundle --minify --sourcemap --platform=node --target=node14 --external:aws-sdk --outfile=lib/microapps-deployer/index.js',
);
project.compileTask.exec(
  'esbuild ../microapps-router/src/index.ts --bundle --minify --sourcemap --platform=node --target=node14 --external:aws-sdk --outfile=lib/microapps-router/index.js',
);
project.compileTask.exec('cp -R ../microapps-router/templates lib/microapps-router/');
project.compileTask.exec('cp ../microapps-router/templates/* lib/microapps-edge-to-origin/');

project.synth();
