import { describe, it } from 'mocha';
import { expect } from 'chai';
import Manager from '../index';
import { dynamoClient } from '../../../fixtures';
import Rules from './rules';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

describe('application records', () => {
  it('saving rules should create 1 record', async () => {
    const rules = new Rules();
    rules.AppName = 'Cat';
    rules.Version = 0;
    rules.RuleSet.default = { SemVer: '1.2.3', AttributeName: '', AttributeValue: '' };

    await rules.SaveAsync(dynamoClient);

    {
      const record = await Rules.LoadAsync(dynamoClient, 'Cat');

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
