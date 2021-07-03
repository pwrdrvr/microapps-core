#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { MicroApps } from '../lib/MicroApps';
import SharedTags from '../lib/SharedTags';
import SharedProps from '../lib/SharedProps';
import { MicroAppsBuilder } from '../lib/MicroAppsBuilder';

const app = new cdk.App();

const shared = new SharedProps(app);

// We must set the env so that R53 zone imports will work
const env: cdk.Environment = {
  region: shared.region,
  account: shared.account,
};

SharedTags.addSharedTags(app);

const apps = new MicroApps(app, `microapps${shared.envSuffix}${shared.prSuffix}`, {
  env,
  local: {
    ttl: shared.isPR ? shared.ttlBase : undefined,
    autoDeleteEverything: true,
  },
  shared,
});

// Note: This is only run manually once per env to create build user
const builder = new MicroAppsBuilder(app, `microapps-builder${shared.envSuffix}`, {
  shared,
  env,
});
