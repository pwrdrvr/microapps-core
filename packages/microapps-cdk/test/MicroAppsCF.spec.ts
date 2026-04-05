/// <reference types="jest" />
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cf from 'aws-cdk-lib/aws-cloudfront';
import * as cforigins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as r53 from 'aws-cdk-lib/aws-route53';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { MicroAppsCF } from '../src/MicroAppsCF';

describe('MicroAppsCF', () => {
  it('works with no params', () => {
    const app = new App({});
    const stack = new Stack(app, 'stack', {
      env: {
        region: 'us-east-1',
      },
    });

    const bucket = new s3.Bucket(stack, 'bucket-apps', {});
    const oai = new cf.OriginAccessIdentity(stack, 'oai', {});
    const construct = new MicroAppsCF(stack, 'construct', {
      bucketAppsOriginApp: new cforigins.S3Origin(bucket, {
        customHeaders: {
          'x-microapps-origin': 'app',
        },
        originAccessIdentity: oai,
      }),
      bucketAppsOriginS3: new cforigins.S3Origin(bucket, {
        customHeaders: {
          'x-microapps-origin': 's3',
        },
        originAccessIdentity: oai,
      }),
    });

    expect(construct).toBeDefined();
    expect(construct.cloudFrontDistro).toBeDefined();
    expect(construct.node).toBeDefined();

    Template.fromStack(stack).resourceCountIs('AWS::CloudFront::Distribution', 1);
  });

  it('works with params', () => {
    const app = new App({});
    const stack = new Stack(app, 'stack', {
      env: {
        region: 'us-east-1',
      },
    });
    const r53Zone = new r53.HostedZone(stack, 'zone', {
      zoneName: 'test.pwrdrvr.com',
    });
    const certOrigin = new acm.Certificate(stack, 'cert', {
      domainName: '*.test.pwrdrvr.com',
    });
    const bucket = new s3.Bucket(stack, 'bucket-apps', {});
    const oai = new cf.OriginAccessIdentity(stack, 'oai', {});
    const construct = new MicroAppsCF(stack, 'construct', {
      bucketAppsOriginApp: new cforigins.S3Origin(bucket, {
        customHeaders: {
          'x-microapps-origin': 'app',
        },
        originAccessIdentity: oai,
      }),
      bucketAppsOriginS3: new cforigins.S3Origin(bucket, {
        customHeaders: {
          'x-microapps-origin': 's3',
        },
        originAccessIdentity: oai,
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
    // expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();

    Template.fromStack(stack).resourceCountIs('AWS::CloudFront::Distribution', 1);
    Template.fromStack(stack).resourceCountIs('AWS::CloudFront::OriginRequestPolicy', 0);
  });

  it('adds allow-all app behaviors for API and Next data routes by default', () => {
    const app = new App({});
    const stack = new Stack(app, 'stack', {
      env: {
        region: 'us-east-1',
      },
    });

    const bucket = new s3.Bucket(stack, 'bucket-apps', {});
    const oai = new cf.OriginAccessIdentity(stack, 'oai', {});

    new MicroAppsCF(stack, 'construct', {
      bucketAppsOriginApp: new cforigins.S3Origin(bucket, {
        customHeaders: {
          'x-microapps-origin': 'app',
        },
        originAccessIdentity: oai,
      }),
      bucketAppsOriginS3: new cforigins.S3Origin(bucket, {
        customHeaders: {
          'x-microapps-origin': 's3',
        },
        originAccessIdentity: oai,
      }),
    });

    Template.fromStack(stack).hasResourceProperties(
      'AWS::CloudFront::Distribution',
      Match.objectLike({
        DistributionConfig: Match.objectLike({
          CacheBehaviors: Match.arrayWith([
            Match.objectLike({
              PathPattern: '*/api/*',
              AllowedMethods: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'PATCH', 'POST', 'DELETE'],
            }),
            Match.objectLike({
              PathPattern: '*/_next/data/*',
              AllowedMethods: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'PATCH', 'POST', 'DELETE'],
            }),
          ]),
        }),
      }),
    );
  });

  it('can disable the special API and Next data app behaviors', () => {
    const app = new App({});
    const stack = new Stack(app, 'stack', {
      env: {
        region: 'us-east-1',
      },
    });

    const bucket = new s3.Bucket(stack, 'bucket-apps', {});
    const oai = new cf.OriginAccessIdentity(stack, 'oai', {});

    new MicroAppsCF(stack, 'construct', {
      bucketAppsOriginApp: new cforigins.S3Origin(bucket, {
        customHeaders: {
          'x-microapps-origin': 'app',
        },
        originAccessIdentity: oai,
      }),
      bucketAppsOriginS3: new cforigins.S3Origin(bucket, {
        customHeaders: {
          'x-microapps-origin': 's3',
        },
        originAccessIdentity: oai,
      }),
      createAPIPathRoute: false,
      createNextDataPathRoute: false,
    });

    const templateJson = Template.fromStack(stack).toJSON();
    const distributions = Object.values(
      templateJson.Resources as Record<string, { Type: string; Properties?: { DistributionConfig?: { CacheBehaviors?: Array<{ PathPattern?: string }> } } }>
    ).filter((resource) => resource.Type === 'AWS::CloudFront::Distribution');

    expect(distributions).toHaveLength(1);

    const pathPatterns =
      distributions[0].Properties?.DistributionConfig?.CacheBehaviors?.map(
        (behavior) => behavior.PathPattern,
      ) ?? [];

    expect(pathPatterns).not.toContain('*/api/*');
    expect(pathPatterns).not.toContain('*/_next/data/*');
  });
});
