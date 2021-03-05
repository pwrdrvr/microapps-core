import { describe, it } from 'mocha';
import { expect } from 'chai';
import Manager from '../index';
import { dynamoClient } from '../../../fixtures';
import Version, { IVersionRecord } from './version';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

describe('version records', () => {
  it('saving a version should create one record', async () => {
    const version = new Version();
    version.AppName = 'Cat';
    version.SemVer = '1.2.3-Beta4';
    version.Status = 'status';
    version.Type = 'type';
    version.DefaultFile = 'index.html';
    version.IntegrationID = 'abcd';

    await version.SaveAsync(dynamoClient.client);

    const { Item } = await dynamoClient.client.getItem({
      TableName: Manager.TableName,
      Key: marshall({ PK: 'appname#cat', SK: 'version#1.2.3-beta4' }),
    });
    const uItem = unmarshall(Item) as IVersionRecord;
    expect(uItem.PK).equal('appname#cat');
    expect(uItem.SK).equal('version#1.2.3-beta4');
    expect(uItem.AppName).equal('cat');
    expect(uItem.SemVer).equal('1.2.3-Beta4');
    expect(uItem.Status).equal('status');
    expect(uItem.Type).equal('type');
    expect(uItem.DefaultFile).equal('index.html');
    expect(uItem.IntegrationID).equal('abcd');
  });

  it('load 1 version should load 1 version', async () => {
    let version = new Version();
    version.AppName = 'Dog';
    version.SemVer = '1.2.3-Beta5';
    version.Status = 'status';
    version.Type = 'type';
    version.DefaultFile = 'index.html';
    version.IntegrationID = 'abcd';

    await version.SaveAsync(dynamoClient.client);

    version = new Version();
    version.AppName = 'Dog';
    version.SemVer = '1.2.3-Beta6';
    version.Status = 'status';
    version.Type = 'type';
    version.DefaultFile = 'index.html';
    version.IntegrationID = 'abcd';

    await version.SaveAsync(dynamoClient.client);

    const version1 = await Version.LoadVersionAsync(dynamoClient.client, 'Dog', '1.2.3-Beta5');

    expect(version1.AppName).to.equal('dog');
    expect(version1.SK).to.equal('version#1.2.3-beta5');
    expect(version1.SemVer).to.equal('1.2.3-Beta5');

    const version2 = await Version.LoadVersionAsync(dynamoClient.client, 'Dog', '1.2.3-Beta6');

    expect(version2.AppName).to.equal('dog');
    expect(version2.SK).to.equal('version#1.2.3-beta6');
    expect(version2.SemVer).to.equal('1.2.3-Beta6');
  });

  it('load all app versions should load all versions for 1 app', async () => {
    let version = new Version();
    version.AppName = 'Frog';
    version.SemVer = '2.2.3-Beta5';
    version.Status = 'status';
    version.Type = 'type';
    version.DefaultFile = 'index.html';
    version.IntegrationID = 'abcd';

    await version.SaveAsync(dynamoClient.client);

    version = new Version();
    version.AppName = 'Frog';
    version.SemVer = '2.2.3-Beta6';
    version.Status = 'status';
    version.Type = 'type';
    version.DefaultFile = 'index.html';
    version.IntegrationID = 'abcd';

    await version.SaveAsync(dynamoClient.client);

    const versions = await Version.LoadVersionsAsync(dynamoClient.client, 'Frog');

    expect(versions.length).to.equal(2);

    expect(versions[0].AppName).to.equal('frog');
    expect(versions[0].SK).to.equal('version#2.2.3-beta5');
    expect(versions[0].SemVer).to.equal('2.2.3-Beta5');
    expect(versions[1].AppName).to.equal('frog');
    expect(versions[1].SK).to.equal('version#2.2.3-beta6');
    expect(versions[1].SemVer).to.equal('2.2.3-Beta6');
  });
});
