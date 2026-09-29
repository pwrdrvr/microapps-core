import { runInNewContext } from 'vm';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { HttpOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { MicroAppsCF } from '../src/MicroAppsCF';

const stack = new Stack(new App(), 'viewer-function-test');
new MicroAppsCF(stack, 'distribution', {
  bucketAppsOriginApp: new HttpOrigin('app.example.com'),
  bucketAppsOriginS3: new HttpOrigin('assets.example.com'),
  precompressedAssets: true,
});
const preserveAcceptEncodingCode = Object.values(
  Template.fromStack(stack).findResources('AWS::CloudFront::Function'),
)[0].Properties.FunctionCode as string;

it.each([
  ['gzip, br', 'br,gzip'],
  ['br;q=0, gzip', 'gzip'],
  ['br;q=0.5, gzip;q=1', 'gzip'],
  ['identity;q=1, br;q=0.5', undefined],
  ['*;q=0', undefined],
  ['', undefined],
])(
  'preserves %s while restricting automatic compression to accepted encodings',
  (raw, automatic) => {
    const request = {
      headers: {
        'accept-encoding': { value: raw },
        'x-microapps-accept-encoding': { value: 'spoofed' },
      },
    };
    const result = runInNewContext(`${preserveAcceptEncodingCode}\nhandler(event)`, {
      event: { request },
    });
    expect(result.headers['x-microapps-accept-encoding'].value).toBe(raw);
    expect(result.headers['accept-encoding']?.value).toBe(automatic);
  },
);

it('handles absent and repeated headers without trusting a viewer-supplied internal header', () => {
  for (const headers of [
    { 'x-microapps-accept-encoding': { value: 'br' } },
    {
      'accept-encoding': { value: 'br;q=0', multiValue: [{ value: 'br;q=0' }, { value: 'gzip' }] },
    },
  ]) {
    const result = runInNewContext(`${preserveAcceptEncodingCode}\nhandler(event)`, {
      event: { request: { headers } },
    });
    expect(result.headers['x-microapps-accept-encoding'].value).toBe(
      headers['accept-encoding'] ? 'br;q=0,gzip' : '',
    );
  }
});
