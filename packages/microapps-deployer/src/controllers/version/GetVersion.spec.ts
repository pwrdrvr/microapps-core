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
  edgeToOriginRoleARN: [],
};
const origConfig = { ...theConfig };
Object.defineProperty(Config, 'instance', {
  configurable: false,
  enumerable: false,
  get: jest.fn((): IConfig => {
    return theConfig;
  }),
});
import * as dynamodb from '@aws-sdk/client-dynamodb';

import type {
  ICreateApplicationRequest,
  IGetVersionRequest,
  IGetVersionResponse,
} from '@pwrdrvr/microapps-deployer-lib';
import { DBManager, Version } from '@pwrdrvr/microapps-datalib';
import type * as lambdaTypes from 'aws-lambda';
import sinon from 'sinon';
import { handler, overrideDBManager } from '../../index';

let dynamoClient: dynamodb.DynamoDBClient;
let dbManager: DBManager;

const TEST_TABLE_NAME = 'microapps';

describe('GetVersion', () => {
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
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('getVersion', () => {
    it('should 404 for version that does not exist', async () => {
      const appName = 'newapp';
      const semVer = '0.0.0';

      const response = await handler(
        {
          appName,
          semVer,
          type: 'getVersion',
        } as IGetVersionRequest,
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

      const request: IGetVersionRequest = {
        appName,
        semVer,
        type: 'getVersion',
      };

      const response: IGetVersionResponse = (await handler(request, {
        awsRequestId: '123',
      } as lambdaTypes.Context)) as IGetVersionResponse;
      expect(response).toBeDefined();
      expect(response.statusCode).toBeDefined();
      expect(response.statusCode).toEqual(200);

      // Confirm the version record is returned
      expect(response.version).toBeDefined();
      expect(response.version?.appName).toEqual(appName);
      expect(response.version?.semVer).toEqual(semVer);
      expect(response.version?.lambdaArn).toEqual(version.LambdaARN);
    });
  });
});
