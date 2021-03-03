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

    await version.SaveAsync(dynamoClient);

    const { Item } = await dynamoClient.getItem({
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

  // it('load function should load records', async () => {
  //   let application = new Application();
  //   application.AppName = 'App1';
  //   application.DisplayName = 'Application One';
  //   await application.SaveAsync(dynamoClient);

  //   application = new Application();
  //   application.AppName = 'App2';
  //   application.DisplayName = 'Application Two';
  //   await application.SaveAsync(dynamoClient);

  //   {
  //     const record = await Application.LoadAsync(dynamoClient, 'App1');

  //     expect(record.PK).equal('appname#app1');
  //     expect(record.SK).equal('application');
  //     expect(record.AppName).equal('app1');
  //     expect(record.DisplayName).equal('Application One');
  //   }

  //   {
  //     const record = await Application.LoadAsync(dynamoClient, 'App2');

  //     expect(record.PK).equal('appname#app2');
  //     expect(record.SK).equal('application');
  //     expect(record.AppName).equal('app2');
  //     expect(record.DisplayName).equal('Application Two');
  //   }
  // });
});
