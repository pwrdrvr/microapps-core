#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { Repos } from '../lib/Repos';
import { CloudFront } from '../lib/CloudFront';
import { MicroApps } from '../lib/MicroApps';

const env: cdk.Environment = {
  region: 'us-east-2',
  account: '***REMOVED***',
};

const app = new cdk.App();
const cf = new CloudFront(app, 'CloudfrontStack', { env }); //'microapps-cloudfront');
const repos = new Repos(app, 'Repos', { env }); //'microapps-repos');
new MicroApps(app, 'MicroApps', {
  //'microapps-core', {
  CFStackExports: cf,
  ReposExports: repos,
  env,
});
