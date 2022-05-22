#!/usr/bin/env node
import 'source-map-support/register';
import { App, Environment } from 'aws-cdk-lib';
import { MicroAppsStack } from '../lib/MicroApps';
import { MicroAppsBuilder } from '../lib/MicroAppsBuilder';
import { SharedProps } from '../lib/SharedProps';
import { SharedTags } from '../lib/SharedTags';

const app = new App();

const shared = new SharedProps(app);

// We must set the env so that R53 zone imports will work
const env: Environment = {
  region: shared.region,
  account: shared.account,
};

SharedTags.addSharedTags(app, { shared });

new MicroAppsStack(app, 'microapps-core', {
  env,
  stackName: `${shared.stackName}${shared.envSuffix}${shared.prSuffix}`,
  ttl: shared.isPR ? shared.ttlBase : undefined,
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
  assetNameRoot: `${shared.stackName}`,
  assetNameSuffix: `${shared.envSuffix}${shared.prSuffix}`,
  deployDemoApp: shared.deployDemoApp,
  deployNextjsDemoApp: shared.deployNextjsDemoApp,
  deployReleaseApp: shared.deployReleaseApp,
  // We need to know the origin region for signing requests
  // Accessing Aws.REGION will end up writing a Token into the config file
  originRegion: shared.region,
});

new MicroAppsStack(app, 'microapps-basic', {
  env,
  stackName: `${shared.stackName}${shared.envSuffix}${shared.prSuffix}`,
  ttl: shared.isPR ? shared.ttlBase : undefined,
  autoDeleteEverything: true,
  deployDemoApp: shared.deployDemoApp,
  deployNextjsDemoApp: shared.deployNextjsDemoApp,
  deployReleaseApp: shared.deployReleaseApp,
  // We need to know the origin region for signing requests
  // Accessing Aws.REGION will end up writing a Token into the config file
  originRegion: shared.region,
});

new MicroAppsStack(app, 'microapps-basic-prefix', {
  env,
  stackName: `${shared.stackName}${shared.envSuffix}${shared.prSuffix}`,
  ttl: shared.isPR ? shared.ttlBase : undefined,
  autoDeleteEverything: true,
  deployDemoApp: shared.deployDemoApp,
  deployNextjsDemoApp: shared.deployNextjsDemoApp,
  deployReleaseApp: shared.deployReleaseApp,
  rootPathPrefix: 'prefix',
  // We need to know the origin region for signing requests
  // Accessing Aws.REGION will end up writing a Token into the config file
  originRegion: shared.region,
});

// Note: This is only run manually once per env to create build user
new MicroAppsBuilder(app, 'microapps-builder', {
  stackName: `${shared.stackName}-builder${shared.envSuffix}`,
  shared,
  env,
});
