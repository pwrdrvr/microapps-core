#!/usr/bin/env node
import 'source-map-support/register';
import { App, Aws, Environment } from 'aws-cdk-lib';
import { MicroAppsStack } from '../lib/MicroApps';
import { MicroAppsChildStack } from '../lib/MicroAppsChild';
import { MicroAppsChildPrivStack } from '../lib/MicroAppsChildPriv';
import { SharedProps } from '../lib/SharedProps';

const app = new App();

const shared = new SharedProps(app);

// We must set the env so that R53 zone imports will work
const env: Environment = {
  region: shared.region,
  account: shared.account,
};

new MicroAppsStack(app, 'microapps-core', {
  env,
  stackName: `microapps-core-ghpublic${shared.envSuffix}${shared.prSuffix}`,
  autoDeleteEverything: true,
  domainNameEdge: `apps${shared.envDomainSuffix}${shared.prSuffix}.${shared.domainName}`,
  domainNameOrigin: `apps-origin${shared.envDomainSuffix}${shared.prSuffix}.${shared.domainName}`,
  r53ZoneID: shared.r53ZoneID,
  r53ZoneName: shared.r53ZoneName,
  certARNEdge: shared.certARNEdge,
  certARNOrigin: shared.certARNOrigin,
  s3PolicyBypassAROAs: shared.s3PolicyBypassAROAs,
  s3PolicyBypassPrincipalARNs: shared.s3PolicyBypassPrincipalARNs,
  s3StrictBucketPolicy: shared.s3StrictBucketPolicy,
  assetNameRoot: 'microapps-core-ghpublic',
  assetNameSuffix: `${shared.envSuffix}${shared.prSuffix}`,
  deployDemoApp: shared.deployDemoApp,
  deployNextjsDemoApp: shared.deployNextjsDemoApp,
  deployReleaseApp: shared.deployReleaseApp,
  // Allow the primary deployment to call child apps on PRs
  // as a demo of providing an additional allowed IAM Role
  ...(shared.isPR
    ? {
        edgeToOriginRoleARNs: [
          `arn:aws:iam::${Aws.ACCOUNT_ID}:role/microapps-core-ghpublic-edge-role${shared.envSuffix}`,
        ],
      }
    : {}),
  // We need to know the origin region for signing requests
  // Accessing Aws.REGION will end up writing a Token into the config file
  originRegion: shared.region,
  ...(process.env.AWS_ACCOUNT_ID_CHILD
    ? {
        allowedFunctionUrlAccounts: [process.env.AWS_ACCOUNT_ID_CHILD],
      }
    : {}),
});

new MicroAppsChildStack(app, 'microapps-core-child', {
  env,
  stackName: `microapps-core-ghchild${shared.envSuffix}${shared.prSuffix}`,
  autoDeleteEverything: true,
  assetNameRoot: 'microapps-core-ghchild',
  assetNameSuffix: `${shared.envSuffix}${shared.prSuffix}`,
  parentDeployerLambdaARN: process.env.PARENT_DEPLOYER_LAMBDA_ARN || '',
  edgeToOriginRoleARN: process.env.EDGE_TO_ORIGIN_ROLE_ARN,
});

new MicroAppsChildPrivStack(app, 'microapps-core-child-priv', {
  env,
  stackName: `microapps-core-ghchild-priv${shared.envSuffix}${shared.prSuffix}`,
  parentDeployerLambdaARN: process.env.PARENT_DEPLOYER_LAMBDA_ARN || '',
  childDeployerRoleArns: [
    `arn:aws:iam::${process.env.AWS_ACCOUNT_ID_CHILD}:role/microapps-core-ghchild-deployer${shared.envSuffix}${shared.prSuffix}`,
  ],
});

new MicroAppsStack(app, 'microapps-basic', {
  env,
  stackName: `microapps-basic-ghpublic${shared.envSuffix}${shared.prSuffix}`,
  autoDeleteEverything: true,
  deployDemoApp: shared.deployDemoApp,
  deployNextjsDemoApp: shared.deployNextjsDemoApp,
  deployReleaseApp: shared.deployReleaseApp,
  // We need to know the origin region for signing requests
  // Accessing Aws.REGION will end up writing a Token into the config file
  originRegion: shared.region,
  tableName: `microapps-basic-ghpublic${shared.envSuffix}${shared.prSuffix}`,
});

new MicroAppsStack(app, 'microapps-basic-prefix', {
  env,
  stackName: `microapps-basic-prefix-ghpublic${shared.envSuffix}${shared.prSuffix}`,
  autoDeleteEverything: true,
  deployDemoApp: shared.deployDemoApp,
  deployNextjsDemoApp: shared.deployNextjsDemoApp,
  deployReleaseApp: shared.deployReleaseApp,
  rootPathPrefix: 'prefix',
  // We need to know the origin region for signing requests
  // Accessing Aws.REGION will end up writing a Token into the config file
  originRegion: shared.region,
  tableName: `microapps-basic-prefix-ghpublic${shared.envSuffix}${shared.prSuffix}`,
});
