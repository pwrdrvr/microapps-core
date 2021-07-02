#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { MicroAppsRepos } from '../lib/MicroAppsRepos';
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

const repos = new MicroAppsRepos(app, `microapps-repos${shared.envSuffix}${shared.prSuffix}`, {
  env,
  shared,
  local: {
    ttl: shared.ttlBase.plus(shared.ttlIncrementRepos),
  },
});
const apps = new MicroApps(app, `microapps${shared.envSuffix}${shared.prSuffix}`, {
  env,
  local: {
    ttl: shared.ttlBase,
  },
  shared,
  reposExports: repos,
});

// Note: This is only run manually once per env to create build user
const builder = new MicroAppsBuilder(app, `microapps-builder${shared.envSuffix}`, {
  local: {
    // None yet
  },
  shared,
  env,
});
