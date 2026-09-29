/// <reference types="jest" />
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cf from 'aws-cdk-lib/aws-cloudfront';
import * as cforigins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as r53 from 'aws-cdk-lib/aws-route53';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { MicroAppsCF } from '../src/MicroAppsCF';

type DistributionResource = {
  Type: string;
  Properties?: {
    DistributionConfig?: {
      CacheBehaviors?: Array<{ PathPattern?: string }>;
    };
  };
};

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
      bucketAppsOriginApp: cforigins.S3BucketOrigin.withOriginAccessIdentity(bucket, {
        customHeaders: {
          'x-microapps-origin': 'app',
        },
        originAccessIdentity: oai,
      }),
      bucketAppsOriginS3: cforigins.S3BucketOrigin.withOriginAccessIdentity(bucket, {
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
      bucketAppsOriginApp: cforigins.S3BucketOrigin.withOriginAccessIdentity(bucket, {
        customHeaders: {
          'x-microapps-origin': 'app',
        },
        originAccessIdentity: oai,
      }),
      bucketAppsOriginS3: cforigins.S3BucketOrigin.withOriginAccessIdentity(bucket, {
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
      bucketAppsOriginApp: cforigins.S3BucketOrigin.withOriginAccessIdentity(bucket, {
        customHeaders: {
          'x-microapps-origin': 'app',
        },
        originAccessIdentity: oai,
      }),
      bucketAppsOriginS3: cforigins.S3BucketOrigin.withOriginAccessIdentity(bucket, {
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
      bucketAppsOriginApp: cforigins.S3BucketOrigin.withOriginAccessIdentity(bucket, {
        customHeaders: {
          'x-microapps-origin': 'app',
        },
        originAccessIdentity: oai,
      }),
      bucketAppsOriginS3: cforigins.S3BucketOrigin.withOriginAccessIdentity(bucket, {
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
      templateJson.Resources as Record<string, DistributionResource>,
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

it('disables on-demand compression while varying asset cache entries by the full Accept-Encoding header', () => {
  const app = new App();
  const stack = new Stack(app, 'compression-stack');
  const origin = new cforigins.HttpOrigin('example.com');
  new MicroAppsCF(stack, 'compression', {
    bucketAppsOriginApp: origin,
    bucketAppsOriginS3: origin,
    precompressedAssets: true,
    automaticCompression: false,
  });
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::CloudFront::CachePolicy', {
    CachePolicyConfig: Match.objectLike({
      MinTTL: 0,
      ParametersInCacheKeyAndForwardedToOrigin: Match.objectLike({
        EnableAcceptEncodingBrotli: false,
        EnableAcceptEncodingGzip: false,
        HeadersConfig: { HeaderBehavior: 'whitelist', Headers: ['x-microapps-accept-encoding'] },
      }),
    }),
  });
  template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
    ResponseHeadersPolicyConfig: Match.objectLike({
      CustomHeadersConfig: {
        Items: [{ Header: 'Vary', Value: 'Accept-Encoding', Override: false }],
      },
    }),
  });
  const distribution = Object.values(template.findResources('AWS::CloudFront::Distribution'))[0]
    .Properties.DistributionConfig;
  expect(distribution.DefaultCacheBehavior.Compress).toBe(false);
  expect(
    distribution.CacheBehaviors.every((behavior: { Compress: boolean }) => !behavior.Compress),
  ).toBe(true);
  expect(
    distribution.CacheBehaviors.find(
      (behavior: { PathPattern: string }) => behavior.PathPattern === '*/static/*.*',
    ).ResponseHeadersPolicyId,
  ).toBeDefined();
});

it.each([undefined, true, false])(
  'supports migration with automaticCompression=%s in two sibling distributions',
  (automaticCompression) => {
    const app = new App();
    const stack = new Stack(app, 'siblings');
    for (const id of ['first', 'second']) {
      new MicroAppsCF(stack, id, {
        bucketAppsOriginApp: new cforigins.HttpOrigin('app.example.com'),
        bucketAppsOriginS3: new cforigins.HttpOrigin('assets.example.com'),
        precompressedAssets: true,
        automaticCompression,
      });
    }
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::CloudFront::Distribution', 2);
    template.resourceCountIs('AWS::CloudFront::ResponseHeadersPolicy', 2);
    template.resourceCountIs('AWS::CloudFront::CachePolicy', 2);
    template.resourceCountIs('AWS::CloudFront::Function', 2);
    for (const policy of Object.values(template.findResources('AWS::CloudFront::CachePolicy'))) {
      expect(
        policy.Properties.CachePolicyConfig.ParametersInCacheKeyAndForwardedToOrigin,
      ).toMatchObject({
        EnableAcceptEncodingBrotli: automaticCompression ?? true,
        EnableAcceptEncodingGzip: automaticCompression ?? true,
        HeadersConfig: { Headers: ['x-microapps-accept-encoding'] },
      });
    }
    for (const distribution of Object.values(
      template.findResources('AWS::CloudFront::Distribution'),
    )) {
      const behaviors = distribution.Properties.DistributionConfig.CacheBehaviors;
      for (const pattern of ['*/static/*.*', '*/*.*']) {
        expect(
          behaviors.find((behavior: { PathPattern: string }) => behavior.PathPattern === pattern),
        ).toMatchObject({
          Compress: automaticCompression ?? true,
          FunctionAssociations: [{ EventType: 'viewer-request', FunctionARN: expect.anything() }],
        });
      }
    }
    expect(() => app.synth()).not.toThrow();
  },
);
