/// <reference types="jest" />
import 'reflect-metadata';
import 'jest-dynalite/withDb';
import * as dynamodb from '@aws-sdk/client-dynamodb';
import { Application, DBManager, Version, Rules } from '@pwrdrvr/microapps-datalib';
import * as lambda from 'aws-lambda';
import { Config, IConfig } from './config/Config';
jest.mock('./config/Config');
const configMock = jest.fn((): IConfig => {
  return {
    db: {
      tableName: 'microapps',
    },
    rootPathPrefix: 'qa',
  };
});
Object.defineProperty(Config, 'instance', {
  configurable: false,
  enumerable: false,
  get: configMock,
});
import { handler, overrideDBManager } from './index';

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

  beforeEach(() => {
    overrideDBManager({ dbManager, dynamoClient });
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
    const response = await handler(
      { rawPath: '/qa/bat/' } as lambda.APIGatewayProxyEventV2,
      {} as lambda.Context,
    );

    expect(response).toHaveProperty('statusCode');
    expect(response.statusCode).toBe(200);
    expect(response).toBeDefined();
    expect(response).toHaveProperty('body');
    expect(response.body?.length).toBeGreaterThan(80);
    expect(response.body).toContain('<iframe src="/qa/bat/3.2.1-beta.1/bat.html" seamless');
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
    const response = await handler(
      { rawPath: '/bat/' } as lambda.APIGatewayProxyEventV2,
      {} as lambda.Context,
    );

    expect(response).toHaveProperty('statusCode');
    expect(response.statusCode).toBe(404);
    expect(response).toBeDefined();
    expect(response).not.toHaveProperty('body');
  });
});
