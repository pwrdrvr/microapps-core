import { describe, it } from 'mocha';
import { expect } from 'chai';
import Manager, { Application, Version, Rules } from './index';
import { dynamoClient } from '../../fixtures';

let manager: Manager;

describe('database manager', () => {
  before(() => {
    manager = new Manager(dynamoClient.client);
  });

  it('should get versions and rules when asked', async () => {
    const app = new Application({
      AppName: 'Bat',
      DisplayName: 'Bat App',
    });
    await app.SaveAsync(dynamoClient.ddbDocClient);

    const version = new Version({
      AppName: 'Bat',
      DefaultFile: 'bat.html',
      IntegrationID: 'abcd',
      SemVer: '3.2.1-beta0',
      Status: 'deployed',
      Type: 'next.js',
    });
    await version.SaveAsync(dynamoClient.ddbDocClient);

    const rules = new Rules({
      AppName: 'Bat',
      Version: 0,
      RuleSet: { default: { SemVer: '3.2.1-beta0', AttributeName: '', AttributeValue: '' } },
    });
    await rules.SaveAsync(dynamoClient.ddbDocClient);

    const versAndRules = await Manager.GetVersionsAndRules('bat');

    expect(versAndRules).to.have.property('Versions');
    expect(versAndRules).to.have.property('Rules');
    expect(versAndRules.Rules).to.have.property('RuleSet');
    expect(versAndRules.Rules.RuleSet).to.have.property('default');
    expect(versAndRules.Rules.RuleSet.default).to.have.property('SemVer');
    expect(versAndRules.Rules.RuleSet.default.SemVer).to.equal('3.2.1-beta0');
    expect(versAndRules.Versions.length).to.equal(1);
    expect(versAndRules.Versions[0].SemVer).to.equal('3.2.1-beta0');
  });

  it('should update default rule', async () => {
    const app = new Application({
      AppName: 'Bat2',
      DisplayName: 'Bat App',
    });
    await app.SaveAsync(dynamoClient.ddbDocClient);

    const version = new Version({
      AppName: 'Bat2',
      DefaultFile: 'bat.html',
      IntegrationID: 'abcd',
      SemVer: '3.2.1-beta0',
      Status: 'deployed',
      Type: 'next.js',
    });
    await version.SaveAsync(dynamoClient.ddbDocClient);

    const rules = new Rules({
      AppName: 'Bat2',
      Version: 0,
      RuleSet: { default: { SemVer: '3.2.1-beta0', AttributeName: '', AttributeValue: '' } },
    });
    await rules.SaveAsync(dynamoClient.ddbDocClient);

    // Check version before update
    let versAndRules = await Manager.GetVersionsAndRules('bat2');
    expect(versAndRules.Rules.RuleSet.default.SemVer).to.equal('3.2.1-beta0');

    // Update default version
    await Manager.UpdateDefaultRule('bat2', '3.2.2');
    versAndRules = await Manager.GetVersionsAndRules('bat2');
    expect(versAndRules.Rules.RuleSet.default.SemVer).to.equal('3.2.2');
  });
});
