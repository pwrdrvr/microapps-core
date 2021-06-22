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

const env: cdk.Environment = {
  region: 'us-east-2',
  account: '***REMOVED***',
};

const app = new cdk.App();

Tags.addSharedTags(app);

// CloudFront certificate
// Note: Must be in US East 1
const cert = acm.Certificate.fromCertificateArn(
  app,
  'microapps-cloudfront-cert',
  'arn:aws:acm:us-east-1:***REMOVED***:certificate/e2434943-4295-4514-8f83-eeef556d8d09',
);

// Specific cert for API Gateway
// Note: Must be in region where CDK stack is deployed
const apiGwyCertArn =
  'arn:aws:acm:us-east-2:***REMOVED***:certificate/533cdfa2-0528-484f-bd53-0a0d0dc6159c';
const certApiGwy = acm.Certificate.fromCertificateArn(app, 'microapps-apigwy-cert', apiGwyCertArn);

const zone = r53.HostedZone.fromHostedZoneAttributes(app, 'microapps-zone', {
  zoneName: 'pwrdrvr.com', // FIXME: domainNameOrigin (zone only)
  hostedZoneId: 'ZHYNI9F572BBD',
});

const s3 = new MicroAppsS3(app, 'microapps-cloudfront', {
  env,
  local: {},
});
const cf = new MicroAppsCF(app, 'microapps-cloudfront', {
  local: { cert, domainName: 'apps.pwrdrvr.com', domainNameOrigin: 'apps-origin.pwrdrvr.com' },
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
    cert: certApiGwy,
  },
  env,
});
const route53 = new MicroAppsR53(app, 'microapps-r53', {
  svcsExports: svcs,
  cfExports: cf,
  local: {
    domainName: 'apps.pwrdrvr.com',
    domainNameOrigin: 'apps-origin.pwrdrvr.com',
    zone,
  },
  env,
});
