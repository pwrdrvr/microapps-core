import 'jest-dynalite/withDb';
import { DBManager, Application } from '@pwrdrvr/microapps-datalib';
import type * as lambda from 'aws-lambda';
import * as dynamodb from '@aws-sdk/client-dynamodb';
import { handler, ICreateApplicationRequest, overrideDBManager } from '../index';

let dynamoClient: dynamodb.DynamoDBClient;
let dbManager: DBManager;

const TEST_TABLE_NAME = 'microapps';

describe('AppController', () => {
  beforeAll(() => {
    dynamoClient = new dynamodb.DynamoDBClient({
      endpoint: process.env.MOCK_DYNAMODB_ENDPOINT,
      tls: false,
      region: 'local',
    });

    dbManager = new DBManager({ dynamoClient, tableName: TEST_TABLE_NAME });
  });

  beforeEach(() => {
    overrideDBManager({ dbManager, dynamoClient });
  });

  it('should create new app that does not exist', async () => {
    const response = await handler(
      {
        appName: 'NewApp',
        displayName: 'NewDisplayName',
        type: 'createApp',
      } as ICreateApplicationRequest,
      { awsRequestId: '123' } as lambda.Context,
    );
    expect(response.statusCode).toBe(201);

    const record = await Application.Load({ dbManager, key: { AppName: 'NewApp' } });
    expect(record).toBeDefined();
    expect(record.AppName).toBe('newapp');
    expect(record.DisplayName).toBe('NewDisplayName');
  });

  it('should not create app that exists', async () => {
    // Create first time
    let response = await handler(
      {
        appName: 'NewApp',
        displayName: 'NewDisplayName',
        type: 'createApp',
      } as ICreateApplicationRequest,
      { awsRequestId: '123' } as lambda.Context,
    );
    expect(response.statusCode).toBe(201);

    // Try to create second time
    response = await handler(
      {
        appName: 'NewApp',
        displayName: 'NewDisplayName2',
        type: 'createApp',
      } as ICreateApplicationRequest,
      { awsRequestId: '123' } as lambda.Context,
    );
    expect(response.statusCode).toBe(200);

    const record = await Application.Load({ dbManager, key: { AppName: 'NewApp' } });
    expect(record).toBeDefined();
    expect(record.AppName).toBe('newapp');
    expect(record.DisplayName).toBe('NewDisplayName');
  });
});
