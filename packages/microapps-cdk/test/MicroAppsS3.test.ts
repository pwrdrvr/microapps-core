/// <reference types="jest" />
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { MicroAppsS3 } from '../src/MicroAppsS3';

describe('MicroAppsS3', () => {
  const app = new App({});

  it('works with no params', () => {
    const stack = new Stack(app, 'stack');
    const construct = new MicroAppsS3(stack, 'construct', {});

    expect(construct).toBeDefined();
    expect(construct.bucketApps).toBeDefined();
    expect(construct.bucketAppsStaging).toBeDefined();
    expect(construct.bucketLogs).toBeDefined();
    expect(construct.bucketAppsOAI).toBeDefined();
    expect(construct.bucketAppsOrigin).toBeDefined();

    expect(construct.node).toBeDefined();
    Template.fromStack(stack).resourceCountIs('AWS::S3::Bucket', 3);
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });
});
