/// <reference types="jest" />
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as r53 from 'aws-cdk-lib/aws-route53';
import { MicroApps } from '../src/MicroApps';

describe('MicroApps', () => {
  it('works with no params', () => {
    const app = new App({});
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
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it('works with only edge params', () => {
    const app = new App({});
    const stack = new Stack(app, 'stack');
    const certEdge = new acm.Certificate(stack, 'cert', {
      domainName: '*.test.pwrdrvr.com',
    });
    const r53Zone = new r53.HostedZone(stack, 'zone', {
      zoneName: 'test.pwrdrvr.com',
    });
    const construct = new MicroApps(stack, 'construct', {
      appEnv: 'dev',
      domainNameEdge: 'mydeploy.test.pwrdrvr.com',
      certEdge,
      certOrigin: certEdge,
      r53Zone,
    });

    expect(construct).toBeDefined();
    expect(construct.apigwy).toBeDefined();
    expect(construct.cf).toBeDefined();
    expect(construct.s3).toBeDefined();
    expect(construct.svcs).toBeDefined();

    expect(construct.node).toBeDefined();
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });
});
