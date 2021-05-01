import { describe, it } from 'mocha';
import { expect } from 'chai';
import { dynamoClient, InitializeTable, DropTable } from '../../../fixtures';
import Version from './version';
import { TABLE_NAME } from '../config';
import Manager from '../index';

describe('version records', () => {
  before(async () => {
    new Manager(dynamoClient.client);
  });

  beforeEach(async () => {
    // Create the table
    await InitializeTable();
  });

  afterEach(async () => {
    await DropTable();
  });

  it('saving a version should create one record', async () => {
    const version = new Version();
    version.AppName = 'Cat';
    version.SemVer = '1.2.3-Beta4';
    version.Status = 'status';
    version.Type = 'type';
    version.DefaultFile = 'index.html';
    version.IntegrationID = 'abcd';

    await version.SaveAsync(dynamoClient.ddbDocClient);

    const { Item } = await dynamoClient.ddbDocClient.get({
      TableName: TABLE_NAME,
      Key: { PK: 'appname#cat', SK: 'version#1.2.3-beta4' },
    });
    expect(Item.PK).equal('appname#cat');
    expect(Item.SK).equal('version#1.2.3-beta4');
    expect(Item.AppName).equal('cat');
    expect(Item.SemVer).equal('1.2.3-Beta4');
    expect(Item.Status).equal('status');
    expect(Item.Type).equal('type');
    expect(Item.DefaultFile).equal('index.html');
    expect(Item.IntegrationID).equal('abcd');
  });

  it('load 1 version should load 1 version', async () => {
    let version = new Version();
    version.AppName = 'Dog';
    version.SemVer = '1.2.3-Beta5';
    version.Status = 'status';
    version.Type = 'type';
    version.DefaultFile = 'index.html';
    version.IntegrationID = 'abcd';

    await version.SaveAsync(dynamoClient.ddbDocClient);

    version = new Version();
    version.AppName = 'Dog';
    version.SemVer = '1.2.3-Beta6';
    version.Status = 'status';
    version.Type = 'type';
    version.DefaultFile = 'index.html';
    version.IntegrationID = 'abcd';

    await version.SaveAsync(dynamoClient.ddbDocClient);

    const version1 = await Version.LoadVersionAsync(
      dynamoClient.ddbDocClient,
      'Dog',
      '1.2.3-Beta5',
    );

    expect(version1.AppName).to.equal('dog');
    expect(version1.SK).to.equal('version#1.2.3-beta5');
    expect(version1.SemVer).to.equal('1.2.3-Beta5');

    const version2 = await Version.LoadVersionAsync(
      dynamoClient.ddbDocClient,
      'Dog',
      '1.2.3-Beta6',
    );

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

    await version.SaveAsync(dynamoClient.ddbDocClient);

    version = new Version();
    version.AppName = 'Frog';
    version.SemVer = '2.2.3-Beta6';
    version.Status = 'status';
    version.Type = 'type';
    version.DefaultFile = 'index.html';
    version.IntegrationID = 'abcd';

    await version.SaveAsync(dynamoClient.ddbDocClient);

    const versions = await Version.LoadVersionsAsync(dynamoClient.ddbDocClient, 'Frog');

    expect(versions.length).to.equal(2);

    expect(versions[0].AppName).to.equal('frog');
    expect(versions[0].SK).to.equal('version#2.2.3-beta5');
    expect(versions[0].SemVer).to.equal('2.2.3-Beta5');
    expect(versions[1].AppName).to.equal('frog');
    expect(versions[1].SK).to.equal('version#2.2.3-beta6');
    expect(versions[1].SemVer).to.equal('2.2.3-Beta6');
  });
});
