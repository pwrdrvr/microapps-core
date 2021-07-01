#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { MicroAppsRepos } from '../lib/MicroAppsRepos';
import { MicroAppsCF } from '../lib/MicroAppsCF';
import { MicroAppsSvcs } from '../lib/MicroAppsSvcs';
import { MicroAppsS3 } from '../lib/MicroAppsS3';
import SharedTags from '../lib/SharedTags';
import { Imports } from '../lib/Imports';
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

const domainNameEdge = `apps${shared.envDomainSuffix}${shared.prSuffix}.${shared.domainName}`;
const domainNameOrigin = `apps-origin${shared.envDomainSuffix}${shared.prSuffix}.${shared.domainName}`;

const imports = new Imports(app, `microapps-imports${shared.envSuffix}${shared.prSuffix}`, {
  shared,
  local: {},
  env,
});
const s3 = new MicroAppsS3(app, `microapps-s3${shared.envSuffix}${shared.prSuffix}`, {
  env,
  local: {},
  shared,
});
const cf = new MicroAppsCF(app, `microapps-cloudfront${shared.envSuffix}${shared.prSuffix}`, {
  shared,
  local: {
    cert: imports.certEdge,
    domainNameEdge,
    domainNameOrigin,
  },
  s3Exports: s3,
  env,
});
const repos = new MicroAppsRepos(app, `microapps-repos${shared.envSuffix}${shared.prSuffix}`, {
  env,
  shared,
  local: {},
});
const svcs = new MicroAppsSvcs(app, `microapps-svcs${shared.envSuffix}${shared.prSuffix}`, {
  cfStackExports: cf,
  reposExports: repos,
  s3Exports: s3,
  local: {
    domainNameEdge,
    domainNameOrigin,
    cert: imports.certOrigin,
  },
  env,
  shared,
});

// Note: This is only run manually once per env to create build user
const builder = new MicroAppsBuilder(app, `microapps-builder${shared.envSuffix}`, {
  local: {
    // None yet
  },
  shared,
  env,
});
