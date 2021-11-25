import { expect } from 'chai';
import { describe, it } from 'mocha';
import { dynamoClient, InitializeTable, DropTable, TEST_TABLE_NAME } from '../../../../fixtures';
import Manager from '../index';
import Rules from './rules';

describe('rules records', () => {
  before(async () => {
    new Manager({ dynamoDB: dynamoClient.client, tableName: TEST_TABLE_NAME });
  });

  beforeEach(async () => {
    // Create the table
    await InitializeTable();
  });

  afterEach(async () => {
    await DropTable();
  });

  it('saving rules should create 1 record', async () => {
    const rules = new Rules();
    rules.AppName = 'Cat';
    rules.Version = 0;
    rules.RuleSet.default = { SemVer: '1.2.3', AttributeName: '', AttributeValue: '' };

    await rules.SaveAsync(dynamoClient.ddbDocClient);

    {
      const record = await Rules.LoadAsync(dynamoClient.ddbDocClient, 'Cat');

      expect(record.PK).equal('appname#cat');
      expect(record.SK).equal('rules');
      expect(record.AppName).equal('cat');
      expect(record.Version).equal(0);
      expect(record).to.have.property('RuleSet');
      expect(record.RuleSet).to.have.property('default');
      expect(record.RuleSet.default).to.have.property('SemVer');
      expect(record.RuleSet.default.SemVer).to.equal('1.2.3');
    }
  });
});