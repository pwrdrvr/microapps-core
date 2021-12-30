/// <reference types="jest" />
import '@aws-cdk/assert/jest';
import * as acm from '@aws-cdk/aws-certificatemanager';
import * as r53 from '@aws-cdk/aws-route53';
import { App, RemovalPolicy, Stack } from '@aws-cdk/core';
import { MicroAppsAPIGwy } from '../src/MicroAppsAPIGwy';

describe('MicroAppsAPIGwy', () => {
  it('works with no params', () => {
    const app = new App({});
    const stack = new Stack(app, 'stack');
    const construct = new MicroAppsAPIGwy(stack, 'construct', {});

    expect(construct).toBeDefined();
    expect(construct.dnAppsOrigin).toBeUndefined();
    expect(construct.httpApi).toBeDefined();
    expect(construct.node).toBeDefined();

    expect(app.synth().getStackArtifact(stack.artifactId).template).toMatchSnapshot();
  });

  it('works with params', () => {
    const app = new App({});
    const stack = new Stack(app, 'stack');
    const r53Zone = new r53.HostedZone(stack, 'zone', {
      zoneName: 'test.pwrdrvr.com',
    });
    const certOrigin = new acm.Certificate(stack, 'cert', {
      domainName: '*.test.pwrdrvr.com',
    });
    const construct = new MicroAppsAPIGwy(stack, 'construct', {
      assetNameRoot: 'mydeploy',
      assetNameSuffix: '-mysuffix',
      domainNameEdge: 'mydeploy.test.pwrdrvr.com',
      domainNameOrigin: 'mydeploy-origin.test.pwrdrvr.com',
      removalPolicy: RemovalPolicy.DESTROY,
      r53Zone,
      certOrigin,
      rootPathPrefix: '/myprefix/',
    });

    expect(construct).toBeDefined();
    expect(construct.dnAppsOrigin).toBeDefined();
    expect(construct.httpApi).toBeDefined();
    expect(construct.node).toBeDefined();

    expect(app.synth().getStackArtifact(stack.artifactId).template).toMatchSnapshot();
  });
});
