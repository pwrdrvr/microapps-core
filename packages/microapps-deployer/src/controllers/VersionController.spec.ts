/// <reference types="jest" />
import 'reflect-metadata';
import 'jest-dynalite/withDb';
import { Config, IConfig } from '../config/Config';
jest.mock('../config/Config');
Object.defineProperty(Config, 'instance', {
  configurable: false,
  enumerable: false,
  get: jest.fn((): IConfig => {
    return {
      awsAccountID: 123456789,
      awsRegion: 'mock',
      db: {
        tableName: 'microapps',
      },
      apigwy: {
        apiId: '123',
      },
      filestore: {
        stagingBucket: 'microapps-test-staging',
        destinationBucket: 'microapps-test-destination',
      },
      uploadRoleName: 'microapps-upload-test-role',
      rootPathPrefix: 'dev',
    };
  }),
});
import * as apigwy from '@aws-sdk/client-apigatewayv2';
import * as dynamodb from '@aws-sdk/client-dynamodb';
import * as lambda from '@aws-sdk/client-lambda';
import * as s3 from '@aws-sdk/client-s3';
import * as sts from '@aws-sdk/client-sts';

import {
  IDeployVersionPreflightRequest,
  ICreateApplicationRequest,
  IDeployVersionRequest,
  IDeleteVersionRequest,
} from '@pwrdrvr/microapps-deployer-lib';
import { DBManager, Version } from '@pwrdrvr/microapps-datalib';
import type * as lambdaTypes from 'aws-lambda';
import { mockClient, AwsClientStub } from 'aws-sdk-client-mock';
import sinon from 'sinon';
import { handler, overrideDBManager } from '../index';

let s3Client: AwsClientStub<s3.S3Client>;
let stsClient: AwsClientStub<sts.STSClient>;
let apigwyClient: AwsClientStub<apigwy.ApiGatewayV2Client>;
let lambdaClient: AwsClientStub<lambda.LambdaClient>;
let dynamoClient: dynamodb.DynamoDBClient;
let dbManager: DBManager;

const TEST_TABLE_NAME = 'microapps';

describe('VersionController', () => {
  const config = Config.instance;
  let sandbox: sinon.SinonSandbox;
  const pathPrefix = `${config.rootPathPrefix}/`;

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
    s3Client = mockClient(s3.S3Client).onAnyCommand().rejects();
    stsClient = mockClient(sts.STSClient).onAnyCommand().rejects();
    apigwyClient = mockClient(apigwy.ApiGatewayV2Client).onAnyCommand().rejects();
    lambdaClient = mockClient(lambda.LambdaClient).onAnyCommand().rejects();
  });

  afterEach(() => {
    sandbox.restore();
    s3Client.restore();
    apigwyClient.restore();
    lambdaClient.restore();
  });

  describe('deleteVersion', () => {
    it('should 404 for version that does not exist', async () => {
      const appName = 'newapp';
      const semVer = '0.0.0';

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
          appName,
          semVer,
          type: 'deleteVersion',
        } as IDeleteVersionRequest,
        { awsRequestId: '123' } as lambdaTypes.Context,
      );
      expect(response.statusCode).toEqual(404);
    });

    it('should 200 for version that exists', async () => {
      const appName = 'newapp';
      const semVer = '0.0.0';
      const fakeIntegrationID = 'integration123';
      const fakeRoute1ID = 'route123';
      const fakeRoute2ID = 'route456';

      lambdaClient.onAnyCommand().rejects();
      s3Client
        .onAnyCommand()
        .rejects()
        // Mock S3 get for staging bucket - return one file name
        .on(s3.ListObjectsV2Command, {
          Bucket: config.filestore.destinationBucket,
          Prefix: `${pathPrefix}${appName}/${semVer}/`,
        })
        .resolves({
          IsTruncated: true,
          NextContinuationToken: 'nothing-to-see-here-yet',
        })
        .on(s3.ListObjectsV2Command, {
          ContinuationToken: 'nothing-to-see-here-yet',
          Bucket: config.filestore.destinationBucket,
          Prefix: `${pathPrefix}${appName}/${semVer}/`,
        })
        .resolves({
          IsTruncated: false,
          Contents: [{ Key: `${pathPrefix}${appName}/${semVer}/index.html` }],
        })
        .on(s3.DeleteObjectsCommand, {
          Bucket: config.filestore.destinationBucket,
          Delete: {
            Objects: [
              {
                Key: `${pathPrefix}${appName}/${semVer}/index.html`,
              },
            ],
          },
        })
        .resolves({});
      stsClient.onAnyCommand().rejects();
      apigwyClient
        .onAnyCommand()
        .rejects()
        .on(apigwy.DeleteIntegrationCommand, {
          ApiId: config.apigwy.apiId,
          IntegrationId: fakeIntegrationID,
        })
        .resolves({})
        .on(apigwy.DeleteRouteCommand, {
          ApiId: config.apigwy.apiId,
          RouteId: fakeRoute1ID,
        })
        .resolves({})
        .on(apigwy.DeleteRouteCommand, {
          ApiId: config.apigwy.apiId,
          RouteId: fakeRoute2ID,
        })
        .resolves({});

      const version = new Version({
        AppName: appName,
        SemVer: semVer,
        DefaultFile: '',
        IntegrationID: fakeIntegrationID,
        RouteIDAppVersion: fakeRoute1ID,
        RouteIDAppVersionSplat: fakeRoute2ID,
        // Note: Pending is reported as "does not exist"
        // So don't set this to pending or the test will fail
        Status: 'routed',
        Type: 'lambda',
      });
      await version.Save(dbManager);

      const response = await handler(
        {
          appName,
          semVer,
          type: 'deleteVersion',
        } as IDeleteVersionRequest,
        { awsRequestId: '123' } as lambdaTypes.Context,
      );
      expect(response).toBeDefined();
      expect(response.statusCode).toBeDefined();
      expect(response.statusCode).toEqual(200);
      expect(apigwyClient.calls().length).toEqual(3);
      expect(s3Client.calls().length).toEqual(3);

      // Confirm the version record is deleted
      const noRecord = await Version.LoadVersion({
        dbManager,
        key: {
          AppName: appName,
          SemVer: semVer,
        },
      });
      expect(noRecord).toBeUndefined();
    });
  });

  describe('deployVersionPreflight', () => {
    it('should 404 for version that does not exist', async () => {
      const appName = 'newapp';
      const semVer = '0.0.0';

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
          appName,
          semVer,
          type: 'deployVersionPreflight',
        } as IDeployVersionPreflightRequest,
        { awsRequestId: '123' } as lambdaTypes.Context,
      );
      expect(response.statusCode).toEqual(404);
    });

    it('should 200 for version that exists', async () => {
      const appName = 'newapp';
      const semVer = '0.0.0';

      stsClient.on(sts.AssumeRoleCommand).resolves({
        Credentials: {
          AccessKeyId: 'cat',
          SecretAccessKey: 'dog',
          SessionToken: 'frog',
          Expiration: new Date(),
        },
      });

      const version = new Version({
        AppName: appName,
        DefaultFile: '',
        IntegrationID: '',
        SemVer: semVer,
        // Note: Pending is reported as "does not exist"
        // So don't set this to pending or the test will fail
        Status: 'integrated',
        Type: 'lambda',
      });
      await version.Save(dbManager);

      const response = await handler(
        {
          appName,
          semVer,
          type: 'deployVersionPreflight',
        } as IDeployVersionPreflightRequest,
        { awsRequestId: '123' } as lambdaTypes.Context,
      );
      expect(response.statusCode).toEqual(200);
    });
  });

  describe('deployVersion', () => {
    const fakeLambdaARN = `arn:aws:lambda:${config.awsRegion}:${config.awsAccountID}:function:new-app-function`;

    it('should 201 version that does not exist', async () => {
      const fakeIntegrationID = 'abc123integrationID';
      const appName = 'newapp';
      const semVer = '0.0.0';

      s3Client
        .onAnyCommand()
        .rejects()
        // .callsFake((input) => {
        //   console.log(`received input: ${JSON.stringify(input)}`);
        //   console.log(
        //     `our matcher: ${JSON.stringify({
        //       Bucket: config.filestore.destinationBucket,
        //       CopySource: `${config.filestore.stagingBucket}${pathPrefix}/${appName}/${semVer}/index.html`,
        //       Key: `${pathPrefix}${appName}/${semVer}/index.html`,
        //     })}`,
        //   );
        // })
        // Mock S3 get for staging bucket - return one file name
        .on(s3.ListObjectsV2Command, {
          Bucket: config.filestore.stagingBucket,
          Prefix: `${pathPrefix}${appName}/${semVer}/`,
        })
        .resolves({
          IsTruncated: false,
          Contents: [{ Key: `${pathPrefix}${appName}/${semVer}/index.html` }],
        })
        // Mock S3 copy to prod bucket
        .on(s3.CopyObjectCommand, {
          Bucket: config.filestore.destinationBucket,
          CopySource: `${config.filestore.stagingBucket}/${pathPrefix}${appName}/${semVer}/index.html`,
          Key: `${pathPrefix}${appName}/${semVer}/index.html`,
        })
        .resolves({})
        .on(s3.DeleteObjectCommand, {
          Bucket: config.filestore.stagingBucket,
          Key: `${pathPrefix}${appName}/${semVer}/index.html`,
        })
        .resolves({});

      lambdaClient
        .onAnyCommand()
        .rejects()
        .on(lambda.GetPolicyCommand, {
          FunctionName: fakeLambdaARN,
        })
        .rejects({
          name: 'ResourceNotFoundException',
        })
        // Mock permission add for version root
        .on(lambda.AddPermissionCommand, {
          Principal: 'apigateway.amazonaws.com',
          StatementId: 'microapps-version-root',
          Action: 'lambda:InvokeFunction',
          FunctionName: fakeLambdaARN,
          SourceArn: `arn:aws:execute-api:${config.awsRegion}:${config.awsAccountID}:${config.apigwy.apiId}/*/*/${appName}/${semVer}`,
        })
        .resolves({})
        // Mock permission add for version/*
        .on(lambda.AddPermissionCommand, {
          Principal: 'apigateway.amazonaws.com',
          StatementId: 'microapps-version',
          Action: 'lambda:InvokeFunction',
          FunctionName: fakeLambdaARN,
          SourceArn: `arn:aws:execute-api:${config.awsRegion}:${config.awsAccountID}:${config.apigwy.apiId}/*/*/${appName}/${semVer}/{proxy+}`,
        })
        .resolves({});

      apigwyClient
        .onAnyCommand()
        .rejects()
        // Mock API Gateway Integration Create for Version
        .on(apigwy.CreateIntegrationCommand, {
          ApiId: config.apigwy.apiId,
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
          ApiId: config.apigwy.apiId,
          Target: `integrations/${fakeIntegrationID}`,
          RouteKey: `ANY /${appName}/${semVer}`,
        })
        .resolves({
          RouteId: 'route123',
        })
        // Mock create route for /*
        .on(apigwy.CreateRouteCommand, {
          ApiId: config.apigwy.apiId,
          Target: `integrations/${fakeIntegrationID}`,
          RouteKey: `ANY /${appName}/${semVer}/{proxy+}`,
        })
        .resolves({
          RouteId: 'route456',
        });

      const response = await handler(
        {
          appName,
          semVer,
          defaultFile: 'index.html',
          lambdaARN: fakeLambdaARN,
          type: 'deployVersion',
        } as IDeployVersionRequest,
        { awsRequestId: '123' } as lambdaTypes.Context,
      );
      expect(response.statusCode).toEqual(201);
    });

    it('should 201 version that exists - overwrite true', async () => {
      const fakeIntegrationID = 'abc123integrationID';
      const appName = 'newapp';
      const semVer = '0.0.0';

      const version = new Version({
        AppName: appName,
        DefaultFile: '',
        IntegrationID: fakeIntegrationID,
        RouteIDAppVersion: 'route123-1',
        RouteIDAppVersionSplat: 'route456-1',
        SemVer: semVer,
        Status: 'routed',
        Type: 'lambda',
      });
      await version.Save(dbManager);

      s3Client
        .onAnyCommand()
        .rejects()
        // Mock S3 get for staging bucket - return one file name
        .on(s3.ListObjectsV2Command, {
          Bucket: config.filestore.stagingBucket,
          Prefix: `${pathPrefix}${appName}/${semVer}/`,
        })
        .resolves({
          IsTruncated: false,
          Contents: [{ Key: `${pathPrefix}${appName}/${semVer}/index.html` }],
        })
        // Mock S3 copy to prod bucket
        .on(s3.CopyObjectCommand, {
          Bucket: config.filestore.destinationBucket,
          CopySource: `${config.filestore.stagingBucket}/${pathPrefix}${appName}/${semVer}/index.html`,
          Key: `${pathPrefix}${appName}/${semVer}/index.html`,
        })
        .resolves({})
        .on(s3.DeleteObjectCommand, {
          Bucket: config.filestore.stagingBucket,
          Key: `${pathPrefix}${appName}/${semVer}/index.html`,
        })
        .resolves({});
      lambdaClient
        .onAnyCommand()
        .rejects()
        .on(lambda.GetPolicyCommand, {
          FunctionName: fakeLambdaARN,
        })
        .resolves({
          Policy: JSON.stringify({
            Version: '2012-10-17',
            Id: 'default',
            Statement: [
              {
                Sid: 'microapps-version-root',
              },
              {
                Sid: 'microapps-version',
              },
            ],
          }),
        })
        // Mock permission add for version root
        .on(lambda.AddPermissionCommand, {
          Principal: 'apigateway.amazonaws.com',
          StatementId: 'microapps-version-root',
          Action: 'lambda:InvokeFunction',
          FunctionName: fakeLambdaARN,
          SourceArn: `arn:aws:execute-api:${config.awsRegion}:${config.awsAccountID}:${config.apigwy.apiId}/*/*/${appName}/${semVer}`,
        })
        .resolves({})
        // Mock permission add for version/*
        .on(lambda.AddPermissionCommand, {
          Principal: 'apigateway.amazonaws.com',
          StatementId: 'microapps-version',
          Action: 'lambda:InvokeFunction',
          FunctionName: fakeLambdaARN,
          SourceArn: `arn:aws:execute-api:${config.awsRegion}:${config.awsAccountID}:${config.apigwy.apiId}/*/*/${appName}/${semVer}/{proxy+}`,
        })
        .resolves({});

      // There should be no need to update the integration or the routes
      // The Integration points to a Lambda version alias
      // The Lambda version alias is updated to point to the new code
      // The Routes point to the Integration
      // Everything switches to the new version without any changes in API Gateway
      apigwyClient.onAnyCommand().rejects();

      const response = await handler(
        {
          appName: appName,
          semVer: semVer,
          defaultFile: 'index.html',
          lambdaARN: fakeLambdaARN,
          type: 'deployVersion',
          overwrite: true,
          appType: 'lambda',
        } as IDeployVersionRequest,
        { awsRequestId: '123' } as lambdaTypes.Context,
      );
      expect(response.statusCode).toEqual(201);

      const updatedVersion = await Version.LoadVersion({
        dbManager,
        key: { AppName: appName, SemVer: semVer },
      });

      expect(updatedVersion).toBeDefined();
      expect(updatedVersion.IntegrationID).toBe(fakeIntegrationID);
      expect(updatedVersion.RouteIDAppVersion).toBe('route123-1');
      expect(updatedVersion.RouteIDAppVersionSplat).toBe('route456-1');
    });

    it('should 201 version that does not exist, with continuations', async () => {
      const fakeIntegrationID = 'abc123integrationID';
      const appName = 'newapp';
      const semVer = '0.0.0';

      s3Client
        .onAnyCommand()
        .rejects()
        // Mock S3 get for staging bucket - return one file name
        .on(s3.ListObjectsV2Command, {
          Bucket: config.filestore.stagingBucket,
          Prefix: `${pathPrefix}${appName}/${semVer}/`,
        })
        .resolves({
          IsTruncated: true,
          NextContinuationToken: 'nothing-to-see-here-yet',
        })
        .on(s3.ListObjectsV2Command, {
          ContinuationToken: 'nothing-to-see-here-yet',
          Bucket: config.filestore.stagingBucket,
          Prefix: `${pathPrefix}${appName}/${semVer}/`,
        })
        .resolves({
          IsTruncated: false,
          Contents: [{ Key: `${pathPrefix}${appName}/${semVer}/index.html` }],
        })
        // Mock S3 copy to prod bucket
        .on(s3.CopyObjectCommand, {
          Bucket: config.filestore.destinationBucket,
          CopySource: `${config.filestore.stagingBucket}/${pathPrefix}${appName}/${semVer}/index.html`,
          Key: `${pathPrefix}${appName}/${semVer}/index.html`,
        })
        .resolves({})
        .on(s3.DeleteObjectCommand, {
          Bucket: config.filestore.stagingBucket,
          Key: `${pathPrefix}${appName}/${semVer}/index.html`,
        })
        .resolves({});

      lambdaClient
        .onAnyCommand()
        .rejects()
        .on(lambda.GetPolicyCommand, {
          FunctionName: fakeLambdaARN,
        })
        .rejects({
          name: 'ResourceNotFoundException',
        })
        // Mock permission add for version root
        .on(lambda.AddPermissionCommand, {
          Principal: 'apigateway.amazonaws.com',
          StatementId: 'microapps-version-root',
          Action: 'lambda:InvokeFunction',
          FunctionName: fakeLambdaARN,
          SourceArn: `arn:aws:execute-api:${config.awsRegion}:${config.awsAccountID}:${config.apigwy.apiId}/*/*/${appName}/${semVer}`,
        })
        .resolves({})
        // Mock permission add for version/*
        .on(lambda.AddPermissionCommand, {
          Principal: 'apigateway.amazonaws.com',
          StatementId: 'microapps-version',
          Action: 'lambda:InvokeFunction',
          FunctionName: fakeLambdaARN,
          SourceArn: `arn:aws:execute-api:${config.awsRegion}:${config.awsAccountID}:${config.apigwy.apiId}/*/*/${appName}/${semVer}/{proxy+}`,
        })
        .resolves({});

      apigwyClient
        .onAnyCommand()
        .rejects()
        // Mock API Gateway Integration Create for Version
        .on(apigwy.CreateIntegrationCommand, {
          ApiId: config.apigwy.apiId,
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
          ApiId: config.apigwy.apiId,
          Target: `integrations/${fakeIntegrationID}`,
          RouteKey: `ANY /${appName}/${semVer}`,
        })
        .resolves({
          RouteId: 'route123',
        })
        // Mock create route for /*
        .on(apigwy.CreateRouteCommand, {
          ApiId: config.apigwy.apiId,
          Target: `integrations/${fakeIntegrationID}`,
          RouteKey: `ANY /${appName}/${semVer}/{proxy+}`,
        })
        .resolves({
          RouteId: 'route456',
        });

      const response = await handler(
        {
          appName,
          semVer,
          defaultFile: 'index.html',
          lambdaARN: fakeLambdaARN,
          type: 'deployVersion',
        } as IDeployVersionRequest,
        { awsRequestId: '123' } as lambdaTypes.Context,
      );
      expect(response.statusCode).toEqual(201);
    });

    it('should 409 version that exists with "routed" status - overwrite false', async () => {
      const appName = 'newapp';
      const semVer = '0.0.0';

      const version = new Version({
        AppName: appName,
        DefaultFile: '',
        IntegrationID: '',
        SemVer: semVer,
        Status: 'routed',
        Type: 'lambda',
      });
      await version.Save(dbManager);

      const response = await handler(
        {
          appName,
          semVer,
          defaultFile: 'index.html',
          lambdaARN: fakeLambdaARN,
          type: 'deployVersion',
        } as IDeployVersionRequest,
        { awsRequestId: '123' } as lambdaTypes.Context,
      );
      expect(response.statusCode).toEqual(409);
    });

    it('should 401 version with lack of apigwy permission', async () => {
      const fakeIntegrationID = 'abc123integrationID';
      const appName = 'newapp';
      const semVer = '0.0.0';

      s3Client
        .onAnyCommand()
        .rejects()
        // Mock S3 get for staging bucket - return one file name
        .on(s3.ListObjectsV2Command, {
          Bucket: config.filestore.stagingBucket,
          Prefix: `${pathPrefix}${appName}/${semVer}/`,
        })
        .resolves({
          IsTruncated: false,
          Contents: [{ Key: `${pathPrefix}${appName}/${semVer}/index.html` }],
        })
        // Mock S3 copy to prod bucket
        .on(s3.CopyObjectCommand, {
          Bucket: config.filestore.destinationBucket,
          CopySource: `${config.filestore.stagingBucket}/${pathPrefix}${appName}/${semVer}/index.html`,
          Key: `${pathPrefix}${appName}/${semVer}/index.html`,
        })
        .resolves({})
        .on(s3.DeleteObjectCommand, {
          Bucket: config.filestore.stagingBucket,
          Key: `${pathPrefix}${appName}/${semVer}/index.html`,
        })
        .resolves({});

      lambdaClient
        .onAnyCommand()
        .rejects()
        .on(lambda.GetPolicyCommand, {
          FunctionName: fakeLambdaARN,
        })
        .rejects({
          name: 'ResourceNotFoundException',
        })
        // Mock permission add for version root
        .on(lambda.AddPermissionCommand, {
          Principal: 'apigateway.amazonaws.com',
          StatementId: 'microapps-version-root',
          Action: 'lambda:InvokeFunction',
          FunctionName: fakeLambdaARN,
          SourceArn: `arn:aws:execute-api:${config.awsRegion}:${config.awsAccountID}:${config.apigwy.apiId}/*/*/${appName}/${semVer}`,
        })
        .resolves({})
        // Mock permission add for version/*
        .on(lambda.AddPermissionCommand, {
          Principal: 'apigateway.amazonaws.com',
          StatementId: 'microapps-version',
          Action: 'lambda:InvokeFunction',
          FunctionName: fakeLambdaARN,
          SourceArn: `arn:aws:execute-api:${config.awsRegion}:${config.awsAccountID}:${config.apigwy.apiId}/*/*/${appName}/${semVer}/{proxy+}`,
        })
        .resolves({});

      apigwyClient
        .onAnyCommand()
        .rejects()
        // Mock API Gateway Integration Create for Version
        .on(apigwy.CreateIntegrationCommand, {
          ApiId: config.apigwy.apiId,
          IntegrationType: apigwy.IntegrationType.AWS_PROXY,
          IntegrationMethod: 'POST',
          PayloadFormatVersion: '2.0',
          IntegrationUri: fakeLambdaARN,
        })
        .rejects({
          name: 'AccessDeniedException',
          message: `User: arn:aws:sts::${config.awsAccountID}0123:assumed-role/some-role-name/microapps-deployer-dev is not authorized to perform: apigateway:POST on resource: arn:aws:apigateway:${config.awsRegion}::/apis/${config.apigwy.apiId}/integrations`,
        })
        // Mock create route - this might fail
        .on(apigwy.CreateRouteCommand, {
          ApiId: config.apigwy.apiId,
          Target: `integrations/${fakeIntegrationID}`,
          RouteKey: `ANY /${appName}/${semVer}`,
        })
        .resolves({
          RouteId: 'route123',
        })
        // Mock create route for /*
        .on(apigwy.CreateRouteCommand, {
          ApiId: config.apigwy.apiId,

          Target: `integrations/${fakeIntegrationID}`,
          RouteKey: `ANY /${appName}/${semVer}/{proxy+}`,
        })
        .resolves({
          RouteId: 'route456',
        });

      const response = await handler(
        {
          appName,
          semVer,
          defaultFile: 'index.html',
          lambdaARN: fakeLambdaARN,
          type: 'deployVersion',
        } as IDeployVersionRequest,
        { awsRequestId: '123' } as lambdaTypes.Context,
      );
      expect(response.statusCode).toEqual(401);
    });
  });
});
