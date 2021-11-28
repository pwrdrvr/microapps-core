#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { MicroAppsStack } from '../lib/MicroApps';
import { MicroAppsBuilder } from '../lib/MicroAppsBuilder';
import { SharedProps } from '../lib/SharedProps';
import { SharedTags } from '../lib/SharedTags';

const app = new cdk.App();

const shared = new SharedProps(app);

// We must set the env so that R53 zone imports will work
const env: cdk.Environment = {
  region: shared.region,
  account: shared.account,
};

SharedTags.addSharedTags(app, { shared });

new MicroAppsStack(app, 'microapps-core', {
  env,
  stackName: `microapps${shared.envSuffix}${shared.prSuffix}`,
  ttl: shared.isPR ? shared.ttlBase : undefined,
  autoDeleteEverything: true,
  domainNameEdge: `apps${shared.envDomainSuffix}${shared.prSuffix}.${shared.domainName}`,
  domainNameOrigin: `apps-origin${shared.envDomainSuffix}${shared.prSuffix}.${shared.domainName}`,
  shared,
});

// Note: This is only run manually once per env to create build user
new MicroAppsBuilder(app, 'microapps-builder', {
  stackName: `microapps-builder${shared.envSuffix}`,
  shared,
  env,
});
