/// <reference types="jest" />
import { App, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as r53 from 'aws-cdk-lib/aws-route53';
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

    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
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

    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });
});