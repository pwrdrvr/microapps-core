import { describe, it } from 'mocha';
import * as chai from 'chai';
import * as s3 from '@aws-sdk/client-s3';
import * as apigwy from '@aws-sdk/client-apigatewayv2';
import * as lambda from '@aws-sdk/client-lambda';
import { mockClient, AwsClientStub } from 'aws-sdk-client-mock';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import {
  handler,
  ICheckVersionExistsRequest,
  ICreateApplicationRequest,
  IDeployVersionRequest,
} from '../index';
import Manager, { Version } from '@pwrdrvr/microapps-datalib';
import { dynamoClient, InitializeTable, DropTable, TEST_TABLE_NAME } from '../../../fixtures';
import type * as lambdaTypes from 'aws-lambda';

chai.use(sinonChai);
chai.use(chaiAsPromised);

const { expect } = chai;

let s3Client: AwsClientStub<s3.S3Client>;
let apigwyClient: AwsClientStub<apigwy.ApiGatewayV2Client>;
let lambdaClient: AwsClientStub<lambda.LambdaClient>;

describe('VersionController', () => {
  let sandbox: sinon.SinonSandbox;

  before(async () => {
    new Manager({ dynamoDB: dynamoClient.client, tableName: TEST_TABLE_NAME });
  });

  beforeEach(async () => {
    // Create the table
    await InitializeTable();

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
    apigwyClient = mockClient(apigwy.ApiGatewayV2Client);
    lambdaClient = mockClient(lambda.LambdaClient);
  });

  afterEach(async () => {
    await DropTable();
    sandbox.restore();
    s3Client.restore();
    apigwyClient.restore();
    lambdaClient.restore();
  });

  describe('checkVersionExists', () => {
    it('should return 404 for version that does not exist', async () => {
      const response = await handler(
        {
          appName: 'NewApp',
          semVer: '0.0.0',
          type: 'checkVersionExists',
        } as ICheckVersionExistsRequest,
        { awsRequestId: '123' } as lambdaTypes.Context,
      );
      expect(response.statusCode).to.equal(404);
    });

    it('should return 200 for version that exists', async () => {
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
      await version.SaveAsync(dynamoClient.ddbDocClient);

      const response = await handler(
        {
          appName: 'NewApp',
          semVer: '0.0.0',
          type: 'checkVersionExists',
        } as ICheckVersionExistsRequest,
        { awsRequestId: '123' } as lambdaTypes.Context,
      );
      expect(response.statusCode).to.equal(200);
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
          s3SourceURI: 's3://pwrdrvr-apps-staging/newapp/0.0.0/',
          type: 'deployVersion',
        } as IDeployVersionRequest,
        { awsRequestId: '123' } as lambdaTypes.Context,
      );
      expect(response.statusCode).to.equal(201);
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
          s3SourceURI: 's3://pwrdrvr-apps-staging/newapp/0.0.0/',
          type: 'deployVersion',
        } as IDeployVersionRequest,
        { awsRequestId: '123' } as lambdaTypes.Context,
      );
      expect(response.statusCode).to.equal(201);
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
      await version.SaveAsync(dynamoClient.ddbDocClient);

      const response = await handler(
        {
          appName: 'NewApp',
          semVer: '0.0.0',
          defaultFile: 'index.html',
          lambdaARN: fakeLambdaARN,
          s3SourceURI: 's3://pwrdrvr-apps-staging/newapp/0.0.0/',
          type: 'deployVersion',
        } as IDeployVersionRequest,
        { awsRequestId: '123' } as lambdaTypes.Context,
      );
      expect(response.statusCode).to.equal(409);
    });
  });
});
