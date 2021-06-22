#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { MicroAppsRepos } from '../lib/MicroAppsRepos';
import { MicroAppsCF } from '../lib/MicroAppsCF';
import { MicroAppsSvcs } from '../lib/MicroAppsSvcs';
import { MicroAppsS3 } from '../lib/MicroAppsS3';
import { MicroAppsR53 } from '../lib/MicroAppsR53';
import SharedTags from '../lib/SharedTags';
import { Imports } from '../lib/Imports';
import SharedProps from '../lib/SharedProps';

const env: cdk.Environment = {
  region: 'us-east-2',
  account: '***REMOVED***',
};

const sharedProps = new SharedProps();

const app = new cdk.App();

SharedTags.addSharedTags(app);

const r53ZoneName = 'pwrdrvr.com';
const r53ZoneID = 'ZHYNI9F572BBD';
const certARNEdge =
  'arn:aws:acm:us-east-1:***REMOVED***:certificate/e2434943-4295-4514-8f83-eeef556d8d09';
const certARNOrigin =
  'arn:aws:acm:us-east-2:***REMOVED***:certificate/533cdfa2-0528-484f-bd53-0a0d0dc6159c';

const domainNameEdge = `apps${sharedProps.envDomainSuffix}${sharedProps.prSuffix}.${r53ZoneName}`;
const domainNameOrigin = `apps-origin${sharedProps.envDomainSuffix}${sharedProps.prSuffix}.${r53ZoneName}`;

const imports = new Imports(
  app,
  `microapps-imports${sharedProps.envSuffix}${sharedProps.prSuffix}`,
  {
    local: {
      certARNEdge,
      certARNOrigin,
      r53ZoneID,
      r53ZoneName,
    },
  },
);
const s3 = new MicroAppsS3(app, `microapps-s3${sharedProps.envSuffix}${sharedProps.prSuffix}`, {
  env,
  local: {},
  shared: sharedProps,
});
const cf = new MicroAppsCF(
  app,
  `microapps-cloudfront${sharedProps.envSuffix}${sharedProps.prSuffix}`,
  {
    shared: sharedProps,
    local: {
      cert: imports.certEdge,
      domainNameEdge,
      domainNameOrigin,
    },
    s3Exports: s3,
    env,
  },
);
const repos = new MicroAppsRepos(
  app,
  `microapps-repos${sharedProps.envSuffix}${sharedProps.prSuffix}`,
  {
    env,
    shared: sharedProps,
    local: {},
  },
);
const svcs = new MicroAppsSvcs(
  app,
  `microapps-core${sharedProps.envSuffix}${sharedProps.prSuffix}`,
  {
    cfStackExports: cf,
    reposExports: repos,
    s3Exports: s3,
    local: {
      domainNameEdge,
      domainNameOrigin,
      cert: imports.certOrigin,
    },
    env,
    shared: sharedProps,
  },
);
const route53 = new MicroAppsR53(
  app,
  `microapps-r53${sharedProps.envSuffix}${sharedProps.prSuffix}`,
  {
    svcsExports: svcs,
    cfExports: cf,
    local: {
      domainNameEdge,
      domainNameOrigin,
      zone: imports.zone,
    },
    env,
    shared: sharedProps,
  },
);
