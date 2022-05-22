import type * as lambda from 'aws-lambda';
import { cloudfrontToSignableRequest } from './translate-request';

describe('translate-request', () => {
  it('converts CloudFront request to signable request - GET', () => {
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

    const httpRequest = cloudfrontToSignableRequest({ request: cfRequest });

    expect(httpRequest).toBeDefined();
    expect(httpRequest.method).toEqual('GET');
    expect(httpRequest.port).toEqual(443);
    expect(httpRequest.protocol).toEqual('https:');
    expect(httpRequest.path).toEqual('/test/test.html');
    expect(httpRequest.hostname).toEqual('test.pwrdrvr.com');
    expect(httpRequest.query).toBeDefined();
    expect(httpRequest.query).toEqual({
      param1: 'value1',
      param2: 'value2',
    });
    expect(httpRequest.headers).toBeDefined();
    expect(httpRequest.headers).toEqual({
      accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      host: 'test.pwrdrvr.com',
    });
  });

  it('converts CloudFront request to signable request - funky search query string', () => {
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
      querystring:
        'q=cat&country=US&language=en&page[number]=1&page[size]=0&queryTranslations=true&fields[images]=&recordActivity=true&namespace=shutterstock&activity_type=footage_search',
      uri: '/test/test.html',
    };

    const httpRequest = cloudfrontToSignableRequest({ request: cfRequest });

    expect(httpRequest).toBeDefined();
    expect(httpRequest.method).toEqual('GET');
    expect(httpRequest.port).toEqual(443);
    expect(httpRequest.protocol).toEqual('https:');
    expect(httpRequest.path).toEqual('/test/test.html');
    expect(httpRequest.hostname).toEqual('test.pwrdrvr.com');
    expect(httpRequest.query).toBeDefined();
    expect(httpRequest.query).toEqual({
      activity_type: 'footage_search',
      country: 'US',
      'fields[images]': '',
      language: 'en',
      namespace: 'shutterstock',
      'page[number]': '1',
      'page[size]': '0',
      q: 'cat',
      queryTranslations: 'true',
      recordActivity: 'true',
    });
    expect(cfRequest.querystring).toEqual(
      'q=cat&country=US&language=en&page%5Bnumber%5D=1&page%5Bsize%5D=0&queryTranslations=true&fields%5Bimages%5D=&recordActivity=true&namespace=shutterstock&activity_type=footage_search',
    );
    expect(httpRequest.headers).toBeDefined();
    expect(httpRequest.headers).toEqual({
      accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      host: 'test.pwrdrvr.com',
    });
  });

  it('converts CloudFront request to signable request - POST w/ body', () => {
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
      },
      method: 'GET',
      querystring: 'param1=value1&param2=value2',
      uri: '/test/test.html',
      body: {
        encoding: 'base64',
        data: 'SGVsbG8gV29ybGQ=',
        inputTruncated: false,
        action: 'replace',
      },
    };

    const httpRequest = cloudfrontToSignableRequest({ request: cfRequest });

    expect(httpRequest).toBeDefined();
    expect(httpRequest.method).toEqual('GET');
    expect(httpRequest.port).toEqual(443);
    expect(httpRequest.protocol).toEqual('https:');
    expect(httpRequest.path).toEqual('/test/test.html');
    expect(httpRequest.hostname).toEqual('test.pwrdrvr.com');
    expect(httpRequest.query).toBeDefined();
    expect(httpRequest.query).toEqual({
      param1: 'value1',
      param2: 'value2',
    });
    expect(httpRequest.headers).toBeDefined();
    expect(httpRequest.headers).toEqual({
      accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      host: 'test.pwrdrvr.com',
    });
    const decodedBody = Buffer.from(httpRequest.body, 'base64').toString('utf8');
    expect(decodedBody).toEqual('Hello World');
  });
});
