/// <reference types="jest" />
import 'reflect-metadata';
import 'jest-dynalite/withDb';
import * as dynamodb from '@aws-sdk/client-dynamodb';
import { Application, DBManager, Version, Rules } from '@pwrdrvr/microapps-datalib';
import * as lambda from 'aws-lambda';
import { Config, IConfig } from './config/Config';
jest.mock('./config/Config');
type Writeable<T> = { -readonly [P in keyof T]: T[P] };
const theConfig: Writeable<IConfig> = {
  awsAccountID: 123456,
  awsRegion: 'mock',
  addXForwardedHostHeader: false,
  originRegion: 'us-west-1',
  replaceHostHeader: false,
  signingMode: 'sign',
  tableName: '',
};
const origConfig = { ...theConfig };
Object.defineProperty(Config, 'instance', {
  configurable: false,
  enumerable: false,
  get: jest.fn((): IConfig => {
    return theConfig;
  }),
});
import { handler, overrideDBManager } from './index';

let dynamoClient: dynamodb.DynamoDBClient;
let dbManager: DBManager;

const TEST_TABLE_NAME = 'microapps';

describe('edge-to-origin - routing - without prefix', () => {
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

    // Reset the config that's visible to the handler back to defaults
    Object.keys(origConfig).forEach((key) => {
      (theConfig as { [index: string]: unknown })[key] = (
        origConfig as { [index: string]: unknown }
      )[key];
    });
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
    // @ts-expect-error no callback
    const response = await handler(
      {
        Records: [
          {
            cf: {
              config: {
                distributionDomainName: 'zyz.cloudfront.net',
                distributionId: '123',
                eventType: 'origin-request',
                requestId: '123',
              },
              request: {
                headers: {},
                method: 'GET',
                querystring: '',
                clientIp: '1.1.1.1',
                uri: '/bat/',
              },
            },
          },
        ],
      } as lambda.CloudFrontRequestEvent,
      {} as lambda.Context,
    );

    const responseResponse = response as lambda.CloudFrontResultResponse;
    expect(responseResponse).toBeDefined();
    expect(responseResponse).toHaveProperty('status');
    expect(responseResponse?.status).toBe('200');
    expect(responseResponse).toHaveProperty('body');
    expect(responseResponse.body?.length).toBeGreaterThan(80);
    expect(responseResponse.body).toContain('<iframe src="/bat/3.2.1-beta.1/bat.html" seamless');
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
    // @ts-expect-error no callback
    const response = await handler(
      {
        Records: [
          {
            cf: {
              config: {
                distributionDomainName: 'zyz.cloudfront.net',
                distributionId: '123',
                eventType: 'origin-request',
                requestId: '123',
              },
              request: {
                headers: {},
                method: 'GET',
                querystring: '',
                clientIp: '1.1.1.1',
                uri: '/bat/3.2.1-beta.1',
              },
            },
          },
        ],
      } as lambda.CloudFrontRequestEvent,
      {} as lambda.Context,
    );

    const responseResponse = response as lambda.CloudFrontResultResponse;
    expect(responseResponse).toHaveProperty('status');
    expect(responseResponse.status).toBe('200');
    expect(responseResponse.headers).not.toHaveProperty('location');
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
    // @ts-expect-error no callback
    const response = await handler(
      {
        Records: [
          {
            cf: {
              config: {
                distributionDomainName: 'zyz.cloudfront.net',
                distributionId: '123',
                eventType: 'origin-request',
                requestId: '123',
              },
              request: {
                headers: {},
                method: 'GET',
                querystring: '',
                clientIp: '1.1.1.1',
                uri: '/bat/3.2.1-beta.1',
              },
            },
          },
        ],
      } as lambda.CloudFrontRequestEvent,
      {} as lambda.Context,
    );

    const responseResponse = response as lambda.CloudFrontResultResponse;
    expect(responseResponse).toHaveProperty('status');
    expect(responseResponse.status).toBe('302');
    expect(responseResponse.headers).toHaveProperty('location');
    expect(responseResponse.headers?.location[0].value).toContain('/bat/3.2.1-beta.1/bat.html');
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
    // @ts-expect-error no callback
    const response = await handler(
      {
        Records: [
          {
            cf: {
              config: {
                distributionDomainName: 'zyz.cloudfront.net',
                distributionId: '123',
                eventType: 'origin-request',
                requestId: '123',
              },
              request: {
                headers: {},
                method: 'GET',
                querystring: '',
                clientIp: '1.1.1.1',
                uri: '/bat/3.2.1-beta.1',
              },
            },
          },
        ],
      } as lambda.CloudFrontRequestEvent,
      {} as lambda.Context,
    );

    const responseResponse = response as lambda.CloudFrontResultResponse;
    expect(responseResponse).toHaveProperty('status');
    expect(responseResponse.status).toBe('302');
    expect(responseResponse.headers).toHaveProperty('location');
    expect(responseResponse.headers?.location[0].value).toBe('/bat/3.2.1-beta.1/bat.html');
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
    // @ts-expect-error no callback
    const response = await handler(
      {
        Records: [
          {
            cf: {
              config: {
                distributionDomainName: 'zyz.cloudfront.net',
                distributionId: '123',
                eventType: 'origin-request',
                requestId: '123',
              },
              request: {
                headers: {},
                method: 'GET',
                querystring: '',
                clientIp: '1.1.1.1',
                uri: '/bat/notVersion',
              },
            },
          },
        ],
      } as lambda.CloudFrontRequestEvent,
      {} as lambda.Context,
    );

    const responseResponse = response as lambda.CloudFrontResultResponse;
    expect(responseResponse).toHaveProperty('status');
    expect(responseResponse.status).toBe('200');
    expect(responseResponse).toHaveProperty('body');
    expect(responseResponse.headers).not.toHaveProperty('location');
    expect(responseResponse.body?.length).toBeGreaterThan(80);
    expect(responseResponse.body).toContain('<iframe src="/bat/3.2.1-beta.1/bat.html" seamless');
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
    // @ts-expect-error no callback
    const response = await handler(
      {
        Records: [
          {
            cf: {
              config: {
                distributionDomainName: 'zyz.cloudfront.net',
                distributionId: '123',
                eventType: 'origin-request',
                requestId: '123',
              },
              request: {
                headers: {},
                method: 'GET',
                querystring: '',
                clientIp: '1.1.1.1',
                uri: '/bat/',
              },
            },
          },
        ],
      } as lambda.CloudFrontRequestEvent,
      {} as lambda.Context,
    );

    const responseResponse = response as lambda.CloudFrontResultResponse;
    expect(responseResponse).toHaveProperty('status');
    expect(responseResponse.status).toBe('200');
    expect(responseResponse).toHaveProperty('body');
    expect(responseResponse.headers).not.toHaveProperty('location');
    expect(responseResponse.body?.length).toBeGreaterThan(80);
    expect(responseResponse.body).toContain('<iframe src="/bat/3.2.1-beta1" seamless');
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
    // @ts-expect-error no callback
    const response = await handler(
      {
        Records: [
          {
            cf: {
              config: {
                distributionDomainName: 'zyz.cloudfront.net',
                distributionId: '123',
                eventType: 'origin-request',
                requestId: '123',
              },
              request: {
                headers: {},
                method: 'GET',
                querystring: '',
                clientIp: '1.1.1.1',
                uri: '/bat/demo/grid',
              },
            },
          },
        ],
      } as lambda.CloudFrontRequestEvent,
      {} as lambda.Context,
    );

    const responseResponse = response as lambda.CloudFrontResultResponse;
    expect(responseResponse).toHaveProperty('status');
    expect(responseResponse.status).toBe('200');
    expect(responseResponse).toHaveProperty('body');
    expect(responseResponse.headers).not.toHaveProperty('location');
    expect(responseResponse.body?.length).toBeGreaterThan(80);
    expect(responseResponse.body).toContain('<iframe src="/bat/3.2.1-beta2/demo/grid" seamless');
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
    // @ts-expect-error no callback
    const response = await handler(
      {
        Records: [
          {
            cf: {
              config: {
                distributionDomainName: 'zyz.cloudfront.net',
                distributionId: '123',
                eventType: 'origin-request',
                requestId: '123',
              },
              request: {
                headers: {},
                method: 'GET',
                querystring: '',
                clientIp: '1.1.1.1',
                uri: '/bat/demo',
              },
            },
          },
        ],
      } as lambda.CloudFrontRequestEvent,
      {} as lambda.Context,
    );

    const responseResponse = response as lambda.CloudFrontResultResponse;
    expect(responseResponse).toHaveProperty('status');
    expect(responseResponse.status).toBe('200');
    expect(responseResponse).toHaveProperty('body');
    expect(responseResponse.headers).not.toHaveProperty('location');
    expect(responseResponse.body?.length).toBeGreaterThan(80);
    expect(responseResponse.body).toContain('<iframe src="/bat/3.2.1-beta3/demo" seamless');
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
    // @ts-expect-error no callback
    const response = await handler(
      {
        Records: [
          {
            cf: {
              config: {
                distributionDomainName: 'zyz.cloudfront.net',
                distributionId: '123',
                eventType: 'origin-request',
                requestId: '123',
              },
              request: {
                headers: {},
                method: 'GET',
                querystring: '',
                clientIp: '1.1.1.1',
                uri: '/favicon.ico',
              },
            },
          },
        ],
      } as lambda.CloudFrontRequestEvent,
      {} as lambda.Context,
    );

    const responseResponse = response as lambda.CloudFrontResultResponse;
    expect(responseResponse).toHaveProperty('status');
    expect(responseResponse.status).toBe('404');
    expect(responseResponse).not.toHaveProperty('body');
  });
});
