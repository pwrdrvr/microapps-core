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

import { ICreateApplicationRequest, IDeployVersionRequest } from '@pwrdrvr/microapps-deployer-lib';
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

describe('DeployVersionLite', () => {
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

  describe('deployVersionLite - lambda (apigwy)', () => {
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

      const request: IDeployVersionRequest = {
        appName,
        semVer,
        defaultFile: 'index.html',
        lambdaARN: fakeLambdaARN,
        type: 'deployVersionLite',
      };
      const response = await handler(request, { awsRequestId: '123' } as lambdaTypes.Context);
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

      const response = await handler(
        {
          appName,
          semVer,
          defaultFile: 'index.html',
          lambdaARN: fakeLambdaARN,
          type: 'deployVersionLite',
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

      const response = await handler(
        {
          appName,
          semVer,
          defaultFile: 'index.html',
          lambdaARN: fakeLambdaARN,
          type: 'deployVersionLite',
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
          type: 'deployVersionLite',
        } as IDeployVersionRequest,
        { awsRequestId: '123' } as lambdaTypes.Context,
      );
      expect(response.statusCode).toEqual(409);
    });
  });

  describe('deployVersionLite - lambda-url', () => {
    const fakeLambdaARN = `arn:aws:lambda:${config.awsRegion}:${config.awsAccountID}:function:new-app-function`;
    const fakeLambdaAliasSuffix = 'v0_0_0';
    const fakeFunctionURLForAlias = 'https://abc1234567.lambda-url.us-east-1.on.aws';

    it('should 201 version that does not exist', async () => {
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

      const response = await handler(
        {
          appName,
          semVer,
          defaultFile: 'index.html',
          lambdaARN: `${fakeLambdaARN}:${fakeLambdaAliasSuffix}`,
          type: 'deployVersionLite',
          overwrite: true,
          appType: 'lambda-url',
          startupType: 'direct',
          url: 'https://abc1234567.lambda-url.us-east-1.on.aws',
        } as IDeployVersionRequest,
        { awsRequestId: '123' } as lambdaTypes.Context,
      );
      expect(response.statusCode).toEqual(201);

      const updatedVersion = await Version.LoadVersion({
        dbManager,
        key: { AppName: appName, SemVer: semVer },
      });
      // expect(updatedVersion).toEqual({});
      expect(updatedVersion.AppName).toBe(appName);
      expect(updatedVersion.SemVer).toBe(semVer);
      expect(updatedVersion.DefaultFile).toBe('index.html');
      expect(updatedVersion.LambdaARN).toBe(`${fakeLambdaARN}:${fakeLambdaAliasSuffix}`);
      expect(updatedVersion.URL).toBe(fakeFunctionURLForAlias);
      expect(updatedVersion.StartupType).toBe('direct');
      expect(updatedVersion.Status).toBe('routed');
      expect(updatedVersion.Type).toBe('lambda-url');
      expect(updatedVersion.IntegrationID).toBe('');
      expect(updatedVersion.RouteIDAppVersion).toBe('');
      expect(updatedVersion.RouteIDAppVersionSplat).toBe('');
    });

    it('should 201 version that exists - overwrite true', async () => {
      const appName = 'newapp';
      const semVer = '0.0.0';

      const version = new Version({
        AppName: appName,
        DefaultFile: '',
        SemVer: semVer,
        LambdaARN: `${fakeLambdaARN}:${fakeLambdaAliasSuffix}`,
        URL: 'https://abc1234567.lambda-url.us-east-1.on.aws',
        StartupType: 'direct',
        Status: 'routed',
        Type: 'lambda-url',
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

      const response = await handler(
        {
          appName,
          semVer,
          defaultFile: 'index.html',
          lambdaARN: `${fakeLambdaARN}:${fakeLambdaAliasSuffix}`,
          type: 'deployVersionLite',
          overwrite: true,
          appType: 'lambda-url',
          startupType: 'direct',
          url: 'https://abc1234567.lambda-url.us-east-1.on.aws',
        } as IDeployVersionRequest,
        { awsRequestId: '123' } as lambdaTypes.Context,
      );
      expect(response.statusCode).toEqual(201);

      const updatedVersion = await Version.LoadVersion({
        dbManager,
        key: { AppName: appName, SemVer: semVer },
      });

      expect(updatedVersion).toBeDefined();
      // expect(updatedVersion).toEqual({});
      expect(updatedVersion.AppName).toBe(appName);
      expect(updatedVersion.SemVer).toBe(semVer);
      expect(updatedVersion.DefaultFile).toBe('index.html');
      expect(updatedVersion.LambdaARN).toBe(`${fakeLambdaARN}:${fakeLambdaAliasSuffix}`);
      expect(updatedVersion.URL).toBe(fakeFunctionURLForAlias);
      expect(updatedVersion.StartupType).toBe('direct');
      expect(updatedVersion.Status).toBe('routed');
      expect(updatedVersion.Type).toBe('lambda-url');
      expect(updatedVersion.IntegrationID).toBe('');
      expect(updatedVersion.RouteIDAppVersion).toBe('');
      expect(updatedVersion.RouteIDAppVersionSplat).toBe('');
    });

    it('should 201 version that does not exist, with continuations', async () => {
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

      const response = await handler(
        {
          appName,
          semVer,
          defaultFile: 'index.html',
          lambdaARN: `${fakeLambdaARN}:${fakeLambdaAliasSuffix}`,
          type: 'deployVersionLite',
          overwrite: true,
          appType: 'lambda-url',
          startupType: 'direct',
          url: 'https://abc1234567.lambda-url.us-east-1.on.aws',
        } as IDeployVersionRequest,
        { awsRequestId: '123' } as lambdaTypes.Context,
      );
      expect(response.statusCode).toEqual(201);
      // expect(updatedVersion).toEqual({});
    });

    it('should 409 version that exists with "routed" status - overwrite false', async () => {
      const appName = 'newapp';
      const semVer = '0.0.0';

      const version = new Version({
        AppName: appName,
        DefaultFile: '',
        SemVer: semVer,
        LambdaARN: `${fakeLambdaARN}:${fakeLambdaAliasSuffix}`,
        URL: 'https://abc1234567.lambda-url.us-east-1.on.aws',
        StartupType: 'direct',
        Status: 'routed',
        Type: 'lambda-url',
      });
      await version.Save(dbManager);

      const response = await handler(
        {
          appName,
          semVer,
          defaultFile: 'index.html',
          lambdaARN: `${fakeLambdaARN}:${fakeLambdaAliasSuffix}`,
          type: 'deployVersionLite',
        } as IDeployVersionRequest,
        { awsRequestId: '123' } as lambdaTypes.Context,
      );
      expect(response.statusCode).toEqual(409);
    });
  });

  describe('deployVersionLite - url)', () => {
    it('should 201 version that does not exist', async () => {
      const appName = 'newapp';
      const semVer = '0.0.0';

      s3Client.onAnyCommand().rejects();

      const response = await handler(
        {
          appName,
          semVer,
          defaultFile: '',
          type: 'deployVersionLite',
          overwrite: false,
          appType: 'url',
          startupType: 'direct',
          url: 'https://pwrdrvr.com',
        } as IDeployVersionRequest,
        { awsRequestId: '123' } as lambdaTypes.Context,
      );
      expect(response.statusCode).toEqual(201);

      const updatedVersion = await Version.LoadVersion({
        dbManager,
        key: { AppName: appName, SemVer: semVer },
      });
      // expect(updatedVersion).toEqual({});
      expect(updatedVersion.AppName).toBe(appName);
      expect(updatedVersion.SemVer).toBe(semVer);
      expect(updatedVersion.DefaultFile).toBe('');
      expect(updatedVersion.LambdaARN).toBe('');
      expect(updatedVersion.URL).toBe('https://pwrdrvr.com');
      expect(updatedVersion.StartupType).toBe('direct');
      expect(updatedVersion.Status).toBe('routed');
      expect(updatedVersion.Type).toBe('url');
      expect(updatedVersion.IntegrationID).toBe('');
      expect(updatedVersion.RouteIDAppVersion).toBe('');
      expect(updatedVersion.RouteIDAppVersionSplat).toBe('');
    });
  });
});
