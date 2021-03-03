import { describe, it } from 'mocha';
import { expect } from 'chai';
import * as dynamodb from '@aws-sdk/client-dynamodb';
import { dynamoClient } from '../../fixtures';
import Manager, { Application, Version, Rules } from './index';
import { executionAsyncId } from 'async_hooks';

describe('database manager', () => {
  it('should get versions and rules when asked', async () => {
    const manager = new Manager(dynamoClient);

    const app = new Application({
      AppName: 'Bat',
      DisplayName: 'Bat App',
    });
    await app.SaveAsync(manager.DBClient);

    const version = new Version({
      AppName: 'Bat',
      DefaultFile: 'bat.html',
      IntegrationID: 'abcd',
      SemVer: '3.2.1-beta0',
      Status: 'deployed',
      Type: 'next.js',
    });
    await version.SaveAsync(manager.DBClient);

    const rules = new Rules({
      AppName: 'Bat',
      Version: 0,
      RuleSet: { default: { SemVer: '3.2.1-beta0', AttributeName: '', AttributeValue: '' } },
    });
    await rules.SaveAsync(manager.DBClient);

    const versAndRules = await manager.GetVersionsAndRules('bat');

    expect(versAndRules).to.have.property('Versions');
    expect(versAndRules).to.have.property('Rules');
    expect(versAndRules.Rules).to.have.property('RuleSet');
    expect(versAndRules.Rules.RuleSet).to.have.property('default');
    expect(versAndRules.Rules.RuleSet.default).to.have.property('SemVer');
    expect(versAndRules.Rules.RuleSet.default.SemVer).to.equal('3.2.1-beta0');
    expect(versAndRules.Versions.length).to.equal(1);
    expect(versAndRules.Versions[0].SemVer).to.equal('3.2.1-beta0');
  });
});
