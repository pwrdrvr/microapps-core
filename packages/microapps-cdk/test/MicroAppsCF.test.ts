/// <reference types="jest" />
import * as apigwy from '@aws-cdk/aws-apigatewayv2-alpha';
// import * as apigwycfn from 'aws-cdk-lib/aws-apigatewayv2';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cf from 'aws-cdk-lib/aws-cloudfront';
import * as cforigins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as r53 from 'aws-cdk-lib/aws-route53';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { MicroAppsCF } from '../src/MicroAppsCF';

describe('MicroAppsCF', () => {
  // beforeAll(() => {
  //   process.env.AWS_REGION = 'us-east-2';
  // });

  describe('generateEdgeToOriginConfig', () => {
    it('skips signing param', () => {
      const config = MicroAppsCF.generateEdgeToOriginConfig({
        signingMode: '',
        addXForwardedHostHeader: true,
        replaceHostHeader: true,
        originRegion: 'us-west-1',
      });

      expect(config).toBeDefined();
      expect(config).not.toContain('signingMode:');
      expect(config).toContain('addXForwardedHostHeader: true');
      expect(config).toContain('replaceHostHeader: true');
      expect(config).toContain('originRegion: us-west-1');
    });

    it('skips signing param', () => {
      const config = MicroAppsCF.generateEdgeToOriginConfig({
        signingMode: 'sign',
        addXForwardedHostHeader: false,
        replaceHostHeader: false,
        originRegion: 'us-west-1',
      });

      expect(config).toBeDefined();
      expect(config).toContain('signingMode: sign');
      expect(config).toContain('addXForwardedHostHeader: false');
      expect(config).toContain('replaceHostHeader: false');
      expect(config).toContain('originRegion: us-west-1');
    });
  });

  it('works with no params', () => {
    const app = new App({});
    const stack = new Stack(app, 'stack', {
      env: {
        region: 'us-east-1',
      },
    });

    const httpApi = new apigwy.HttpApi(stack, 'httpapi', {
      apiName: 'some-api',
      // defaultDomainMapping: {
      //   domainName: new apigwy.DomainName(stack, 'domain-name', {
      //     domainName: 'apps.pwrdrvr.com',
      //     certificate: new acm.Certificate(stack, 'cert', {
      //       domainName: 'apps.pwrdrvr.com',
      //     }),
      //   }),
      // },
    });
    const construct = new MicroAppsCF(stack, 'construct', {
      httpApi,
      bucketAppsOrigin: new cforigins.S3Origin(new s3.Bucket(stack, 'bucket-apps', {}), {
        originAccessIdentity: new cf.OriginAccessIdentity(stack, 'oai', {}),
      }),
    });

    expect(construct).toBeDefined();
    expect(construct.cloudFrontDistro).toBeDefined();
    expect(construct.node).toBeDefined();
    // expect(stack).toHaveResource('AWS::S3::Bucket');
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();

    Template.fromStack(stack).resourceCountIs('AWS::CloudFront::Distribution', 1);
    Template.fromStack(stack).resourceCountIs('AWS::CloudFront::OriginRequestPolicy', 1);
  });

  it('works with params', () => {
    const app = new App({});
    const stack = new Stack(app, 'stack', {
      env: {
        region: 'us-east-1',
      },
    });
    const httpApi = new apigwy.HttpApi(stack, 'httpapi', {
      apiName: 'some-api',
      // defaultDomainMapping: {
      //   domainName: new apigwy.DomainName(stack, 'domain-name', {
      //     domainName: 'apps.pwrdrvr.com',
      //     certificate: new acm.Certificate(stack, 'cert', {
      //       domainName: 'apps.pwrdrvr.com',
      //     }),
      //   }),
      // },
    });
    const r53Zone = new r53.HostedZone(stack, 'zone', {
      zoneName: 'test.pwrdrvr.com',
    });
    const certOrigin = new acm.Certificate(stack, 'cert', {
      domainName: '*.test.pwrdrvr.com',
    });
    const construct = new MicroAppsCF(stack, 'construct', {
      httpApi,
      bucketAppsOrigin: new cforigins.S3Origin(new s3.Bucket(stack, 'bucket-apps', {}), {
        originAccessIdentity: new cf.OriginAccessIdentity(stack, 'oai', {}),
      }),
      domainNameEdge: 'some.test.pwrdrvr.com',
      domainNameOrigin: 'some-origin.test.pwrdvr.com',
      certEdge: certOrigin,
      r53Zone,
    });

    expect(construct).toBeDefined();
    expect(construct.cloudFrontDistro).toBeDefined();
    expect(construct.node).toBeDefined();
    // expect(stack).toHaveResource('AWS::S3::Bucket');
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();

    Template.fromStack(stack).resourceCountIs('AWS::CloudFront::Distribution', 1);
    Template.fromStack(stack).resourceCountIs('AWS::CloudFront::OriginRequestPolicy', 0);
  });
});
