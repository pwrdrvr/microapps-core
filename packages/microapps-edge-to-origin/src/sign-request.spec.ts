import type * as lambda from 'aws-lambda';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-browser';
import { signRequest } from './sign-request';

describe('sign-request', () => {
  delete process.env.AWS_PROFILE;
  process.env.AWS_ACCESS_KEY_ID = 'fake-access-key-id';
  process.env.AWS_SECRET_ACCESS_KEY = 'fake-secret-access-key';
  process.env.AWS_SESSION_TOKEN = 'session-token';
  const signer = new SignatureV4({
    credentials: defaultProvider({}),
    region: 'us-east-1',
    service: 'lambda',
    sha256: Sha256,
  });

  it('signs simple request', async () => {
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

    const signedRequest = await signRequest(cfRequest, {} as lambda.Context, signer);

    expect(signedRequest).toBeDefined();
    expect(signedRequest.headers).toBeDefined();
    expect(signedRequest.headers['authorization']).toBeDefined();
    const date = new Date();
    const dateStr = `${date.getUTCFullYear()}${(date.getUTCMonth() + 1)
      .toString()
      .padStart(2, '0')}${date.getUTCDate().toString().padStart(2, '0')}`;
    expect(signedRequest.headers['authorization'][0].value).toContain(
      `AWS4-HMAC-SHA256 Credential=fake-access-key-id/${dateStr}/us-east-1/lambda/aws4_request, SignedHeaders=accept;host;x-amz-content-sha256;x-amz-date;x-amz-security-token, `,
    );
    expect(signedRequest.headers['x-amz-content-sha256']).toBeDefined();
    expect(signedRequest.headers['x-amz-date']).toBeDefined();
    expect(signedRequest.headers['x-amz-security-token']).toBeDefined();
    expect(signedRequest.headers['x-amz-security-token'][0].value).toEqual('session-token');
  });
});
