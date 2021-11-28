import 'jest-dynalite/withDb';
import * as dynamodb from '@aws-sdk/client-dynamodb';
import { DBManager } from '../manager';
import { Rules } from './rules';

let dynamoClient: dynamodb.DynamoDBClient;
let dbManager: DBManager;

const TEST_TABLE_NAME = 'microapps';

describe('rules records', () => {
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

  it('saving rules should create 1 record', async () => {
    const rules = new Rules();
    rules.AppName = 'Cat';
    rules.Version = 0;
    rules.RuleSet.default = { SemVer: '1.2.3', AttributeName: '', AttributeValue: '' };

    await rules.Save(dbManager);

    {
      const record = await Rules.Load({ dbManager, key: { AppName: 'Cat' } });

      expect(record).toBeDefined();
      expect(record.PK).toBe('appname#cat');
      expect(record.SK).toBe('rules');
      expect(record.AppName).toBe('cat');
      expect(record.Version).toBe(0);
      expect(record).toHaveProperty('RuleSet');
      expect(record.RuleSet).toHaveProperty('default');
      expect(record.RuleSet.default).toHaveProperty('SemVer');
      expect(record.RuleSet.default.SemVer).toBe('1.2.3');
    }
  });
});
