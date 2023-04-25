/// <reference types="jest" />
import 'reflect-metadata';
import 'jest-dynalite/withDb';
import * as dynamodb from '@aws-sdk/client-dynamodb';
import { Application, DBManager, Version, Rules } from '@pwrdrvr/microapps-datalib';
import { GetRoute } from './index';

let dynamoClient: dynamodb.DynamoDBClient;
let dbManager: DBManager;

const TEST_TABLE_NAME = 'microapps';

describe('router - with prefix', () => {
  beforeAll(() => {
    dynamoClient = new dynamodb.DynamoDBClient({
      endpoint: process.env.MOCK_DYNAMODB_ENDPOINT,
      tls: false,
      region: 'local',
    });

    // Init the DB manager to point it at the right table
    dbManager = new DBManager({ dynamoClient, tableName: TEST_TABLE_NAME });
  });

  it('should serve appframe with version and default file substitued', async () => {
    const app = new Application({
      AppName: 'Bat',
      DisplayName: 'Bat App',
    });
    await app.Save(dbManager);

    const version = new Version({
      AppName: 'Bat',
      DefaultFile: 'bat.html',
      IntegrationID: 'abcd',
      SemVer: '3.2.1-beta.1',
      Status: 'deployed',
      Type: 'lambda',
    });
    await version.Save(dbManager);

    const rules = new Rules({
      AppName: 'Bat',
      Version: 0,
      RuleSet: { default: { SemVer: '3.2.1-beta.1', AttributeName: '', AttributeValue: '' } },
    });
    await rules.Save(dbManager);

    // Call the handler
    const response = await GetRoute({
      dbManager,
      normalizedPathPrefix: '/qa',
      rawPath: '/qa/bat/',
    });

    expect(response).toHaveProperty('statusCode');
    expect(response.statusCode).toBe(200);
    expect(response).toBeDefined();
    expect(response.iFrameAppVersionPath).toBe('/qa/bat/3.2.1-beta.1/bat.html');
  });

  it('should 404 appframe with version if the prefix is missing', async () => {
    const app = new Application({
      AppName: 'Bat',
      DisplayName: 'Bat App',
    });
    await app.Save(dbManager);

    const version = new Version({
      AppName: 'Bat',
      DefaultFile: 'bat.html',
      IntegrationID: 'abcd',
      SemVer: '3.2.1-beta.1',
      Status: 'deployed',
      Type: 'lambda',
    });
    await version.Save(dbManager);

    const rules = new Rules({
      AppName: 'Bat',
      Version: 0,
      RuleSet: { default: { SemVer: '3.2.1-beta.1', AttributeName: '', AttributeValue: '' } },
    });
    await rules.Save(dbManager);

    // Call the handler
    const response = await GetRoute({ dbManager, normalizedPathPrefix: '/qa', rawPath: '/bat/' });

    expect(response).toHaveProperty('statusCode');
    expect(response.statusCode).toBe(404);
    expect(response.errorMessage).toBe('Request not routable');
  });
});
