/// <reference types="jest" />
import '@aws-cdk/assert/jest';
import { App, Stack } from '@aws-cdk/core';
import { MicroAppsAPIGwy } from '../src/MicroAppsAPIGwy';

describe('MicroAppsAPIGwy', () => {
  const app = new App({});

  it('works with no params', () => {
    const stack = new Stack(app, 'stack');
    // const cloudFrontDistro = new cf.Distribution(stack, 'cf-distro', {
    //   defaultBehavior: {
    //     allowedMethods: cf.AllowedMethods.ALLOW_ALL,
    //     cachePolicy: cf.CachePolicy.CACHING_DISABLED,
    //     compress: true,
    //     originRequestPolicy: cf.OriginRequestPolicy.ALL_VIEWER,
    //     origin: bucketAppsOrigin, // Just a dummy to create this distro
    //     viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    //   },
    // });
    const construct = new MicroAppsAPIGwy(stack, 'construct', {});

    expect(construct).toBeDefined();
    expect(construct.dnAppsOrigin).toBeUndefined();
    expect(construct.httpApi).toBeDefined();
    expect(construct.node).toBeDefined();

    expect(app.synth().getStackArtifact(stack.artifactId).template).toMatchSnapshot();
  });
});
