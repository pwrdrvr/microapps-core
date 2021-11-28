/// <reference types="jest" />
import 'jest-dynalite/withDb';
import 'reflect-metadata';
import * as apigwy from '@aws-sdk/client-apigatewayv2';
import * as dynamodb from '@aws-sdk/client-dynamodb';
import * as lambda from '@aws-sdk/client-lambda';
import * as s3 from '@aws-sdk/client-s3';
import * as sts from '@aws-sdk/client-sts';

import {
  IDeployVersionPreflightRequest,
  ICreateApplicationRequest,
  IDeployVersionRequest,
} from '@pwrdrvr/microapps-deployer-lib';
import { DBManager, Version } from '@pwrdrvr/microapps-datalib';
import type * as lambdaTypes from 'aws-lambda';
import { mockClient, AwsClientStub } from 'aws-sdk-client-mock';
import sinon from 'sinon';
import { Config } from '../config/Config';
import { handler, overrideDBManager } from '../index';

let s3Client: AwsClientStub<s3.S3Client>;
let stsClient: AwsClientStub<sts.STSClient>;
let apigwyClient: AwsClientStub<apigwy.ApiGatewayV2Client>;
let lambdaClient: AwsClientStub<lambda.LambdaClient>;
let dynamoClient: dynamodb.DynamoDBClient;
let dbManager: DBManager;

const TEST_TABLE_NAME = 'microapps';

describe('VersionController', () => {
  let sandbox: sinon.SinonSandbox;

  beforeAll(() => {
    dynamoClient = new dynamodb.DynamoDBClient({
      endpoint: process.env.MOCK_DYNAMODB_ENDPOINT,
      tls: false,
      region: 'local',
    });

    // Load the config files
    Config.instance.filestore.stagingBucket = 'pwrdrvr-apps-staging';
    // Init the DB manager to point it at the right table
    dbManager = new DBManager({ dynamoClient, tableName: TEST_TABLE_NAME });
  });

  beforeEach(async () => {
    overrideDBManager({ dbManager, dynamoClient });

    // Create a test app
    await handler(
      {
        appName: 'NewApp',
        displayName: 'NewDisplayName',
        type: 'createApp',
      } as ICreateApplicationRequest,
      { awsRequestId: '123' } as lambdaTypes.Context,
    );

    sandbox = sinon.createSandbox();
    s3Client = mockClient(s3.S3Client);
    stsClient = mockClient(sts.STSClient);
    apigwyClient = mockClient(apigwy.ApiGatewayV2Client);
    lambdaClient = mockClient(lambda.LambdaClient);
  });

  afterEach(() => {
    sandbox.restore();
    s3Client.restore();
    apigwyClient.restore();
    lambdaClient.restore();
  });

  describe('deployVersionPreflight', () => {
    it('should return 404 for version that does not exist', async () => {
      stsClient.on(sts.AssumeRoleCommand).resolves({
        Credentials: {
          AccessKeyId: 'cat',
          SecretAccessKey: 'dog',
          SessionToken: 'frog',
          Expiration: new Date(),
        },
      });

      const response = await handler(
        {
          appName: 'NewApp',
          semVer: '0.0.0',
          type: 'deployVersionPreflight',
        } as IDeployVersionPreflightRequest,
        { awsRequestId: '123' } as lambdaTypes.Context,
      );
      expect(response.statusCode).toBe(404);
    });

    it('should return 200 for version that exists', async () => {
      stsClient.on(sts.AssumeRoleCommand).resolves({
        Credentials: {
          AccessKeyId: 'cat',
          SecretAccessKey: 'dog',
          SessionToken: 'frog',
          Expiration: new Date(),
        },
      });

      const version = new Version({
        AppName: 'NewApp',
        DefaultFile: '',
        IntegrationID: '',
        SemVer: '0.0.0',
        // Note: Pending is reported as "does not exist"
        // So don't set this to pending or the test will fail
        Status: 'integrated',
        Type: 'lambda',
      });
      await version.Save(dbManager);

      const response = await handler(
        {
          appName: 'NewApp',
          semVer: '0.0.0',
          type: 'deployVersionPreflight',
        } as IDeployVersionPreflightRequest,
        { awsRequestId: '123' } as lambdaTypes.Context,
      );
      expect(response.statusCode).toBe(200);
    });
  });

  describe('deployVersion', () => {
    const fakeLambdaARN = 'arn:aws:lambda:us-east-2:123456789:function:new-app-function';

    it('should return 201 for deploying version that does not exist', async () => {
      const fakeAPIID = '123';
      const fakeIntegrationID = 'abc123integrationID';
      const appName = 'newapp';
      const semVer = '0.0.0';

      s3Client
        // Mock S3 get for staging bucket - return one file name
        .on(s3.ListObjectsV2Command, {
          Bucket: 'pwrdrvr-apps-staging',
          Prefix: `${appName}/${semVer}/`,
        })
        .resolves({
          IsTruncated: false,
          Contents: [{ Key: `${appName}/${semVer}/index.html` }],
        })
        // Mock S3 copy to prod bucket
        .on(s3.CopyObjectCommand, {
          Bucket: 'pwrdrvr-apps',
          CopySource: `pwrdrvr-apps-staging/${appName}/${semVer}/index.html`,
          Key: `${appName}/${semVer}/index.html`,
        })
        .resolves({});
      apigwyClient
        // Mock Lambda Get request to return success for ARN
        .on(apigwy.GetApisCommand, {
          MaxResults: '100',
        })
        .resolves({
          Items: [
            {
              Name: 'microapps-apis',
              ApiId: fakeAPIID,
              ProtocolType: 'HTTP',
            } as apigwy.Api,
          ],
        });
      lambdaClient
        // Mock permission removes - these can fail
        .on(lambda.RemovePermissionCommand)
        .rejects()
        // Mock permission add for version root
        .on(lambda.AddPermissionCommand, {
          Principal: 'apigateway.amazonaws.com',
          StatementId: 'microapps-version-root',
          Action: 'lambda:InvokeFunction',
          FunctionName: fakeLambdaARN,
          SourceArn: `arn:aws:execute-api:us-east-2:123456789:${fakeAPIID}/*/*/${appName}/${semVer}`,
        })
        .resolves({})
        // Mock permission add for version/*
        .on(lambda.AddPermissionCommand, {
          Principal: 'apigateway.amazonaws.com',
          StatementId: 'microapps-version',
          Action: 'lambda:InvokeFunction',
          FunctionName: fakeLambdaARN,
          SourceArn: `arn:aws:execute-api:us-east-2:123456789:${fakeAPIID}/*/*/${appName}/${semVer}/{proxy+}`,
        })
        .resolves({});

      apigwyClient
        // Mock API Gateway Integration Create for Version
        .on(apigwy.CreateIntegrationCommand, {
          ApiId: fakeAPIID,
          IntegrationType: apigwy.IntegrationType.AWS_PROXY,
          IntegrationMethod: 'POST',
          PayloadFormatVersion: '2.0',
          IntegrationUri: fakeLambdaARN,
        })
        .resolves({
          IntegrationId: fakeIntegrationID,
        })
        // Mock create route - this might fail
        .on(apigwy.CreateRouteCommand, {
          ApiId: fakeAPIID,
          Target: `integrations/${fakeIntegrationID}`,
          RouteKey: `ANY /${appName}/${semVer}`,
        })
        .resolves({})
        // Mock create route for /*
        .on(apigwy.CreateRouteCommand, {
          ApiId: fakeAPIID,
          Target: `integrations/${fakeIntegrationID}`,
          RouteKey: `ANY /${appName}/${semVer}/{proxy+}`,
        })
        .resolves({});

      const response = await handler(
        {
          appName: 'NewApp',
          semVer: '0.0.0',
          defaultFile: 'index.html',
          lambdaARN: fakeLambdaARN,
          type: 'deployVersion',
        } as IDeployVersionRequest,
        { awsRequestId: '123' } as lambdaTypes.Context,
      );
      expect(response.statusCode).toBe(201);
    });

    it('should return 201 for deploying version that does not exist, with continuations', async () => {
      const fakeAPIID = '123';
      const fakeIntegrationID = 'abc123integrationID';
      const appName = 'newapp';
      const semVer = '0.0.0';

      s3Client
        // Mock S3 get for staging bucket - return one file name
        .on(s3.ListObjectsV2Command, {
          Bucket: 'pwrdrvr-apps-staging',
          Prefix: `${appName}/${semVer}/`,
        })
        .resolves({
          IsTruncated: true,
          NextContinuationToken: 'nothing-to-see-here-yet',
        })
        .on(s3.ListObjectsV2Command, {
          ContinuationToken: 'nothing-to-see-here-yet',
          Bucket: 'pwrdrvr-apps-staging',
          Prefix: `${appName}/${semVer}/`,
        })
        .resolves({
          IsTruncated: false,
          Contents: [{ Key: `${appName}/${semVer}/index.html` }],
        })
        // Mock S3 copy to prod bucket
        .on(s3.CopyObjectCommand, {
          Bucket: 'pwrdrvr-apps',
          CopySource: `pwrdrvr-apps-staging/${appName}/${semVer}/index.html`,
          Key: `${appName}/${semVer}/index.html`,
        })
        .resolves({});
      apigwyClient
        // Mock Lambda Get request to return success for ARN
        .on(apigwy.GetApisCommand, {
          MaxResults: '100',
        })
        .resolves({
          NextToken: 'nothing-to-see-here-yet',
        })
        .on(apigwy.GetApisCommand, {
          MaxResults: '100',
          NextToken: 'nothing-to-see-here-yet',
        })
        .resolves({
          Items: [
            {
              Name: 'microapps-apis',
              ApiId: fakeAPIID,
              ProtocolType: 'HTTP',
            } as apigwy.Api,
          ],
        });
      lambdaClient
        // Mock permission removes - these can fail
        .on(lambda.RemovePermissionCommand)
        .rejects()
        // Mock permission add for version root
        .on(lambda.AddPermissionCommand, {
          Principal: 'apigateway.amazonaws.com',
          StatementId: 'microapps-version-root',
          Action: 'lambda:InvokeFunction',
          FunctionName: fakeLambdaARN,
          SourceArn: `arn:aws:execute-api:us-east-2:123456789:${fakeAPIID}/*/*/${appName}/${semVer}`,
        })
        .resolves({})
        // Mock permission add for version/*
        .on(lambda.AddPermissionCommand, {
          Principal: 'apigateway.amazonaws.com',
          StatementId: 'microapps-version',
          Action: 'lambda:InvokeFunction',
          FunctionName: fakeLambdaARN,
          SourceArn: `arn:aws:execute-api:us-east-2:123456789:${fakeAPIID}/*/*/${appName}/${semVer}/{proxy+}`,
        })
        .resolves({});

      apigwyClient
        // Mock API Gateway Integration Create for Version
        .on(apigwy.CreateIntegrationCommand, {
          ApiId: fakeAPIID,
          IntegrationType: apigwy.IntegrationType.AWS_PROXY,
          IntegrationMethod: 'POST',
          PayloadFormatVersion: '2.0',
          IntegrationUri: fakeLambdaARN,
        })
        .resolves({
          IntegrationId: fakeIntegrationID,
        })
        // Mock create route - this might fail
        .on(apigwy.CreateRouteCommand, {
          ApiId: fakeAPIID,
          Target: `integrations/${fakeIntegrationID}`,
          RouteKey: `ANY /${appName}/${semVer}`,
        })
        .resolves({})
        // Mock create route for /*
        .on(apigwy.CreateRouteCommand, {
          ApiId: fakeAPIID,
          Target: `integrations/${fakeIntegrationID}`,
          RouteKey: `ANY /${appName}/${semVer}/{proxy+}`,
        })
        .resolves({});

      const response = await handler(
        {
          appName: 'NewApp',
          semVer: '0.0.0',
          defaultFile: 'index.html',
          lambdaARN: fakeLambdaARN,
          type: 'deployVersion',
        } as IDeployVersionRequest,
        { awsRequestId: '123' } as lambdaTypes.Context,
      );
      expect(response.statusCode).toBe(201);
    });

    it('should 409 version that exists with "routed" status', async () => {
      const version = new Version({
        AppName: 'NewApp',
        DefaultFile: '',
        IntegrationID: '',
        SemVer: '0.0.0',
        Status: 'routed',
        Type: 'lambda',
      });
      await version.Save(dbManager);

      const response = await handler(
        {
          appName: 'NewApp',
          semVer: '0.0.0',
          defaultFile: 'index.html',
          lambdaARN: fakeLambdaARN,
          type: 'deployVersion',
        } as IDeployVersionRequest,
        { awsRequestId: '123' } as lambdaTypes.Context,
      );
      expect(response.statusCode).toBe(409);
    });

    it('should return 401 for deploying version with lack of apigwy permission', async () => {
      const fakeAPIID = '123';
      const fakeIntegrationID = 'abc123integrationID';
      const appName = 'newapp';
      const semVer = '0.0.0';

      s3Client
        // Mock S3 get for staging bucket - return one file name
        .on(s3.ListObjectsV2Command, {
          Bucket: 'pwrdrvr-apps-staging',
          Prefix: `${appName}/${semVer}/`,
        })
        .resolves({
          IsTruncated: false,
          Contents: [{ Key: `${appName}/${semVer}/index.html` }],
        })
        // Mock S3 copy to prod bucket
        .on(s3.CopyObjectCommand, {
          Bucket: 'pwrdrvr-apps',
          CopySource: `pwrdrvr-apps-staging/${appName}/${semVer}/index.html`,
          Key: `${appName}/${semVer}/index.html`,
        })
        .resolves({});
      apigwyClient
        // Mock Lambda Get request to return success for ARN
        .on(apigwy.GetApisCommand, {
          MaxResults: '100',
        })
        .resolves({
          Items: [
            {
              Name: 'microapps-apis',
              ApiId: fakeAPIID,
              ProtocolType: 'HTTP',
            } as apigwy.Api,
          ],
        });
      lambdaClient
        // Mock permission removes - these can fail
        .on(lambda.RemovePermissionCommand)
        .rejects()
        // Mock permission add for version root
        .on(lambda.AddPermissionCommand, {
          Principal: 'apigateway.amazonaws.com',
          StatementId: 'microapps-version-root',
          Action: 'lambda:InvokeFunction',
          FunctionName: fakeLambdaARN,
          SourceArn: `arn:aws:execute-api:us-east-2:123456789:${fakeAPIID}/*/*/${appName}/${semVer}`,
        })
        .resolves({})
        // Mock permission add for version/*
        .on(lambda.AddPermissionCommand, {
          Principal: 'apigateway.amazonaws.com',
          StatementId: 'microapps-version',
          Action: 'lambda:InvokeFunction',
          FunctionName: fakeLambdaARN,
          SourceArn: `arn:aws:execute-api:us-east-2:123456789:${fakeAPIID}/*/*/${appName}/${semVer}/{proxy+}`,
        })
        .resolves({});

      apigwyClient
        // Mock API Gateway Integration Create for Version
        .on(apigwy.CreateIntegrationCommand, {
          ApiId: fakeAPIID,
          IntegrationType: apigwy.IntegrationType.AWS_PROXY,
          IntegrationMethod: 'POST',
          PayloadFormatVersion: '2.0',
          IntegrationUri: fakeLambdaARN,
        })
        .rejects({
          name: 'AccessDeniedException',
          message: `User: arn:aws:sts::1234567890123:assumed-role/some-role-name/microapps-deployer-dev is not authorized to perform: apigateway:POST on resource: arn:aws:apigateway:us-east-2::/apis/${fakeAPIID}/integrations`,
        })
        // Mock create route - this might fail
        .on(apigwy.CreateRouteCommand, {
          ApiId: fakeAPIID,
          Target: `integrations/${fakeIntegrationID}`,
          RouteKey: `ANY /${appName}/${semVer}`,
        })
        .resolves({})
        // Mock create route for /*
        .on(apigwy.CreateRouteCommand, {
          ApiId: fakeAPIID,
          Target: `integrations/${fakeIntegrationID}`,
          RouteKey: `ANY /${appName}/${semVer}/{proxy+}`,
        })
        .resolves({});

      const response = await handler(
        {
          appName: 'NewApp',
          semVer: '0.0.0',
          defaultFile: 'index.html',
          lambdaARN: fakeLambdaARN,
          type: 'deployVersion',
        } as IDeployVersionRequest,
        { awsRequestId: '123' } as lambdaTypes.Context,
      );
      expect(response.statusCode).toBe(401);
    });
  });
});
