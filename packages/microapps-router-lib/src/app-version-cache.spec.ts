/// <reference types="jest" />
import 'jest-dynalite/withDb';
import * as dynamodb from '@aws-sdk/client-dynamodb';
import { Application, DBManager, Version, Rules } from '@pwrdrvr/microapps-datalib';
import { AppVersionCache } from './app-version-cache';

let dynamoClient: dynamodb.DynamoDBClient;
let dbManager: DBManager;

const TEST_TABLE_NAME = 'microapps';

describe('app-version-cache', () => {
  beforeAll(() => {
    dynamoClient = new dynamodb.DynamoDBClient({
      endpoint: process.env.MOCK_DYNAMODB_ENDPOINT,
      tls: false,
      region: 'local',
    });

    // Init the DB manager to point it at the right table
    dbManager = new DBManager({ dynamoClient, tableName: TEST_TABLE_NAME });
  });

  it('LoadVersion - Positive Cache', async () => {
    const app = new Application({
      AppName: 'Cached',
      DisplayName: 'Cached App',
    });
    await app.Save(dbManager);

    const version = new Version({
      AppName: 'Cached',
      LambdaARN: 'arn:aws:lambda:us-east-1:123456789012:function:cached',
      URL: 'https://some-lambda-function-url-id.lambda-url.us-east-2.on.aws/',
      SemVer: '3.2.1-beta.1',
      Status: 'deployed',
      Type: 'lambda',
    });
    await version.Save(dbManager);

    const rules = new Rules({
      AppName: 'Cached',
      Version: 0,
      RuleSet: { default: { SemVer: '3.2.1-beta.1', AttributeName: '', AttributeValue: '' } },
    });
    await rules.Save(dbManager);

    // Seed the cache while record exists
    const versionWhenDBExists = await AppVersionCache.LoadVersion({
      dbManager,
      key: { AppName: 'Cached', SemVer: '3.2.1-beta.1' },
    });

    expect(versionWhenDBExists).toHaveProperty('AppName', 'cached');
    expect(versionWhenDBExists).toHaveProperty(
      'URL',
      'https://some-lambda-function-url-id.lambda-url.us-east-2.on.aws/',
    );
    expect(versionWhenDBExists).toHaveProperty('SemVer', '3.2.1-beta.1');
    expect(versionWhenDBExists).toHaveProperty('Status', 'deployed');
    expect(versionWhenDBExists).toHaveProperty('Type', 'lambda');

    // Delete the record
    await Version.DeleteVersion({ dbManager, key: { AppName: 'Cached', SemVer: '3.2.1-beta.1' } });

    // Get record from cache after DB record is deleted
    const versionWhenDBCleared = await AppVersionCache.LoadVersion({
      dbManager,
      key: { AppName: 'Cached', SemVer: '3.2.1-beta.1' },
    });

    expect(versionWhenDBCleared).toEqual(versionWhenDBExists);
  });

  it('LoadVersion - Negative Cache', async () => {
    // Seed the negative cache
    const versionWhenDBExists = await AppVersionCache.LoadVersion({
      dbManager,
      key: { AppName: 'Missing', SemVer: '7.6.8' },
    });

    // Confirm record is not in the DB
    expect(versionWhenDBExists).toBeUndefined();

    const app = new Application({
      AppName: 'Missing',
      DisplayName: 'Bat App',
    });
    await app.Save(dbManager);

    const version = new Version({
      AppName: 'Missing',
      SemVer: '7.6.8',
      LambdaARN: 'arn:aws:lambda:us-east-1:123456789012:function:bat',
      URL: 'https://some-lambda-function-url-id.lambda-url.us-east-2.on.aws/',
      Status: 'deployed',
      Type: 'lambda',
    });
    await version.Save(dbManager);

    const rules = new Rules({
      AppName: 'Missing',
      Version: 0,
      RuleSet: { default: { SemVer: '7.6.8', AttributeName: '', AttributeValue: '' } },
    });
    await rules.Save(dbManager);

    // Get record from cache after DB record is created - should be hidden by negative cache
    const versionWhenDBCreated = await AppVersionCache.LoadVersion({
      dbManager,
      key: { AppName: 'Missing', SemVer: '7.6.8' },
    });

    expect(versionWhenDBCreated).toBeUndefined();
  });
});
