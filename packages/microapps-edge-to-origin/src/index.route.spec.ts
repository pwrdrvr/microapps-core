/// <reference types="jest" />
import 'reflect-metadata';
import 'jest-dynalite/withDb';
import * as dynamodb from '@aws-sdk/client-dynamodb';
import { Application, DBManager, Version, Rules } from '@pwrdrvr/microapps-datalib';
import * as lambda from 'aws-lambda';
import { Config, IConfig } from './config/config';
jest.mock('./config/config');
type Writeable<T> = { -readonly [P in keyof T]: T[P] };
const theConfig: Writeable<IConfig> = {
  awsAccountID: 123456,
  awsRegion: 'mock',
  addXForwardedHostHeader: false,
  originRegion: 'us-west-1',
  replaceHostHeader: false,
  signingMode: 'sign',
  tableName: '',
  rootPathPrefix: '',
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

  it('should route `iframe` app request with appName/version to origin', async () => {
    theConfig.replaceHostHeader = true;

    const app = new Application({
      AppName: 'Bat',
      DisplayName: 'Bat App',
    });
    await app.Save(dbManager);

    const version = new Version({
      AppName: 'Bat',
      IntegrationID: 'abcd',
      SemVer: '4.2.1-beta.1',
      Status: 'deployed',
      Type: 'lambda-url',
      URL: 'https://abc123.lambda-url.us-east-1.on.aws/',
    });
    await version.Save(dbManager);

    const rules = new Rules({
      AppName: 'Bat',
      Version: 0,
      RuleSet: { default: { SemVer: '4.2.1-beta.1', AttributeName: '', AttributeValue: '' } },
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
                uri: '/bat/4.2.1-beta.1',
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

  it('should route `direct` app request with appName to origin', async () => {
    theConfig.replaceHostHeader = true;

    const app = new Application({
      AppName: 'BatDirect',
      DisplayName: 'Direct Bat App',
    });
    await app.Save(dbManager);

    const version = new Version({
      AppName: 'BatDirect',
      SemVer: '1.2.1-beta.1',
      Status: 'deployed',
      Type: 'lambda-url',
      StartupType: 'direct',
      URL: 'https://abc123.lambda-url.us-east-1.on.aws/',
    });
    await version.Save(dbManager);

    const rules = new Rules({
      AppName: 'BatDirect',
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
                uri: '/batdirect',
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

  it('should route `direct` _next/data request with appName and version to origin', async () => {
    theConfig.replaceHostHeader = true;

    const app = new Application({
      AppName: 'BatDirect',
      DisplayName: 'Direct Bat App',
    });
    await app.Save(dbManager);

    {
      const version = new Version({
        AppName: 'BatDirect',
        SemVer: '1.2.1-beta.1',
        Status: 'deployed',
        Type: 'lambda-url',
        StartupType: 'direct',
        URL: 'https://abc123.lambda-url.us-east-1.on.aws/',
      });
      await version.Save(dbManager);
    }

    {
      const version = new Version({
        AppName: 'BatDirect',
        SemVer: '1.2.2-beta.1',
        Status: 'deployed',
        Type: 'lambda-url',
        StartupType: 'direct',
        URL: 'https://abc1234567.lambda-url.us-east-1.on.aws/',
      });
      await version.Save(dbManager);
    }

    const rules = new Rules({
      AppName: 'BatDirect',
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
                uri: '/batdirect/_next/data/1.2.2-beta.1/abc123.json',
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
    expect(requestResponse.headers.host[0].value).toBe('abc1234567.lambda-url.us-east-1.on.aws');
    expect(requestResponse).toHaveProperty('origin');
    expect(requestResponse.origin).toHaveProperty('custom');
    expect(requestResponse?.origin?.custom).toHaveProperty('domainName');
    expect(requestResponse?.origin?.custom?.domainName).toBe(
      'abc1234567.lambda-url.us-east-1.on.aws',
    );
  });

  // 404ing a "missing version" is kinda tricky and it means that the 2nd folder
  // can't look like a version or we'll always 404 it rather than passing it through.
  it.skip('should 404 `direct` _next/data request with appName and version to origin', async () => {
    theConfig.replaceHostHeader = true;

    const app = new Application({
      AppName: 'BatDirect',
      DisplayName: 'Direct Bat App',
    });
    await app.Save(dbManager);

    const version = new Version({
      AppName: 'BatDirect',
      SemVer: '1.2.1-beta.1',
      Status: 'deployed',
      Type: 'lambda-url',
      StartupType: 'direct',
      URL: 'https://abc123.lambda-url.us-east-1.on.aws/',
    });
    await version.Save(dbManager);

    const rules = new Rules({
      AppName: 'BatDirect',
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
                uri: '/batdirect/_next/data/1.2.2-beta.1/abc123.json',
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

    const responseResponse = response as lambda.CloudFrontResultResponse;
    expect(responseResponse).toBeDefined();
    expect(responseResponse).toHaveProperty('status');
    expect(responseResponse?.status).toBe('404');
    expect(responseResponse).not.toHaveProperty('body');
  });

  it('should route `iframe` app request with appName by creating iframe response for ?appver=[version]', async () => {
    theConfig.replaceHostHeader = true;

    const app = new Application({
      AppName: 'BatIframeAppVer',
      DisplayName: 'Direct Bat App',
    });
    await app.Save(dbManager);

    const versionDefault = new Version({
      AppName: 'BatIframeAppVer',
      SemVer: '1.2.1-beta.1',
      Status: 'deployed',
      Type: 'lambda-url',
      StartupType: 'iframe',
      URL: 'https://abc123.lambda-url.us-east-1.on.aws/',
    });
    await versionDefault.Save(dbManager);
    const versionNonDefault = new Version({
      AppName: 'BatIframeAppVer',
      SemVer: '1.2.3',
      Status: 'deployed',
      Type: 'lambda-url',
      StartupType: 'iframe',
      URL: 'https://abc123456.lambda-url.us-east-1.on.aws/',
    });
    await versionNonDefault.Save(dbManager);

    const rules = new Rules({
      AppName: 'BatIframeAppVer',
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
                querystring: 'appver=1.2.3',
                clientIp: '1.1.1.1',
                uri: '/batiframeappver',
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

    const responseResponse = response as lambda.CloudFrontResultResponse;
    expect(responseResponse).toBeDefined();
    expect(responseResponse).toHaveProperty('status');
    expect(responseResponse?.status).toBe('200');
    expect(responseResponse).toHaveProperty('body');
    expect(responseResponse.body?.length).toBeGreaterThan(80);
    expect(responseResponse.body).toContain('<iframe src="/batiframeappver/1.2.3" seamless');

    //
    // Make sure request with version in path AND ?appver does not add to the path
    //
    {
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
                  querystring: 'appver=1.2.3',
                  clientIp: '1.1.1.1',
                  uri: '/batiframeappver/1.2.3',
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
      expect(requestResponse.uri).toBe('/batiframeappver/1.2.3');
      expect(requestResponse.origin?.custom?.domainName).toBe(
        'abc123456.lambda-url.us-east-1.on.aws',
      );
      expect(requestResponse).not.toHaveProperty('status');
      expect(requestResponse).not.toHaveProperty('body');
    }

    //
    // Request with non-matching version in path and conflicting
    // ?appver should use version in path already
    //
    {
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
                  querystring: 'appver=1.2.3',
                  clientIp: '1.1.1.1',
                  uri: '/batiframeappver/1.2.1-beta.1',
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
      expect(requestResponse.uri).toBe('/batiframeappver/1.2.1-beta.1');
      expect(requestResponse.origin?.custom?.domainName).toBe('abc123.lambda-url.us-east-1.on.aws');
      expect(requestResponse).not.toHaveProperty('status');
      expect(requestResponse).not.toHaveProperty('body');
    }
  });

  it('should route `direct` app request with appName to origin for ?appver=[version]', async () => {
    theConfig.replaceHostHeader = true;

    const app = new Application({
      AppName: 'BatDirectAppVer',
      DisplayName: 'Direct Bat App',
    });
    await app.Save(dbManager);

    const versionDefault = new Version({
      AppName: 'BatDirectAppVer',
      SemVer: '1.2.1-beta.1',
      Status: 'deployed',
      Type: 'lambda-url',
      StartupType: 'direct',
      URL: 'https://abc123.lambda-url.us-east-1.on.aws/',
    });
    await versionDefault.Save(dbManager);
    const versionNonDefault = new Version({
      AppName: 'BatDirectAppVer',
      SemVer: '1.2.3',
      Status: 'deployed',
      Type: 'lambda-url',
      StartupType: 'direct',
      URL: 'https://abc123456.lambda-url.us-east-1.on.aws/',
    });
    await versionNonDefault.Save(dbManager);

    const rules = new Rules({
      AppName: 'BatDirectAppVer',
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
                querystring: 'appver=1.2.3',
                clientIp: '1.1.1.1',
                uri: '/batdirectappver',
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
    expect(requestResponse.querystring).toBe('');
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

    //
    // ?appver=[defaultversion] should select the default version correctly
    //
    {
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
                  querystring: 'appver=1.2.1-beta.1',
                  clientIp: '1.1.1.1',
                  uri: '/batdirectappver',
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
      expect(requestResponse.querystring).toBe('');
      expect(requestResponse).toHaveProperty('headers');
      expect(requestResponse.headers).toHaveProperty('host');
      expect(requestResponse.headers.host).toHaveLength(1);
      expect(requestResponse.headers.host[0].key).toBe('Host');
      expect(requestResponse.headers.host[0].value).toBe('abc123.lambda-url.us-east-1.on.aws');
      expect(requestResponse).toHaveProperty('origin');
      expect(requestResponse.origin).toHaveProperty('custom');
      expect(requestResponse?.origin?.custom).toHaveProperty('domainName');
      expect(requestResponse?.origin?.custom?.domainName).toBe(
        'abc123.lambda-url.us-east-1.on.aws',
      );
    }

    //
    // ?appver=[defaultversion] should select the default version correctly
    //
    {
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
                  querystring: 'appver=1.2.1-beta.1',
                  clientIp: '1.1.1.1',
                  uri: '/batdirectappver',
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
      expect(requestResponse?.origin?.custom?.domainName).toBe(
        'abc123.lambda-url.us-east-1.on.aws',
      );
    }
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
    expect(responseResponse.status).toBe('404');
    expect(responseResponse).not.toHaveProperty('headers');
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

  it('should serve appframe with sub-sub-route - beta2', async () => {
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

  it('should serve appframe with sub-route - beta3', async () => {
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
