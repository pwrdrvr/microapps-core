import 'jest-dynalite/withDb';
import * as dynamodb from '@aws-sdk/client-dynamodb';
import { DBManager } from '../manager';
import { Version } from './version';

let dynamoClient: dynamodb.DynamoDBClient;
let dbManager: DBManager;

const TEST_TABLE_NAME = 'microapps';

describe('version records', () => {
  beforeAll(() => {
    dynamoClient = new dynamodb.DynamoDBClient({
      endpoint: process.env.MOCK_DYNAMODB_ENDPOINT,
      tls: false,
      region: 'local',
    });

    // Init the DB manager to point it at the right table
    dbManager = new DBManager({ dynamoClient, tableName: TEST_TABLE_NAME });
  });

  afterAll(() => {
    dynamoClient.destroy();
  }, 20000);

  it('saving a version should create one record', async () => {
    const version = new Version();
    version.AppName = 'Cat';
    version.SemVer = '1.2.3-Beta4';
    version.Status = 'pending';
    version.Type = 'type';
    version.DefaultFile = 'index.html';
    version.IntegrationID = 'abcd';

    await version.Save(dbManager);

    const { Item } = await dbManager.ddbDocClient.get({
      TableName: dbManager.tableName,
      Key: { PK: 'appname#cat', SK: 'version#1.2.3-beta4' },
    });
    expect(Item).toBeDefined();
    expect(Item?.PK).toBe('appname#cat');
    expect(Item?.SK).toBe('version#1.2.3-beta4');
    expect(Item?.AppName).toBe('cat');
    expect(Item?.SemVer).toBe('1.2.3-Beta4');
    expect(Item?.Status).toBe('pending');
    expect(Item?.Type).toBe('type');
    expect(Item?.DefaultFile).toBe('index.html');
    expect(Item?.IntegrationID).toBe('abcd');
  });

  it('load 1 version should load 1 version', async () => {
    let version = new Version();
    version.AppName = 'Dog';
    version.SemVer = '1.2.3-Beta5';
    version.Status = 'pending';
    version.Type = 'type';
    version.DefaultFile = 'index.html';
    version.IntegrationID = 'abcd';

    await version.Save(dbManager);

    version = new Version();
    version.AppName = 'Dog';
    version.SemVer = '1.2.3-Beta6';
    version.Status = 'pending';
    version.Type = 'type';
    version.DefaultFile = 'index.html';
    version.IntegrationID = 'abcd';

    await version.Save(dbManager);

    const version1 = await Version.LoadVersion({
      dbManager,
      key: {
        AppName: 'Dog',
        SemVer: '1.2.3-Beta5',
      },
    });

    expect(version1.AppName).toBe('dog');
    expect(version1.SK).toBe('version#1.2.3-beta5');
    expect(version1.SemVer).toBe('1.2.3-Beta5');

    const version2 = await Version.LoadVersion({
      dbManager,
      key: { AppName: 'Dog', SemVer: '1.2.3-Beta6' },
    });

    expect(version2.AppName).toBe('dog');
    expect(version2.SK).toBe('version#1.2.3-beta6');
    expect(version2.SemVer).toBe('1.2.3-Beta6');
  });

  it('load all app versions should load all versions for 1 app', async () => {
    let version = new Version();
    version.AppName = 'Frog';
    version.SemVer = '2.2.3-Beta5';
    version.Status = 'pending';
    version.Type = 'type';
    version.DefaultFile = 'index.html';
    version.IntegrationID = 'abcd';

    await version.Save(dbManager);

    version = new Version();
    version.AppName = 'Frog';
    version.SemVer = '2.2.3-Beta6';
    version.Status = 'pending';
    version.Type = 'type';
    version.DefaultFile = 'index.html';
    version.IntegrationID = 'abcd';

    await version.Save(dbManager);

    const versions = await Version.LoadVersions({ dbManager, key: { AppName: 'Frog' } });

    expect(versions.length).toBe(2);

    expect(versions[0].AppName).toBe('frog');
    expect(versions[0].SK).toBe('version#2.2.3-beta5');
    expect(versions[0].SemVer).toBe('2.2.3-Beta5');
    expect(versions[1].AppName).toBe('frog');
    expect(versions[1].SK).toBe('version#2.2.3-beta6');
    expect(versions[1].SemVer).toBe('2.2.3-Beta6');
  });
});
