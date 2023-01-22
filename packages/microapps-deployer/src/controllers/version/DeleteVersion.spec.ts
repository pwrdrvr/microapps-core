/// <reference types="jest" />
import 'reflect-metadata';
import 'jest-dynalite/withDb';
import { Config, IConfig } from '../../config/Config';
jest.mock('../../config/Config');
type Writeable<T> = { -readonly [P in keyof T]: T[P] };
const theConfig: Writeable<IConfig> = {
  awsAccountID: '00123456789',
  awsRegion: 'mock',
  db: {
    tableName: 'microapps',
  },
  apigwy: {
    apiId: '123',
  },
  filestore: {
    stagingBucket: 'pwrdrvr-apps-staging',
    destinationBucket: 'microapps-test-destination',
  },
  uploadRoleName: 'microapps-upload-test-role',
  rootPathPrefix: 'dev',
  requireIAMAuthorization: true,
  parentDeployerLambdaARN: '',
  edgeToOriginRoleARN: '',
};
const origConfig = { ...theConfig };
Object.defineProperty(Config, 'instance', {
  configurable: false,
  enumerable: false,
  get: jest.fn((): IConfig => {
    return theConfig;
  }),
});
import * as apigwy from '@aws-sdk/client-apigatewayv2';
import * as dynamodb from '@aws-sdk/client-dynamodb';
import * as lambda from '@aws-sdk/client-lambda';
import * as s3 from '@aws-sdk/client-s3';

import type {
  ICreateApplicationRequest,
  IDeleteVersionRequest,
} from '@pwrdrvr/microapps-deployer-lib';
import { DBManager, Version } from '@pwrdrvr/microapps-datalib';
import type * as lambdaTypes from 'aws-lambda';
import { mockClient, AwsClientStub } from 'aws-sdk-client-mock';
import sinon from 'sinon';
import { handler, overrideDBManager } from '../../index';

let s3Client: AwsClientStub<s3.S3Client>;
let apigwyClient: AwsClientStub<apigwy.ApiGatewayV2Client>;
let lambdaClient: AwsClientStub<lambda.LambdaClient>;
let dynamoClient: dynamodb.DynamoDBClient;
let dbManager: DBManager;

const TEST_TABLE_NAME = 'microapps';

describe('DeleteVersion', () => {
  const config = Config.instance;
  let sandbox: sinon.SinonSandbox;
  const pathPrefix = `${config.rootPathPrefix}/`;

  beforeAll(() => {
    dynamoClient = new dynamodb.DynamoDBClient({
      endpoint: process.env.MOCK_DYNAMODB_ENDPOINT,
      tls: false,
      region: 'local',
    });

    // Init the DB manager to point it at the right table
    dbManager = new DBManager({ dynamoClient, tableName: TEST_TABLE_NAME });
  });

  beforeEach(async () => {
    jest.resetModules(); // Most important - it clears the cache

    // Reset the config that's visible to the handler back to defaults
    Object.keys(origConfig).forEach((key) => {
      (theConfig as { [index: string]: unknown })[key] = (
        origConfig as { [index: string]: unknown }
      )[key];
    });

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

      lambdaClient.onAnyCommand().rejects();
      apigwyClient.onAnyCommand().rejects();

      const response = await handler(
        {
          appName,
          semVer,
          type: 'deleteVersion',
        } as IDeleteVersionRequest,
        { awsRequestId: '123' } as lambdaTypes.Context,
      );
      expect(response.statusCode).toEqual(404);
      expect(lambdaClient.calls()).toHaveLength(0);
      expect(apigwyClient.calls()).toHaveLength(0);
    });

    it('should 200 for version that exists', async () => {
      const appName = 'newapp';
      const semVer = '0.0.0';
      const fakeIntegrationID = 'integration123';
      const fakeRoute1ID = 'route123';
      const fakeRoute2ID = 'route456';

      lambdaClient
        .on(lambda.GetAliasCommand, {
          FunctionName: 'arn:aws:lambda:us-east-1:123456789012:function:my-function',
          Name: 'my-alias',
        })
        .resolves({
          FunctionVersion: '1',
        })
        .on(lambda.DeleteAliasCommand, {
          FunctionName: 'arn:aws:lambda:us-east-1:123456789012:function:my-function',
          Name: 'my-alias',
        })
        .resolves({})
        .on(lambda.DeleteFunctionCommand, {
          FunctionName: 'arn:aws:lambda:us-east-1:123456789012:function:my-function',
          Qualifier: '1',
        })
        .resolves({})
        .onAnyCommand()
        .rejects();
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
        LambdaARN: 'arn:aws:lambda:us-east-1:123456789012:function:my-function:my-alias',
      });
      await version.Save(dbManager);

      const request: IDeleteVersionRequest = {
        appName,
        semVer,
        type: 'deleteVersion',
      };

      const response = await handler(request, { awsRequestId: '123' } as lambdaTypes.Context);
      expect(response).toBeDefined();
      expect(response.statusCode).toBeDefined();
      expect(response.statusCode).toEqual(200);
      expect(lambdaClient.calls().length).toEqual(3);
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
});
