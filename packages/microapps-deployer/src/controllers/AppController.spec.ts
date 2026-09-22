import '../../../../tests/dynamodb/withDb';
import { DBManager, Application } from '@pwrdrvr/microapps-datalib';
import type * as lambda from 'aws-lambda';
import * as dynamodb from '@aws-sdk/client-dynamodb';
import type { ICreateApplicationRequest } from '@pwrdrvr/microapps-deployer-lib';
import { handler, overrideDBManager } from '../index';

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

describe('application alias API', () => {
  beforeEach(() => overrideDBManager({ dbManager, dynamoClient }));
  const create = (appName: string, extraAppNames?: string[]) =>
    handler(
      {
        type: 'createApp',
        appName,
        displayName: appName,
        ...(extraAppNames !== undefined ? { extraAppNames } : {}),
      } as ICreateApplicationRequest,
      { awsRequestId: 'aliases' } as lambda.Context,
    );

  it('creates, preserves, replaces, and clears aliases', async () => {
    expect((await create('shop', ['Search'])).statusCode).toBe(201);
    expect(await Application.ResolveAppName({ dbManager, appName: 'search' })).toBe('shop');
    expect((await create('shop')).statusCode).toBe(200);
    expect((await Application.Load({ dbManager, key: { AppName: 'shop' } })).ExtraAppNames).toEqual(
      ['search'],
    );
    expect((await create('shop', ['product'])).statusCode).toBe(200);
    expect(await Application.ResolveAppName({ dbManager, appName: 'search' })).toBeUndefined();
    expect(await Application.ResolveAppName({ dbManager, appName: 'product' })).toBe('shop');
    expect((await create('shop', [])).statusCode).toBe(200);
    expect(await Application.ResolveAppName({ dbManager, appName: 'product' })).toBeUndefined();
  });

  it('returns conflict for an alias owner or a real application collision', async () => {
    await create('shop', ['search']);
    expect((await create('search')).statusCode).toBe(409);
    expect((await create('other', ['search'])).statusCode).toBe(409);
    expect((await create('other', ['shop'])).statusCode).toBe(409);
    expect(await Application.Load({ dbManager, key: { AppName: 'other' } })).toBeUndefined();
  });

  it('returns bad request for invalid aliases', async () => {
    expect((await create('shop', ['a/b'])).statusCode).toBe(400);
    expect((await create('shop', 'search' as unknown as string[])).statusCode).toBe(400);
    expect(await Application.Load({ dbManager, key: { AppName: 'shop' } })).toBeUndefined();
  });
});
