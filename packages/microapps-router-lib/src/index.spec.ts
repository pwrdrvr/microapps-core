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

  describe('StartupType: iframe', () => {
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
        StartupType: 'iframe',
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
        SemVer: '3.2.1-beta.2',
        Status: 'deployed',
        Type: 'static',
        StartupType: 'iframe',
      });
      await version.Save(dbManager);

      const rules = new Rules({
        AppName: 'Bat',
        Version: 0,
        RuleSet: { default: { SemVer: '3.2.1-beta.2', AttributeName: '', AttributeValue: '' } },
      });
      await rules.Save(dbManager);

      // Call the handler
      const response = await GetRoute({ dbManager, rawPath: '/bat/3.2.1-beta.2/' });

      expect(response).toHaveProperty('appName');
      expect(response.appName).toBe('bat');
      expect(response).toHaveProperty('semVer');
      expect(response.semVer).toBe('3.2.1-beta.2');
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
        StartupType: 'iframe',
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
      const AppName = 'Bat123';
      const app = new Application({
        AppName,
        DisplayName: 'Bat App',
      });
      await app.Save(dbManager);

      const version = new Version({
        AppName,
        DefaultFile: 'bat.html',
        IntegrationID: 'abcd',
        SemVer: '3.2.1-beta.1',
        Status: 'deployed',
        Type: 'static',
        StartupType: 'iframe',
      });
      await version.Save(dbManager);

      const rules = new Rules({
        AppName,
        Version: 0,
        RuleSet: { default: { SemVer: '3.2.1-beta.1', AttributeName: '', AttributeValue: '' } },
      });
      await rules.Save(dbManager);

      // Call the handler
      const response = await GetRoute({ dbManager, rawPath: `/${AppName}/notVersion` });

      expect(response).toHaveProperty('statusCode');
      expect(response.statusCode).toBe(200);
      expect(response).toBeDefined();
      expect(response.iFrameAppVersionPath).toBe(`/${AppName}/3.2.1-beta.1/bat.html`);
    });

    it('should serve appframe with no default file', async () => {
      const AppName = 'Bat124';
      const app = new Application({
        AppName,
        DisplayName: 'Bat App',
      });
      await app.Save(dbManager);

      const version = new Version({
        AppName,
        DefaultFile: '',
        IntegrationID: 'abcd',
        SemVer: '3.2.1-beta1',
        Status: 'deployed',
        Type: 'lambda',
        StartupType: 'iframe',
      });
      await version.Save(dbManager);

      const rules = new Rules({
        AppName,
        Version: 0,
        RuleSet: { default: { SemVer: '3.2.1-beta1', AttributeName: '', AttributeValue: '' } },
      });
      await rules.Save(dbManager);

      // Call the handler
      const response = await GetRoute({ dbManager, rawPath: `/${AppName}/` });

      expect(response).toBeDefined();
      expect(response).toHaveProperty('statusCode');
      expect(response.statusCode).toBe(200);
      expect(response.iFrameAppVersionPath).toBe(`/${AppName}/3.2.1-beta1`);
    });

    it('should serve appframe with sub-route', async () => {
      const AppName = 'Bat125';
      const app = new Application({
        AppName,
        DisplayName: 'Bat App',
      });
      await app.Save(dbManager);

      const version = new Version({
        AppName,
        DefaultFile: '',
        IntegrationID: 'abcd',
        SemVer: '3.2.1-beta2',
        Status: 'deployed',
        Type: 'lambda',
        StartupType: 'iframe',
      });
      await version.Save(dbManager);

      const rules = new Rules({
        AppName,
        Version: 0,
        RuleSet: { default: { SemVer: '3.2.1-beta2', AttributeName: '', AttributeValue: '' } },
      });
      await rules.Save(dbManager);

      // Call the handler
      const response = await GetRoute({ dbManager, rawPath: `/${AppName}/demo/grid` });

      expect(response).toBeDefined();
      expect(response).toHaveProperty('statusCode');
      expect(response.statusCode).toBe(200);
      expect(response.iFrameAppVersionPath).toBe(`/${AppName}/3.2.1-beta2/demo/grid`);
    });

    it('should serve appframe with sub-route', async () => {
      const AppName = 'Bat126';
      const app = new Application({
        AppName,
        DisplayName: 'Bat App',
      });
      await app.Save(dbManager);

      const version = new Version({
        AppName,
        DefaultFile: 'someFile.html',
        IntegrationID: 'abcd',
        SemVer: '3.2.1-beta3',
        Status: 'deployed',
        Type: 'lambda',
        StartupType: 'iframe',
      });
      await version.Save(dbManager);

      const rules = new Rules({
        AppName,
        Version: 0,
        RuleSet: { default: { SemVer: '3.2.1-beta3', AttributeName: '', AttributeValue: '' } },
      });
      await rules.Save(dbManager);

      // Call the handler
      const response = await GetRoute({ dbManager, rawPath: `/${AppName}/demo` });

      expect(response).toBeDefined();
      expect(response).toHaveProperty('statusCode');
      expect(response.statusCode).toBe(200);
      expect(response.iFrameAppVersionPath).toBe(`/${AppName}/3.2.1-beta3/demo`);
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
        StartupType: 'iframe',
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

  describe('StartupType: direct', () => {
    it('should serve direct app with sub-route', async () => {
      const AppName = 'DirectBat126';
      const app = new Application({
        AppName,
        DisplayName: 'Bat App',
      });
      await app.Save(dbManager);

      const version = new Version({
        AppName,
        DefaultFile: 'someFile.html',
        IntegrationID: 'abcd',
        SemVer: '3.2.1-beta3',
        Status: 'deployed',
        Type: 'lambda-url',
        StartupType: 'direct',
        URL: 'https://abc123.lambda-url.us-east-1.on.aws',
        LambdaARN: 'arn:aws:lambda:us-east-1:123456789012:function:my-function',
      });
      await version.Save(dbManager);

      const rules = new Rules({
        AppName,
        Version: 0,
        RuleSet: { default: { SemVer: '3.2.1-beta3', AttributeName: '', AttributeValue: '' } },
      });
      await rules.Save(dbManager);

      // Call the handler
      const response = await GetRoute({ dbManager, rawPath: `/${AppName}/demo` });

      expect(response).toBeDefined();
      expect(response).toHaveProperty('statusCode');
      expect(response.statusCode).toBe(200);
      expect(response.appName).toBe(AppName);
      expect(response.semVer).toBe('3.2.1-beta3');
      expect(response.url).toBe('https://abc123.lambda-url.us-east-1.on.aws');
    });

    it('should serve direct app with /_next/data/[semver]/[appname]/route route', async () => {
      const AppName = 'DirectBatNextData';
      const app = new Application({
        AppName,
        DisplayName: 'Bat App',
      });
      await app.Save(dbManager);

      const version = new Version({
        AppName,
        DefaultFile: 'someFile.html',
        IntegrationID: 'abcd',
        SemVer: '3.2.1-beta3',
        Status: 'deployed',
        Type: 'lambda-url',
        StartupType: 'direct',
        URL: 'https://abc123.lambda-url.us-east-1.on.aws',
        LambdaARN: 'arn:aws:lambda:us-east-1:123456789012:function:my-function',
      });
      await version.Save(dbManager);

      const rules = new Rules({
        AppName,
        Version: 0,
        RuleSet: { default: { SemVer: '3.2.1-beta3', AttributeName: '', AttributeValue: '' } },
      });
      await rules.Save(dbManager);

      // Call the handler
      const response = await GetRoute({
        dbManager,
        rawPath: `/_next/data/3.2.1-beta3/${AppName}/demo`,
      });

      expect(response).toBeDefined();
      expect(response).toHaveProperty('statusCode');
      expect(response.appName).toBe(AppName);
      expect(response.semVer).toBe('3.2.1-beta3');
      expect(response.statusCode).toBe(200);
      expect(response.url).toBe('https://abc123.lambda-url.us-east-1.on.aws');
    });
  });
});
