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
    rootPathPrefix: '',
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

describe('router - without prefix', () => {
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
      { rawPath: '/bat/' } as lambda.APIGatewayProxyEventV2,
      {} as lambda.Context,
    );

    expect(response).toHaveProperty('statusCode');
    expect(response.statusCode).toBe(200);
    expect(response).toBeDefined();
    expect(response).toHaveProperty('body');
    expect(response.body?.length).toBeGreaterThan(80);
    expect(response.body).toContain('<iframe src="/bat/3.2.1-beta.1/bat.html" seamless');
  });

  it('static app - request to app/x.y.z/ should not redirect if no defaultFile', async () => {
    const app = new Application({
      AppName: 'Bat',
      DisplayName: 'Bat App',
    });
    await app.Save(dbManager);

    const version = new Version({
      AppName: 'Bat',
      IntegrationID: 'abcd',
      SemVer: '3.2.1-beta.1',
      Status: 'deployed',
      Type: 'static',
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
      { rawPath: '/bat/3.2.1-beta.1' } as lambda.APIGatewayProxyEventV2,
      {} as lambda.Context,
    );

    expect(response).toHaveProperty('statusCode');
    expect(response.statusCode).toBe(200);
    expect(response.headers?.Location).not.toBeDefined();
  });

  it('static app - request to app/x.y.z should redirect to defaultFile', async () => {
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
      Type: 'static',
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
      { rawPath: '/bat/3.2.1-beta.1' } as lambda.APIGatewayProxyEventV2,
      {} as lambda.Context,
    );

    expect(response).toHaveProperty('statusCode');
    expect(response.statusCode).toBe(302);
    expect(response).toBeDefined();
    expect(response.headers).toBeDefined();
    expect(response.headers).toHaveProperty('Location');
    expect(response.headers?.Location).toContain('/bat/3.2.1-beta.1/bat.html');
  });

  it('static app - request to app/x.y.z/ should redirect to defaultFile', async () => {
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
      Type: 'static',
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
      { rawPath: '/bat/3.2.1-beta.1/' } as lambda.APIGatewayProxyEventV2,
      {} as lambda.Context,
    );

    expect(response).toHaveProperty('statusCode');
    expect(response.statusCode).toBe(302);
    expect(response).toBeDefined();
    expect(response.headers).toBeDefined();
    expect(response.headers).toHaveProperty('Location');
    expect(response.headers?.Location).toContain('/bat/3.2.1-beta.1/bat.html');
  });

  it('static app - request to app/notVersion should load app frame with defaultFile', async () => {
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
      Type: 'static',
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
      { rawPath: '/bat/notVersion' } as lambda.APIGatewayProxyEventV2,
      {} as lambda.Context,
    );

    expect(response).toHaveProperty('statusCode');
    expect(response.statusCode).toBe(200);
    expect(response).toBeDefined();
    expect(response).toHaveProperty('body');
    expect(response.body?.length).toBeGreaterThan(80);
    expect(response.body).toContain('<iframe src="/bat/3.2.1-beta.1/bat.html" seamless');
  });

  it('should serve appframe with no default file', async () => {
    const app = new Application({
      AppName: 'Bat',
      DisplayName: 'Bat App',
    });
    await app.Save(dbManager);

    const version = new Version({
      AppName: 'Bat',
      DefaultFile: '',
      IntegrationID: 'abcd',
      SemVer: '3.2.1-beta1',
      Status: 'deployed',
      Type: 'lambda',
    });
    await version.Save(dbManager);

    const rules = new Rules({
      AppName: 'Bat',
      Version: 0,
      RuleSet: { default: { SemVer: '3.2.1-beta1', AttributeName: '', AttributeValue: '' } },
    });
    await rules.Save(dbManager);

    // Call the handler
    const response = await handler(
      { rawPath: '/bat/' } as lambda.APIGatewayProxyEventV2,
      {} as lambda.Context,
    );

    expect(response).toBeDefined();
    expect(response).toHaveProperty('statusCode');
    expect(response.statusCode).toBe(200);
    expect(response).toHaveProperty('body');
    expect(response.body?.length).toBeGreaterThan(80);
    expect(response.body).toContain('<iframe src="/bat/3.2.1-beta1" seamless');
  });

  it('should serve appframe with sub-route', async () => {
    const app = new Application({
      AppName: 'Bat',
      DisplayName: 'Bat App',
    });
    await app.Save(dbManager);

    const version = new Version({
      AppName: 'Bat',
      DefaultFile: '',
      IntegrationID: 'abcd',
      SemVer: '3.2.1-beta2',
      Status: 'deployed',
      Type: 'lambda',
    });
    await version.Save(dbManager);

    const rules = new Rules({
      AppName: 'Bat',
      Version: 0,
      RuleSet: { default: { SemVer: '3.2.1-beta2', AttributeName: '', AttributeValue: '' } },
    });
    await rules.Save(dbManager);

    // Call the handler
    const response = await handler(
      { rawPath: '/bat/demo/grid' } as lambda.APIGatewayProxyEventV2,
      {} as lambda.Context,
    );

    expect(response).toBeDefined();
    expect(response).toHaveProperty('statusCode');
    expect(response.statusCode).toBe(200);
    expect(response).toHaveProperty('body');
    expect(response.body?.length).toBeGreaterThan(80);
    expect(response.body).toContain('<iframe src="/bat/3.2.1-beta2/demo/grid" seamless');
  });

  it('should serve appframe with sub-route', async () => {
    const app = new Application({
      AppName: 'Bat',
      DisplayName: 'Bat App',
    });
    await app.Save(dbManager);

    const version = new Version({
      AppName: 'Bat',
      DefaultFile: 'someFile.html',
      IntegrationID: 'abcd',
      SemVer: '3.2.1-beta3',
      Status: 'deployed',
      Type: 'lambda',
    });
    await version.Save(dbManager);

    const rules = new Rules({
      AppName: 'Bat',
      Version: 0,
      RuleSet: { default: { SemVer: '3.2.1-beta3', AttributeName: '', AttributeValue: '' } },
    });
    await rules.Save(dbManager);

    // Call the handler
    const response = await handler(
      { rawPath: '/bat/demo' } as lambda.APIGatewayProxyEventV2,
      {} as lambda.Context,
    );

    expect(response).toBeDefined();
    expect(response).toHaveProperty('statusCode');
    expect(response.statusCode).toBe(200);
    expect(response).toHaveProperty('body');
    expect(response.body?.length).toBeGreaterThan(80);
    expect(response.body).toContain('<iframe src="/bat/3.2.1-beta3/demo" seamless');
  });

  it('should return 404 for /favicon.ico', async () => {
    const app = new Application({
      AppName: 'Bat',
      DisplayName: 'Bat App',
    });
    await app.Save(dbManager);

    const version = new Version({
      AppName: 'Bat',
      DefaultFile: 'someFile.html',
      IntegrationID: 'abcd',
      SemVer: '3.2.1-beta3',
      Status: 'deployed',
      Type: 'lambda',
    });
    await version.Save(dbManager);

    const rules = new Rules({
      AppName: 'Bat',
      Version: 0,
      RuleSet: { default: { SemVer: '3.2.1-beta3', AttributeName: '', AttributeValue: '' } },
    });
    await rules.Save(dbManager);

    // Call the handler
    const response = await handler(
      { rawPath: '/favicon.ico' } as lambda.APIGatewayProxyEventV2,
      {} as lambda.Context,
    );

    expect(response).toBeDefined();
    expect(response).toHaveProperty('statusCode');
    expect(response.statusCode).toBe(404);
  });
});
