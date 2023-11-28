/// <reference types="jest" />
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as cf from 'aws-cdk-lib/aws-cloudfront';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { MicroAppsSvcs } from '../src/MicroAppsSvcs';

describe('MicroAppsSvcs', () => {
  const app = new App({});

  it('works with no params', () => {
    const stack = new Stack(app, 'stack');
    const bucketAppsOAI = new cf.OriginAccessIdentity(stack, 'oai', {});
    const bucketApps = new s3.Bucket(stack, 'bucket-apps', {});
    const bucketAppsStaging = new s3.Bucket(stack, 'bucket-apps-staging', {});
    const construct = new MicroAppsSvcs(stack, 'construct', {
      appEnv: 'dev',
      bucketApps,
      bucketAppsOAI,
      bucketAppsStaging,
    });

    expect(construct).toBeDefined();
    expect(construct.table).toBeDefined();

    Template.fromStack(stack).hasResourceProperties('AWS::Lambda::Function', {});
    Template.fromStack(stack).resourceCountIs('AWS::Lambda::Function', 2);
  });
});
