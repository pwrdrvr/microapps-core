import { HeadObjectCommand, HeadObjectCommandOutput, S3Client } from '@aws-sdk/client-s3';
import type { CloudFrontRequest } from 'aws-lambda';
import { acceptedEncodings, acceptsIdentity, selectCompressedAsset } from './compressed-assets';

const send = jest.fn<Promise<Partial<HeadObjectCommandOutput>>, [HeadObjectCommand]>();
const spy = jest
  .spyOn(S3Client.prototype, 'send')
  // The SDK overload list ends in the callback form; this test uses its promise form.
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  .mockImplementation(send as unknown as S3Client['send']);
const objects = new Map<string, Partial<HeadObjectCommandOutput>>();
beforeEach(() => {
  objects.clear();
  send.mockReset();
  send.mockImplementation(async (command: HeadObjectCommand) => {
    await Promise.resolve();
    const object = objects.get(command.input.Key ?? '');
    if (object) return Promise.resolve(object);
    return Promise.reject({ $metadata: { httpStatusCode: 404 } });
  });
});
afterAll(() => spy.mockRestore());

it.each([
  ['gzip, br', ['br', 'gzip']],
  ['gzip;q=1, br;q=0.5', ['gzip', 'br']],
  ['br;q=0, gzip', ['gzip']],
  ['*;q=0.5, br;q=0', ['gzip']],
  ['identity;q=1, gzip;q=0.5', []],
  ['', []],
  ['br;q=invalid, gzip;q=2', []],
])('negotiates %s', (header, expected) => expect(acceptedEncodings(header)).toEqual(expected));
it.each([
  ['', true],
  ['gzip', true],
  ['*;q=0', false],
  ['identity;q=0', false],
  ['*;q=0, identity;q=1', true],
])('identity acceptance for %s', (header, expected) =>
  expect(acceptsIdentity(header)).toBe(expected),
);

function request(header = 'br, gzip'): CloudFrontRequest {
  return {
    clientIp: '127.0.0.1',
    method: 'GET',
    uri: '/app/1.0.0/a%20b.js',
    querystring: 'v=1',
    headers: { 'accept-encoding': [{ key: 'Accept-Encoding', value: header }] },
    origin: {
      s3: {
        domainName: 'assets.s3.us-east-2.amazonaws.com',
        region: 'us-east-2',
        authMethod: 'origin-access-identity',
        path: '/prefix',
        customHeaders: {},
      },
    },
  };
}
function original(encodings = 'br,gzip') {
  objects.set('prefix/app/1.0.0/a b.js', {
    Metadata: { 'microapps-encodings': encodings, 'microapps-sha256': 'digest' },
  });
}
function variant(encoding: 'br' | 'gzip', digest = 'digest') {
  objects.set(`prefix/app/1.0.0/a b.js.microapps.${encoding === 'br' ? 'br' : 'gz'}`, {
    ContentEncoding: encoding,
    Metadata: { 'microapps-sha256': digest },
  });
}
it('selects Brotli while preserving URI escaping, query string and origin path', async () => {
  original();
  variant('br');
  const req = request();
  await selectCompressedAsset(req);
  expect(req.uri).toBe('/app/1.0.0/a%20b.js.microapps.br');
  expect(req.querystring).toBe('v=1');
  expect((send.mock.calls[0][0] as HeadObjectCommand).input.Bucket).toBe('assets');
});
it('falls back to gzip when Brotli is absent', async () => {
  original();
  variant('gzip');
  const req = request();
  await selectCompressedAsset(req);
  expect(req.uri).toMatch(/\.microapps.gz$/);
});
it('ignores stale variants after an overwrite', async () => {
  original();
  variant('br', 'old-digest');
  variant('gzip', 'old-digest');
  const req = request();
  await selectCompressedAsset(req);
  expect(req.uri).toBe('/app/1.0.0/a%20b.js');
});
it('does not probe sidecars for an older or compression-disabled deployment', async () => {
  send.mockResolvedValue({});
  const req = request();
  await selectCompressedAsset(req);
  expect(req.uri).toBe('/app/1.0.0/a%20b.js');
  expect(send.mock.calls).toHaveLength(1);
});
it.each([403, 404])('leaves missing originals for normal S3/app fallback (%s)', async (status) => {
  send.mockRejectedValue({ $metadata: { httpStatusCode: status } });
  const req = request();
  await selectCompressedAsset(req);
  expect(req.uri).toBe('/app/1.0.0/a%20b.js');
});
it('propagates operational S3 failures', async () => {
  send.mockRejectedValue(new Error('unavailable'));
  await expect(selectCompressedAsset(request())).rejects.toThrow('unavailable');
});
it('skips ranges and clients without compression support', async () => {
  const range = request();
  range.headers.range = [{ key: 'Range', value: 'bytes=0-10' }];
  await selectCompressedAsset(range);
  await selectCompressedAsset(request('identity'));
  expect(send.mock.calls).toHaveLength(0);
});
it('selects a gzip-only publish for HEAD requests', async () => {
  original('gzip');
  variant('gzip');
  const req = { ...request(), method: 'HEAD' };
  await selectCompressedAsset(req);
  expect(req.uri).toMatch(/\.microapps.gz$/);
  expect(send.mock.calls).toHaveLength(2);
});
