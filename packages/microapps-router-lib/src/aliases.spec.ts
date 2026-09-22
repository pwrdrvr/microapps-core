import '../../../tests/dynamodb-local/with-db.cjs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Application, DBManager, Rules, Version } from '@pwrdrvr/microapps-datalib';
import { GetRoute } from './get-route';
import { AppVersionCache } from './app-cache';

const client = new DynamoDBClient({
  endpoint: process.env.MOCK_DYNAMODB_ENDPOINT,
  region: 'local',
});
const dbManager = new DBManager({ dynamoClient: client, tableName: 'microapps' });
const cache = AppVersionCache.GetInstance({ dbManager });

beforeEach(async () => {
  cache.ClearCache();
  await new Application({
    AppName: 'ecommerce',
    DisplayName: 'Shop',
    ExtraAppNames: ['search', 'product'],
  }).Save(dbManager);
  for (const SemVer of ['1.0.0', '2.0.0']) {
    await new Version({
      AppName: 'ecommerce',
      SemVer,
      Status: 'deployed',
      Type: 'lambda-url',
      StartupType: 'direct',
      URL: `https://${SemVer[0]}.lambda-url.us-east-1.on.aws/`,
    }).Save(dbManager);
  }
  await new Rules({
    AppName: 'ecommerce',
    Version: 0,
    RuleSet: { default: { SemVer: '1.0.0', AttributeName: '', AttributeValue: '' } },
  }).Save(dbManager);
});
afterAll(() => client.destroy());

describe('application aliases', () => {
  it.each([
    ['/search', '1.0.0', false],
    ['/product/api/item', '1.0.0', true],
    ['/search/2.0.0/api/item', '2.0.0', true],
    ['/sv/product', '1.0.0', false],
    ['/_next/data/2.0.0/product.json', '2.0.0', false],
    ['/_next/data/2.0.0/sv/search.json', '2.0.0', false],
  ])('resolves %s using the canonical app and version', async (rawPath, semVer, isAPIPath) => {
    expect(await GetRoute({ dbManager, rawPath, locales: ['sv'] })).toMatchObject({
      statusCode: 200,
      appName: 'ecommerce',
      semVer,
      isAPIPath,
    });
  });

  it('routes aliases below a deployment prefix and locale', async () => {
    expect(
      await GetRoute({
        dbManager,
        rawPath: '/qa/sv/product/2.0.0/api/item',
        normalizedPathPrefix: '/qa',
        locales: ['sv'],
      }),
    ).toMatchObject({ statusCode: 200, appName: 'ecommerce', semVer: '2.0.0', isAPIPath: true });
    expect(
      await GetRoute({ dbManager, rawPath: '/qa2/product', normalizedPathPrefix: '/qa' }),
    ).toMatchObject({ statusCode: 404 });
  });

  it('uses the canonical app for explicit query versions and rejects unknown versions', async () => {
    expect(
      await GetRoute({
        dbManager,
        rawPath: '/search',
        queryStringParameters: new URLSearchParams('appver=2.0.0'),
      }),
    ).toMatchObject({ statusCode: 200, appName: 'ecommerce', semVer: '2.0.0' });
    expect(
      await GetRoute({
        dbManager,
        rawPath: '/search',
        queryStringParameters: new URLSearchParams('appver=9.0.0'),
      }),
    ).toMatchObject({ statusCode: 404 });
  });

  it('shares version and rule cache entries across aliases', async () => {
    const load = jest.spyOn(Application, 'GetVersionsAndRules');
    await GetRoute({ dbManager, rawPath: '/search' });
    await GetRoute({ dbManager, rawPath: '/product' });
    expect(load).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledWith({ dbManager, key: { AppName: 'ecommerce' } });
    load.mockRestore();
  });

  it('expires removed aliases and negative cache entries', async () => {
    const now = Date.now();
    const clock = jest.spyOn(Date, 'now').mockReturnValue(now);
    try {
      expect((await GetRoute({ dbManager, rawPath: '/search' })).statusCode).toBe(200);
      expect((await GetRoute({ dbManager, rawPath: '/newroute' })).statusCode).toBe(404);
      const app = await Application.Load({ dbManager, key: { AppName: 'ecommerce' } });
      app.ExtraAppNames = ['newroute'];
      await app.Save(dbManager);
      clock.mockReturnValue(now + 61000);
      expect((await GetRoute({ dbManager, rawPath: '/search' })).statusCode).toBe(404);
      expect((await GetRoute({ dbManager, rawPath: '/newroute' })).appName).toBe('ecommerce');
    } finally {
      clock.mockRestore();
    }
  });
});
