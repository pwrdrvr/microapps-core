/* eslint-disable @typescript-eslint/no-non-null-assertion */
// Used by ts-convict
import 'reflect-metadata';
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
};
const origConfig = { ...theConfig };
Object.defineProperty(Config, 'instance', {
  configurable: false,
  enumerable: false,
  get: jest.fn((): IConfig => {
    return theConfig;
  }),
});
import type * as lambda from 'aws-lambda';
import { handler } from './index';

describe('handler', () => {
  beforeEach(() => {
    jest.resetModules(); // Most important - it clears the cache

    // Reset the config that's visible to the handler back to defaults
    Object.keys(origConfig).forEach((key) => {
      (theConfig as { [index: string]: unknown })[key] = (
        origConfig as { [index: string]: unknown }
      )[key];
    });

    delete process.env.AWS_PROFILE;
    process.env.AWS_ACCESS_KEY_ID = 'fake-access-key-id';
    process.env.AWS_SECRET_ACCESS_KEY = 'fake-secret-access-key';
    process.env.AWS_SESSION_TOKEN = 'session-token';
  });

  it('overwrites host header when enabled', async () => {
    theConfig.replaceHostHeader = true;

    const cfRequest: lambda.CloudFrontRequest = {
      clientIp: '1.1.1.1',
      headers: {
        accept: [
          {
            key: 'accept',
            value:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          },
        ],
        host: [
          {
            key: 'host',
            value: 'test.pwrdrvr.com',
          },
        ],
        'x-forwarded-for': [
          {
            key: 'x-forwarded-for',
            value: '1.1.1.1, 2.2.2.2',
          },
        ],
      },
      method: 'GET',
      querystring: 'param1=value1&param2=value2',
      uri: '/test/test.html',
      origin: {
        // @ts-expect-error not specifying full obj
        custom: {
          domainName: 'test-origin.pwrdrvr.com',
        },
      },
    };

    const signedRequest = await handler(
      {
        Records: [
          {
            cf: {
              request: cfRequest,
              config: {
                distributionDomainName: 'test-edge.pwrdrvr.com',
                distributionId: 'ABC123',
                eventType: 'origin-request',
                requestId: 'ABC456',
              },
            },
          },
        ],
      },
      {} as lambda.Context,
      () => undefined,
    );

    expect(signedRequest).toBeDefined();
    expect(signedRequest!.headers).toBeDefined();
    expect(signedRequest!.headers!['host'][0].value).toEqual('test-origin.pwrdrvr.com');
  });

  it('does not overwrite host header when disabled', async () => {
    theConfig.replaceHostHeader = false;

    const cfRequest: lambda.CloudFrontRequest = {
      clientIp: '1.1.1.1',
      headers: {
        accept: [
          {
            key: 'accept',
            value:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          },
        ],
        host: [
          {
            key: 'host',
            value: 'test.pwrdrvr.com',
          },
        ],
        'x-forwarded-for': [
          {
            key: 'x-forwarded-for',
            value: '1.1.1.1, 2.2.2.2',
          },
        ],
      },
      method: 'GET',
      querystring: 'param1=value1&param2=value2',
      uri: '/test/test.html',
      origin: {
        // @ts-expect-error not specifying full obj
        custom: {
          domainName: 'test-origin.pwrdrvr.com',
        },
      },
    };

    const signedRequest = await handler(
      {
        Records: [
          {
            cf: {
              request: cfRequest,
              config: {
                distributionDomainName: 'test-edge.pwrdrvr.com',
                distributionId: 'ABC123',
                eventType: 'origin-request',
                requestId: 'ABC456',
              },
            },
          },
        ],
      },
      {} as lambda.Context,
      () => undefined,
    );

    expect(signedRequest).toBeDefined();
    expect(signedRequest!.headers).toBeDefined();
    expect(signedRequest!.headers!['host'][0].value).toEqual('test.pwrdrvr.com');
  });

  it('adds x-forwarded-host when enabled', async () => {
    theConfig.addXForwardedHostHeader = true;

    const cfRequest: lambda.CloudFrontRequest = {
      clientIp: '1.1.1.1',
      headers: {
        accept: [
          {
            key: 'accept',
            value:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          },
        ],
        host: [
          {
            key: 'host',
            value: 'test.pwrdrvr.com',
          },
        ],
        'x-forwarded-for': [
          {
            key: 'x-forwarded-for',
            value: '1.1.1.1, 2.2.2.2',
          },
        ],
      },
      method: 'GET',
      querystring: 'param1=value1&param2=value2',
      uri: '/test/test.html',
    };

    const signedRequest = await handler(
      {
        Records: [
          {
            cf: {
              request: cfRequest,
              config: {
                distributionDomainName: 'test-edge.pwrdrvr.com',
                distributionId: 'ABC123',
                eventType: 'origin-request',
                requestId: 'ABC456',
              },
            },
          },
        ],
      },
      {} as lambda.Context,
      () => undefined,
    );

    expect(signedRequest).toBeDefined();
    expect(signedRequest!.headers).toBeDefined();
    expect(signedRequest!.headers!['x-forwarded-host'][0].value).toEqual('test.pwrdrvr.com');
  });

  it('does not add x-forwarded-host when disabled', async () => {
    theConfig.addXForwardedHostHeader = false;

    const cfRequest: lambda.CloudFrontRequest = {
      clientIp: '1.1.1.1',
      headers: {
        accept: [
          {
            key: 'accept',
            value:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          },
        ],
        host: [
          {
            key: 'host',
            value: 'test.pwrdrvr.com',
          },
        ],
        'x-forwarded-for': [
          {
            key: 'x-forwarded-for',
            value: '1.1.1.1, 2.2.2.2',
          },
        ],
      },
      method: 'GET',
      querystring: 'param1=value1&param2=value2',
      uri: '/test/test.html',
    };

    const signedRequest = await handler(
      {
        Records: [
          {
            cf: {
              request: cfRequest,
              config: {
                distributionDomainName: 'test-edge.pwrdrvr.com',
                distributionId: 'ABC123',
                eventType: 'origin-request',
                requestId: 'ABC456',
              },
            },
          },
        ],
      },
      {} as lambda.Context,
      () => undefined,
    );

    expect(signedRequest).toBeDefined();
    expect(signedRequest!.headers).toBeDefined();
    expect(signedRequest!.headers!['x-forwarded-host']).toBeUndefined();
  });

  it('does not sign request when disabled', async () => {
    // @ts-expect-error yeah we want to delete this
    delete theConfig.signingMode;

    const cfRequest: lambda.CloudFrontRequest = {
      clientIp: '1.1.1.1',
      headers: {
        accept: [
          {
            key: 'accept',
            value:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          },
        ],
        host: [
          {
            key: 'host',
            value: 'test.pwrdrvr.com',
          },
        ],
        'x-forwarded-for': [
          {
            key: 'x-forwarded-for',
            value: '1.1.1.1, 2.2.2.2',
          },
        ],
      },
      method: 'GET',
      querystring: 'param1=value1&param2=value2',
      uri: '/test/test.html',
    };

    const unsignedRequest = await handler(
      {
        Records: [
          {
            cf: {
              request: cfRequest,
              config: {
                distributionDomainName: 'test-edge.pwrdrvr.com',
                distributionId: 'ABC123',
                eventType: 'origin-request',
                requestId: 'ABC456',
              },
            },
          },
        ],
      },
      {} as lambda.Context,
      () => undefined,
    );

    expect(unsignedRequest).toBeDefined();
    expect(unsignedRequest!.headers).toBeDefined();
    expect(unsignedRequest!.headers!['authorization']).toBeUndefined();
    expect(unsignedRequest!.headers!['x-amz-content-sha256']).toBeUndefined();
    expect(unsignedRequest!.headers!['x-amz-date']).toBeUndefined();
    expect(unsignedRequest!.headers!['x-amz-security-token']).toBeUndefined();
  });

  describe('signs simple request when enabled', () => {
    it('lambda', async () => {
      theConfig.addXForwardedHostHeader = true;

      const cfRequest: lambda.CloudFrontRequest = {
        clientIp: '1.1.1.1',
        headers: {
          accept: [
            {
              key: 'accept',
              value:
                'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            },
          ],
          host: [
            {
              key: 'host',
              value: 'test.pwrdrvr.com',
            },
          ],
          'x-forwarded-for': [
            {
              key: 'x-forwarded-for',
              value: '1.1.1.1, 2.2.2.2',
            },
          ],
        },
        method: 'GET',
        querystring: 'param1=value1&param2=value2',
        uri: '/test/test.html',
        origin: {
          // @ts-expect-error do not need full object for this test
          custom: { domainName: 'random-but-account-specific-name.lambda-url.us-east-2.on.aws' },
        },
      };

      const signedRequest = await handler(
        {
          Records: [
            {
              cf: {
                request: cfRequest,
                config: {
                  distributionDomainName: 'test-edge.pwrdrvr.com',
                  distributionId: 'ABC123',
                  eventType: 'origin-request',
                  requestId: 'ABC456',
                },
              },
            },
          ],
        },
        {} as lambda.Context,
        () => undefined,
      );

      expect(signedRequest).toBeDefined();
      expect(signedRequest!.headers).toBeDefined();
      expect(signedRequest!.headers!['authorization'][0].value).toBeDefined();
      const date = new Date();
      const dateStr = `${date.getUTCFullYear()}${(date.getUTCMonth() + 1)
        .toString()
        .padStart(2, '0')}${date.getUTCDate().toString().padStart(2, '0')}`;
      expect(signedRequest!.headers!['authorization'][0].value).toContain(
        `AWS4-HMAC-SHA256 Credential=fake-access-key-id/${dateStr}/us-west-1/lambda/aws4_request, SignedHeaders=accept;host;x-amz-content-sha256;x-amz-date;x-amz-security-token;x-forwarded-host,`,
      );
      expect(signedRequest!.headers!['x-amz-content-sha256'][0].value).toBeDefined();
      expect(signedRequest!.headers!['x-amz-date'][0].value).toBeDefined();
      expect(signedRequest!.headers!['x-amz-security-token'][0].value).toBeDefined();
      expect(signedRequest!.headers!['x-amz-security-token'][0].value).toEqual('session-token');
    });

    it('custom domain - assumes execute-api', async () => {
      theConfig.addXForwardedHostHeader = true;

      const cfRequest: lambda.CloudFrontRequest = {
        clientIp: '1.1.1.1',
        headers: {
          accept: [
            {
              key: 'accept',
              value:
                'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            },
          ],
          host: [
            {
              key: 'host',
              value: 'test.pwrdrvr.com',
            },
          ],
          'x-forwarded-for': [
            {
              key: 'x-forwarded-for',
              value: '1.1.1.1, 2.2.2.2',
            },
          ],
        },
        method: 'GET',
        querystring: 'param1=value1&param2=value2',
        uri: '/test/test.html',
        origin: {
          // @ts-expect-error do not need full object for this test
          custom: { domainName: 'some-custom-origin.pwrdrvr.com' },
        },
      };

      const signedRequest = await handler(
        {
          Records: [
            {
              cf: {
                request: cfRequest,
                config: {
                  distributionDomainName: 'test-edge.pwrdrvr.com',
                  distributionId: 'ABC123',
                  eventType: 'origin-request',
                  requestId: 'ABC456',
                },
              },
            },
          ],
        },
        {} as lambda.Context,
        () => undefined,
      );

      expect(signedRequest).toBeDefined();
      expect(signedRequest!.headers).toBeDefined();
      expect(signedRequest!.headers!['authorization'][0].value).toBeDefined();
      const date = new Date();
      const dateStr = `${date.getUTCFullYear()}${(date.getUTCMonth() + 1)
        .toString()
        .padStart(2, '0')}${date.getUTCDate().toString().padStart(2, '0')}`;
      expect(signedRequest!.headers!['authorization'][0].value).toContain(
        `AWS4-HMAC-SHA256 Credential=fake-access-key-id/${dateStr}/us-west-1/execute-api/aws4_request, SignedHeaders=accept;host;x-amz-content-sha256;x-amz-date;x-amz-security-token;x-forwarded-host,`,
      );
      expect(signedRequest!.headers!['x-amz-content-sha256'][0].value).toBeDefined();
      expect(signedRequest!.headers!['x-amz-date'][0].value).toBeDefined();
      expect(signedRequest!.headers!['x-amz-security-token'][0].value).toBeDefined();
      expect(signedRequest!.headers!['x-amz-security-token'][0].value).toEqual('session-token');
    });

    it('execute-api', async () => {
      theConfig.addXForwardedHostHeader = true;

      const cfRequest: lambda.CloudFrontRequest = {
        clientIp: '1.1.1.1',
        headers: {
          accept: [
            {
              key: 'accept',
              value:
                'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            },
          ],
          host: [
            {
              key: 'host',
              value: 'test.pwrdrvr.com',
            },
          ],
          'x-forwarded-for': [
            {
              key: 'x-forwarded-for',
              value: '1.1.1.1, 2.2.2.2',
            },
          ],
        },
        method: 'GET',
        querystring: 'param1=value1&param2=value2',
        uri: '/test/test.html',
        origin: {
          // @ts-expect-error do not need full object for this test
          custom: { domainName: 'random-api-id.execute-api.us-east-2.amazonaws.com' },
        },
      };

      const signedRequest = await handler(
        {
          Records: [
            {
              cf: {
                request: cfRequest,
                config: {
                  distributionDomainName: 'test-edge.pwrdrvr.com',
                  distributionId: 'ABC123',
                  eventType: 'origin-request',
                  requestId: 'ABC456',
                },
              },
            },
          ],
        },
        {} as lambda.Context,
        () => undefined,
      );

      expect(signedRequest).toBeDefined();
      expect(signedRequest!.headers).toBeDefined();
      expect(signedRequest!.headers!['authorization'][0].value).toBeDefined();
      const date = new Date();
      const dateStr = `${date.getUTCFullYear()}${(date.getUTCMonth() + 1)
        .toString()
        .padStart(2, '0')}${date.getUTCDate().toString().padStart(2, '0')}`;
      expect(signedRequest!.headers!['authorization'][0].value).toContain(
        `AWS4-HMAC-SHA256 Credential=fake-access-key-id/${dateStr}/us-west-1/execute-api/aws4_request, SignedHeaders=accept;host;x-amz-content-sha256;x-amz-date;x-amz-security-token;x-forwarded-host,`,
      );
      expect(signedRequest!.headers!['x-amz-content-sha256'][0].value).toBeDefined();
      expect(signedRequest!.headers!['x-amz-date'][0].value).toBeDefined();
      expect(signedRequest!.headers!['x-amz-security-token'][0].value).toBeDefined();
      expect(signedRequest!.headers!['x-amz-security-token'][0].value).toEqual('session-token');
    });
  });
});
