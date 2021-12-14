/// <reference types="jest" />
import '@aws-cdk/assert/jest';
import { App, Stack } from '@aws-cdk/core';
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
    // expect(stack).toHaveResource('AWS::S3::Bucket');
    expect(app.synth().getStackArtifact(stack.artifactId).template).toMatchSnapshot();
  });
});
