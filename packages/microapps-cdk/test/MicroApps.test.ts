/// <reference types="jest" />
import '@aws-cdk/assert/jest';
import { App, Stack } from '@aws-cdk/core';
import { MicroApps } from '../src/MicroApps';

describe('MicroApps', () => {
  const app = new App({});

  it('works with no params', () => {
    const stack = new Stack(app, 'stack');
    const construct = new MicroApps(stack, 'construct', {
      appEnv: 'dev',
    });

    expect(construct).toBeDefined();
    expect(construct.apigwy).toBeDefined();
    expect(construct.cf).toBeDefined();
    expect(construct.s3).toBeDefined();
    expect(construct.svcs).toBeDefined();

    expect(construct.node).toBeDefined();
    // expect(stack).toHaveResource('AWS::S3::Bucket');
    // expect(app.synth().getStackArtifact(stack.artifactId).template).toMatchSnapshot();
  });
});
