/// <reference types="jest" />
import '@aws-cdk/assert/jest';
import * as apigwy from '@aws-cdk/aws-apigatewayv2';
import * as cf from '@aws-cdk/aws-cloudfront';
import * as cforigins from '@aws-cdk/aws-cloudfront-origins';
import * as s3 from '@aws-cdk/aws-s3';
import { App, Stack } from '@aws-cdk/core';
import { MicroAppsCF } from '../src/MicroAppsCF';

describe('MicroAppsCF', () => {
  const app = new App({});

  it('works with no params', () => {
    const stack = new Stack(app, 'stack');
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
    expect(app.synth().getStackArtifact(stack.artifactId).template).toMatchSnapshot();

    const template = app.synth().getStackArtifact(stack.artifactId).template;
    expect(template).toHaveResource('AWS::CloudFront::Distribution');
  });
});
