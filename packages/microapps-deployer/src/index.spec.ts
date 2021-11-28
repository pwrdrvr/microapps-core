// index.test.ts
/// <reference types="jest" />
import 'reflect-metadata';
import 'jest-dynalite/withDb';
import { Config, IConfig } from './config/Config';
jest.mock('./config/Config');
Object.defineProperty(Config, 'instance', {
  configurable: false,
  enumerable: false,
  get: jest.fn((): IConfig => {
    return {
      awsAccountID: 123456,
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
    };
  }),
});
import * as dynamodb from '@aws-sdk/client-dynamodb';
import { mockClient, AwsClientStub } from 'aws-sdk-client-mock';
import { handler, overrideDBManager } from './index';
import { Application, DBManager } from '@pwrdrvr/microapps-datalib';
import { ICreateApplicationRequest } from '@pwrdrvr/microapps-deployer-lib';

let dynamoClient: dynamodb.DynamoDBClient;
let dbManager: DBManager;

describe('deployer handler', () => {
  const config = Config.instance;

  beforeEach(() => {
    overrideDBManager({ dbManager, dynamoClient });
  });

  beforeAll(() => {
    dynamoClient = new dynamodb.DynamoDBClient({
      endpoint: process.env.MOCK_DYNAMODB_ENDPOINT,
      tls: false,
      region: 'local',
    });

    // Init the DB manager to point it at the right table
    dbManager = new DBManager({ dynamoClient, tableName: config.db.tableName });
  });

  afterAll(() => {
    dynamoClient.destroy();
  }, 20000);

  describe('application create', () => {
    it('application create - valid', async () => {
      // Confirm that app does not exist
      let app = await Application.Load({ dbManager, key: { AppName: 'test-app' } });
      expect(app).toBeUndefined();

      // Create the app
      const payload: ICreateApplicationRequest = {
        appName: 'test-app',
        displayName: 'NewDisplayName',
        type: 'createApp',
      };
      const result = await handler(payload);

      expect(result).toBeDefined();
      expect(result.statusCode).toBe(201);

      // Check that app exists
      app = await Application.Load({ dbManager, key: { AppName: 'test-app' } });
      expect(app).toBeDefined();
      expect(app.AppName).toBe('test-app');
    });

    it('application create - missing type', async () => {
      // Confirm that app does not exist
      let app = await Application.Load({ dbManager, key: { AppName: 'test-app' } });
      expect(app).toBeUndefined();

      // Fail to create an app
      const payload: ICreateApplicationRequest = {
        appName: 'test-app',
      } as ICreateApplicationRequest;
      const result = await handler(payload);

      expect(result).toBeDefined();
      expect(result.statusCode).toBe(400);

      // Check that app does not exist
      app = await Application.Load({ dbManager, key: { AppName: 'test-app' } });
      expect(app).toBeUndefined();
    });

    it('application create - missing other fields', async () => {
      // Confirm that app does not exist
      let app = await Application.Load({ dbManager, key: { AppName: 'test-app' } });
      expect(app).toBeUndefined();

      // Fail to create an app
      const payload: ICreateApplicationRequest = {
        type: 'createApp',
      } as ICreateApplicationRequest;
      const result = await handler(payload);

      expect(result).toBeDefined();
      expect(result.statusCode).toBe(400);

      // Check that app does not exist
      app = await Application.Load({ dbManager, key: { AppName: 'test-app' } });
      expect(app).toBeUndefined();
    });
  });
});
