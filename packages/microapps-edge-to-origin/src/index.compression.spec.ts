import 'reflect-metadata';
import type { CloudFrontRequest, CloudFrontRequestEvent, Context } from 'aws-lambda';
import { Config } from './config/config';
import { selectCompressedAsset } from './lib/compressed-assets';
jest.mock('./config/config');
jest.mock('./lib/compressed-assets', () => ({
  ...jest.requireActual('./lib/compressed-assets'),
  selectCompressedAsset: jest.fn(),
}));
const config = {
  precompressedAssets: true,
  tableName: '',
  locales: [],
  rootPathPrefix: '',
  signingMode: '',
  originRegion: 'us-east-1',
  addXForwardedHostHeader: false,
};
Object.defineProperty(Config, 'instance', { get: () => config });
import { handler } from './index';
const select = selectCompressedAsset as jest.Mock;
function request(): CloudFrontRequest {
  return {
    clientIp: '127.0.0.1',
    method: 'GET',
    uri: '/app/1.0.0/index.html',
    querystring: '',
    headers: { host: [{ key: 'Host', value: 'apps.example.com' }] },
    origin: {
      s3: {
        domainName: 'assets.s3.us-east-1.amazonaws.com',
        region: 'us-east-1',
        path: '',
        authMethod: 'origin-access-identity',
        customHeaders: { 'x-microapps-origin': [{ key: 'X-MicroApps-Origin', value: 's3' }] },
      },
    },
  };
}
async function invoke(req: CloudFrontRequest) {
  return handler(
    { Records: [{ cf: { request: req } }] } as CloudFrontRequestEvent,
    {} as Context,
    jest.fn(),
  );
}
beforeEach(() => {
  config.precompressedAssets = true;
  select.mockReset();
  select.mockResolvedValue('original');
});
it('negotiates S3 assets and repairs the Host header', async () => {
  select.mockImplementation(async (req: CloudFrontRequest) => {
    await Promise.resolve();
    req.uri += '.microapps.br';
    return Promise.resolve('compressed');
  });
  const req = request();
  expect(await invoke(req)).toBe(req);
  expect(req.uri).toMatch(/\.microapps.br$/);
  expect(req.headers.host[0].value).toBe('assets.s3.us-east-1.amazonaws.com');
});
it('does not perform S3 probes when disabled', async () => {
  config.precompressedAssets = false;
  const req = request();
  expect(await invoke(req)).toBe(req);
  expect(select).not.toHaveBeenCalled();
});
it('returns 406 when neither an encoded variant nor identity is acceptable', async () => {
  const req = request();
  req.headers['accept-encoding'] = [{ key: 'Accept-Encoding', value: 'gzip, identity;q=0' }];
  expect(await invoke(req)).toMatchObject({
    status: '406',
    headers: { vary: [{ key: 'Vary', value: 'Accept-Encoding' }] },
  });
});
it('keeps missing assets on the normal S3/app fallback path', async () => {
  select.mockResolvedValue('missing');
  const req = request();
  req.headers['accept-encoding'] = [{ key: 'Accept-Encoding', value: 'gzip, identity;q=0' }];
  expect(await invoke(req)).toBe(req);
});
it('restores the public URL if a selected sidecar disappears before the S3 GET', async () => {
  const req = request();
  req.uri += '.microapps.br';
  req.origin = {
    custom: {
      domainName: 'app.example.com',
      port: 443,
      protocol: 'https',
      path: '',
      sslProtocols: ['TLSv1.2'],
      readTimeout: 30,
      keepaliveTimeout: 5,
      customHeaders: {},
    },
  };
  expect(await invoke(req)).toBe(req);
  expect(req.uri).toBe('/app/1.0.0/index.html');
  expect(select).not.toHaveBeenCalled();
});

it('honors identity refusal in the preserved header after CloudFront normalization', async () => {
  const req = request();
  req.headers['accept-encoding'] = [{ key: 'Accept-Encoding', value: 'br,gzip' }];
  req.headers['x-microapps-accept-encoding'] = [
    { key: 'X-MicroApps-Accept-Encoding', value: 'gzip, identity;q=0' },
  ];
  expect(await invoke(req)).toMatchObject({ status: '406' });
});
