/// <reference types="jest" />
import '@aws-cdk/assert/jest';
import * as apigwy from '@aws-cdk/aws-apigatewayv2';
import * as cf from '@aws-cdk/aws-cloudfront';
import * as cforigins from '@aws-cdk/aws-cloudfront-origins';
import * as s3 from '@aws-cdk/aws-s3';
import { App, Stack } from '@aws-cdk/core';
import { MicroAppsSvcs } from '../src/MicroAppsSvcs';

describe('MicroAppsSvcs', () => {
  const app = new App({});

  it('works with no params', () => {
    const stack = new Stack(app, 'stack');
    const bucketAppsOAI = new cf.OriginAccessIdentity(stack, 'oai', {});
    const bucketApps = new s3.Bucket(stack, 'bucket-apps', {});
    const bucketAppsStaging = new s3.Bucket(stack, 'bucket-apps-staging', {});
    const httpApi = new apigwy.HttpApi(stack, 'httpapi', {
      apiName: 'some-api',
    });
    const construct = new MicroAppsSvcs(stack, 'construct', {
      appEnv: 'dev',
      bucketApps,
      bucketAppsOAI,
      bucketAppsStaging,
      httpApi,
    });

    expect(construct).toBeDefined();
    expect(construct.table).toBeDefined();

    const template = app.synth().getStackArtifact(stack.artifactId).template;
    expect(template).toHaveResource('AWS::Lambda::Function');
  });
});
