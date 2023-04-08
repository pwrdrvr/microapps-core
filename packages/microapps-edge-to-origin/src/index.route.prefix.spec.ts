/// <reference types="jest" />
import 'reflect-metadata';
import 'jest-dynalite/withDb';
import * as dynamodb from '@aws-sdk/client-dynamodb';
import { Application, DBManager, Version, Rules } from '@pwrdrvr/microapps-datalib';
import { AppVersionCache } from '@pwrdrvr/microapps-router-lib/src/app-cache';
import * as lambda from 'aws-lambda';
import { Config, IConfig } from './config/config';
jest.mock('./config/config');
type Writeable<T> = { -readonly [P in keyof T]: T[P] };
const theConfig: Writeable<IConfig> = {
  awsAccountID: '00123456',
  awsRegion: 'mock',
  addXForwardedHostHeader: false,
  originRegion: 'us-west-1',
  replaceHostHeader: false,
  signingMode: 'sign',
  tableName: '',
  rootPathPrefix: '/prefix',
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
    jest.resetModules(); // Most important - it clears the cache

    overrideDBManager({ dbManager, dynamoClient });

    const appVersionCache = AppVersionCache.GetInstance({ dbManager });
    appVersionCache.ClearCache();

    // Reset the config that's visible to the handler back to defaults
    Object.keys(origConfig).forEach((key) => {
      (theConfig as { [index: string]: unknown })[key] = (
        origConfig as { [index: string]: unknown }
      )[key];
    });
  });

  it('should route `direct` app w/prefix request with appName to origin', async () => {
    theConfig.replaceHostHeader = true;

    const app = new Application({
      AppName: 'BatDirectPrefix',
      DisplayName: 'Direct Bat App',
    });
    await app.Save(dbManager);

    const version = new Version({
      AppName: 'BatDirectPrefix',
      SemVer: '1.2.1-beta.1',
      Status: 'deployed',
      Type: 'lambda-url',
      StartupType: 'direct',
      URL: 'https://abc123.lambda-url.us-east-1.on.aws/',
    });
    await version.Save(dbManager);

    const rules = new Rules({
      AppName: 'BatDirectPrefix',
      Version: 0,
      RuleSet: { default: { SemVer: '1.2.1-beta.1', AttributeName: '', AttributeValue: '' } },
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
                headers: {
                  host: [
                    {
                      key: 'Host',
                      value: 'zyz.cloudfront.net',
                    },
                  ],
                },
                method: 'GET',
                querystring: '',
                clientIp: '1.1.1.1',
                uri: '/prefix/batdirectprefix',
                origin: {
                  custom: {
                    customHeaders: {},
                    domainName: 'zyz.cloudfront.net',
                    keepaliveTimeout: 5,
                    path: '',
                    port: 443,
                    protocol: 'https',
                    readTimeout: 30,
                    sslProtocols: ['TLSv1.2'],
                  },
                },
              },
            },
          },
        ],
      } as lambda.CloudFrontRequestEvent,
      {} as lambda.Context,
    );

    const requestResponse = response as lambda.CloudFrontRequest;
    expect(requestResponse).toBeDefined();
    expect(requestResponse).not.toHaveProperty('status');
    expect(requestResponse).not.toHaveProperty('body');
    expect(requestResponse).toHaveProperty('headers');
    expect(requestResponse.headers).toHaveProperty('host');
    expect(requestResponse.headers.host).toHaveLength(1);
    expect(requestResponse.headers.host[0].key).toBe('Host');
    expect(requestResponse.headers.host[0].value).toBe('abc123.lambda-url.us-east-1.on.aws');
    expect(requestResponse).toHaveProperty('origin');
    expect(requestResponse.origin).toHaveProperty('custom');
    expect(requestResponse?.origin?.custom).toHaveProperty('domainName');
    expect(requestResponse?.origin?.custom?.domainName).toBe('abc123.lambda-url.us-east-1.on.aws');
  });

  it('should route `direct` app w/prefix request for [root] app to origin', async () => {
    theConfig.replaceHostHeader = true;

    const app = new Application({
      AppName: '[root]',
      DisplayName: 'Direct Bat App',
    });
    await app.Save(dbManager);

    const version = new Version({
      AppName: '[root]',
      SemVer: '1.2.1-beta.1',
      Status: 'deployed',
      Type: 'lambda-url',
      StartupType: 'direct',
      URL: 'https://abc123.lambda-url.us-east-1.on.aws/',
    });
    await version.Save(dbManager);

    const rules = new Rules({
      AppName: '[root]',
      Version: 0,
      RuleSet: { default: { SemVer: '1.2.1-beta.1', AttributeName: '', AttributeValue: '' } },
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
                headers: {
                  host: [
                    {
                      key: 'Host',
                      value: 'zyz.cloudfront.net',
                    },
                  ],
                },
                method: 'GET',
                querystring: '',
                clientIp: '1.1.1.1',
                uri: '/prefix',
                origin: {
                  custom: {
                    customHeaders: {},
                    domainName: 'zyz.cloudfront.net',
                    keepaliveTimeout: 5,
                    path: '',
                    port: 443,
                    protocol: 'https',
                    readTimeout: 30,
                    sslProtocols: ['TLSv1.2'],
                  },
                },
              },
            },
          },
        ],
      } as lambda.CloudFrontRequestEvent,
      {} as lambda.Context,
    );

    const requestResponse = response as lambda.CloudFrontRequest;
    expect(requestResponse).toBeDefined();
    expect(requestResponse).not.toHaveProperty('status');
    expect(requestResponse).not.toHaveProperty('body');
    expect(requestResponse).toHaveProperty('headers');
    expect(requestResponse.headers).toHaveProperty('host');
    expect(requestResponse.headers.host).toHaveLength(1);
    expect(requestResponse.headers.host[0].key).toBe('Host');
    expect(requestResponse.headers.host[0].value).toBe('abc123.lambda-url.us-east-1.on.aws');
    expect(requestResponse).toHaveProperty('origin');
    expect(requestResponse.origin).toHaveProperty('custom');
    expect(requestResponse?.origin?.custom).toHaveProperty('domainName');
    expect(requestResponse?.origin?.custom?.domainName).toBe('abc123.lambda-url.us-east-1.on.aws');
  });

  it('should route `direct` app w/prefix /someMethod request for [root] app to origin', async () => {
    theConfig.replaceHostHeader = true;

    const app = new Application({
      AppName: '[root]',
      DisplayName: 'Direct Bat App',
    });
    await app.Save(dbManager);

    const version = new Version({
      AppName: '[root]',
      SemVer: '1.2.1-beta.1',
      Status: 'deployed',
      Type: 'lambda-url',
      StartupType: 'direct',
      URL: 'https://abc123.lambda-url.us-east-1.on.aws/',
    });
    await version.Save(dbManager);

    const rules = new Rules({
      AppName: '[root]',
      Version: 0,
      RuleSet: { default: { SemVer: '1.2.1-beta.1', AttributeName: '', AttributeValue: '' } },
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
                headers: {
                  host: [
                    {
                      key: 'Host',
                      value: 'zyz.cloudfront.net',
                    },
                  ],
                },
                method: 'GET',
                querystring: '',
                clientIp: '1.1.1.1',
                uri: '/prefix/someMethod',
                origin: {
                  custom: {
                    customHeaders: {},
                    domainName: 'zyz.cloudfront.net',
                    keepaliveTimeout: 5,
                    path: '',
                    port: 443,
                    protocol: 'https',
                    readTimeout: 30,
                    sslProtocols: ['TLSv1.2'],
                  },
                },
              },
            },
          },
        ],
      } as lambda.CloudFrontRequestEvent,
      {} as lambda.Context,
    );

    const requestResponse = response as lambda.CloudFrontRequest;
    expect(requestResponse).toBeDefined();
    expect(requestResponse).not.toHaveProperty('status');
    expect(requestResponse).not.toHaveProperty('body');
    expect(requestResponse).toHaveProperty('headers');
    expect(requestResponse.headers).toHaveProperty('host');
    expect(requestResponse.headers.host).toHaveLength(1);
    expect(requestResponse.headers.host[0].key).toBe('Host');
    expect(requestResponse.headers.host[0].value).toBe('abc123.lambda-url.us-east-1.on.aws');
    expect(requestResponse).toHaveProperty('origin');
    expect(requestResponse.origin).toHaveProperty('custom');
    expect(requestResponse?.origin?.custom).toHaveProperty('domainName');
    expect(requestResponse?.origin?.custom?.domainName).toBe('abc123.lambda-url.us-east-1.on.aws');
  });

  it('should route `iframe` app w/prefix /someMethod request for [root] app to origin', async () => {
    theConfig.replaceHostHeader = true;

    const app = new Application({
      AppName: '[root]',
      DisplayName: 'Direct Bat App',
    });
    await app.Save(dbManager);

    const version = new Version({
      AppName: '[root]',
      SemVer: '1.2.2-beta.1',
      Status: 'deployed',
      Type: 'lambda-url',
      URL: 'https://abc123456.lambda-url.us-east-1.on.aws/',
    });
    await version.Save(dbManager);

    const rules = new Rules({
      AppName: '[root]',
      Version: 0,
      RuleSet: { default: { SemVer: '1.2.2-beta.1', AttributeName: '', AttributeValue: '' } },
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
                headers: {
                  host: [
                    {
                      key: 'Host',
                      value: 'zyz.cloudfront.net',
                    },
                  ],
                },
                method: 'GET',
                querystring: '',
                clientIp: '1.1.1.1',
                uri: '/prefix/1.2.2-beta.1/someMethod',
                origin: {
                  custom: {
                    customHeaders: {},
                    domainName: 'zyz.cloudfront.net',
                    keepaliveTimeout: 5,
                    path: '',
                    port: 443,
                    protocol: 'https',
                    readTimeout: 30,
                    sslProtocols: ['TLSv1.2'],
                  },
                },
              },
            },
          },
        ],
      } as lambda.CloudFrontRequestEvent,
      {} as lambda.Context,
    );

    const requestResponse = response as lambda.CloudFrontRequest;
    expect(requestResponse).toBeDefined();
    expect(requestResponse).not.toHaveProperty('status');
    expect(requestResponse).not.toHaveProperty('body');
    expect(requestResponse).toHaveProperty('headers');
    expect(requestResponse.headers).toHaveProperty('host');
    expect(requestResponse.headers.host).toHaveLength(1);
    expect(requestResponse.headers.host[0].key).toBe('Host');
    expect(requestResponse.headers.host[0].value).toBe('abc123456.lambda-url.us-east-1.on.aws');
    expect(requestResponse).toHaveProperty('origin');
    expect(requestResponse.origin).toHaveProperty('custom');
    expect(requestResponse?.origin?.custom).toHaveProperty('domainName');
    expect(requestResponse?.origin?.custom?.domainName).toBe(
      'abc123456.lambda-url.us-east-1.on.aws',
    );
  });
});
