/// <reference types="jest" />
import '@aws-cdk/assert/jest';
import * as apigwy from '@aws-cdk/aws-apigatewayv2-alpha';
// import * as apigwycfn from 'aws-cdk-lib/aws-apigatewayv2';
import { App, Stack } from 'aws-cdk-lib';
import * as cf from 'aws-cdk-lib/aws-cloudfront';
import * as s3 from 'aws-cdk-lib/aws-s3';
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
