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
import * as sts from '@aws-sdk/client-sts';

import {
  IDeployVersionPreflightRequest,
  ICreateApplicationRequest,
} from '@pwrdrvr/microapps-deployer-lib';
import { DBManager, Version } from '@pwrdrvr/microapps-datalib';
import type * as lambdaTypes from 'aws-lambda';
import { mockClient, AwsClientStub } from 'aws-sdk-client-mock';
import sinon from 'sinon';
import { handler, overrideDBManager } from '../../index';

let s3Client: AwsClientStub<s3.S3Client>;
let stsClient: AwsClientStub<sts.STSClient>;
let apigwyClient: AwsClientStub<apigwy.ApiGatewayV2Client>;
let lambdaClient: AwsClientStub<lambda.LambdaClient>;
let dynamoClient: dynamodb.DynamoDBClient;
let dbManager: DBManager;

const TEST_TABLE_NAME = 'microapps';

describe('VersionController', () => {
  // const config = Config.instance;
  let sandbox: sinon.SinonSandbox;

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
});
