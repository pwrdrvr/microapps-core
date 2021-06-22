#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import * as acm from '@aws-cdk/aws-certificatemanager';
import * as r53 from '@aws-cdk/aws-route53';
import { MicroAppsRepos } from '../lib/MicroAppsRepos';
import { MicroAppsCF } from '../lib/MicroAppsCF';
import { MicroAppsSvcs } from '../lib/MicroAppsSvcs';
import { MicroAppsS3 } from '../lib/MicroAppsS3';
import { MicroAppsR53 } from '../lib/MicroAppsR53';
import Tags from '../lib/Tags';
import { Imports } from '../lib/Imports';

const env: cdk.Environment = {
  region: 'us-east-2',
  account: '***REMOVED***',
};

const app = new cdk.App();

Tags.addSharedTags(app);

const imports = new Imports(app, 'microapps-imports', {});

const s3 = new MicroAppsS3(app, 'microapps-s3', {
  env,
  local: {},
});
const cf = new MicroAppsCF(app, 'microapps-cloudfront', {
  local: {
    cert: imports.certEdge,
    domainName: 'apps.pwrdrvr.com',
    domainNameOrigin: 'apps-origin.pwrdrvr.com',
  },
  s3Exports: s3,
  env,
});
const repos = new MicroAppsRepos(app, 'microapps-repos', { env });
const svcs = new MicroAppsSvcs(app, 'microapps-core', {
  cfStackExports: cf,
  reposExports: repos,
  s3Exports: s3,
  local: {
    domainName: 'apps.pwrdrvr.com',
    domainNameOrigin: 'apps-origin.pwrdrvr.com',
    cert: imports.certOrigin,
  },
  env,
});
const route53 = new MicroAppsR53(app, 'microapps-r53', {
  svcsExports: svcs,
  cfExports: cf,
  local: {
    domainName: 'apps.pwrdrvr.com',
    domainNameOrigin: 'apps-origin.pwrdrvr.com',
    zone: imports.zone,
  },
  env,
});
