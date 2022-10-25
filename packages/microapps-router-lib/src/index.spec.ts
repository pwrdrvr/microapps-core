/// <reference types="jest" />
import 'jest-dynalite/withDb';
import * as dynamodb from '@aws-sdk/client-dynamodb';
import { Application, DBManager, Version, Rules } from '@pwrdrvr/microapps-datalib';
import { GetRoute } from './index';

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
    const response = await GetRoute({ dbManager, rawPath: '/bat/' });

    expect(response).toHaveProperty('statusCode');
    expect(response.statusCode).toBe(200);
    expect(response).toBeDefined();
    expect(response.iFrameAppVersionPath).toBe('/bat/3.2.1-beta.1/bat.html');
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
    const response = await GetRoute({ dbManager, rawPath: '/bat/3.2.1-beta.1' });

    expect(response).toHaveProperty('statusCode');
    expect(response.statusCode).toBe(302);
    expect(response.redirectLocation).toBeDefined();
    expect(response.redirectLocation).toBe('/bat/3.2.1-beta.1/bat.html');
  }, 60000);

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
    const response = await GetRoute({ dbManager, rawPath: '/bat/3.2.1-beta.1/' });

    expect(response).toHaveProperty('statusCode');
    expect(response.statusCode).toBe(200);
    expect(response.redirectLocation).not.toBeDefined();
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
    const response = await GetRoute({ dbManager, rawPath: '/bat/3.2.1-beta.1/' });

    expect(response).toHaveProperty('statusCode');
    expect(response.statusCode).toBe(302);
    expect(response.redirectLocation).toBeDefined();
    expect(response.redirectLocation).toBe('/bat/3.2.1-beta.1/bat.html');
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
    const response = await GetRoute({ dbManager, rawPath: '/bat/notVersion' });

    expect(response).toHaveProperty('statusCode');
    expect(response.statusCode).toBe(200);
    expect(response).toBeDefined();
    expect(response.iFrameAppVersionPath).toBe('/bat/3.2.1-beta.1/bat.html');
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
    const response = await GetRoute({ dbManager, rawPath: '/bat/' });

    expect(response).toBeDefined();
    expect(response).toHaveProperty('statusCode');
    expect(response.statusCode).toBe(200);
    expect(response.iFrameAppVersionPath).toBe('/bat/3.2.1-beta1');
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
    const response = await GetRoute({ dbManager, rawPath: '/bat/demo/grid' });

    expect(response).toBeDefined();
    expect(response).toHaveProperty('statusCode');
    expect(response.statusCode).toBe(200);
    expect(response.iFrameAppVersionPath).toBe('/bat/3.2.1-beta2/demo/grid');
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
    const response = await GetRoute({ dbManager, rawPath: '/bat/demo' });

    expect(response).toBeDefined();
    expect(response).toHaveProperty('statusCode');
    expect(response.statusCode).toBe(200);
    expect(response.iFrameAppVersionPath).toBe('/bat/3.2.1-beta3/demo');
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
    const response = await GetRoute({ dbManager, rawPath: '/favicon.ico' });

    expect(response).toBeDefined();
    expect(response).toHaveProperty('statusCode');
    expect(response.statusCode).toBe(404);
  });
});
