import { describe, it } from 'mocha';
import { expect } from 'chai';
import Manager from '../index';
import { dynamoClient } from '../../../fixtures';
import Application from './application';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

describe('application records', () => {
  it('saving an application should create two records', async () => {
    const application = new Application();
    application.AppName = 'Cat';
    application.DisplayName = 'Dog';

    await application.SaveAsync(dynamoClient.client);

    {
      const { Item } = await dynamoClient.client.getItem({
        TableName: Manager.TableName,
        Key: marshall({ PK: 'appname#cat', SK: 'application' }),
      });
      const uItem = unmarshall(Item);
      expect(uItem.PK).equal('appname#cat');
      expect(uItem.SK).equal('application');
      expect(uItem.AppName).equal('cat');
      expect(uItem.DisplayName).equal('Dog');
    }

    {
      const { Item } = await dynamoClient.client.getItem({
        TableName: Manager.TableName,
        Key: marshall({ PK: 'applications', SK: 'appname#cat' }),
        // ProjectionExpression: 'PK,SK,AppName,DisplayName',
      });
      const uItem = unmarshall(Item);
      expect(uItem.PK).equal('applications');
      expect(uItem.SK).equal('appname#cat');
      expect(uItem.AppName).equal('cat');
      expect(uItem.DisplayName).equal('Dog');
    }
  });

  it('load function should load records', async () => {
    let application = new Application();
    application.AppName = 'App1';
    application.DisplayName = 'Application One';
    await application.SaveAsync(dynamoClient.client);

    application = new Application();
    application.AppName = 'App2';
    application.DisplayName = 'Application Two';
    await application.SaveAsync(dynamoClient.client);

    {
      const record = await Application.LoadAsync(dynamoClient.client, 'App1');

      expect(record.PK).equal('appname#app1');
      expect(record.SK).equal('application');
      expect(record.AppName).equal('app1');
      expect(record.DisplayName).equal('Application One');
    }

    {
      const record = await Application.LoadAsync(dynamoClient.client, 'App2');

      expect(record.PK).equal('appname#app2');
      expect(record.SK).equal('application');
      expect(record.AppName).equal('app2');
      expect(record.DisplayName).equal('Application Two');
    }
  });

  it('LoadAllAppsAsync should return all applications', async () => {
    let application = new Application();
    application.AppName = 'Bpp1';
    application.DisplayName = 'Bpplication One';
    await application.SaveAsync(dynamoClient.client);

    application = new Application();
    application.AppName = 'Bpp2';
    application.DisplayName = 'Bpplication Two';
    await application.SaveAsync(dynamoClient.client);

    const applications = await Application.LoadAllAppsAsync(dynamoClient.client);
    expect(applications).to.exist;
    const appOne = applications.find((value) => {
      return value.AppName === 'bpp1';
    });
    expect(appOne).to.exist;
    expect(appOne).to.have.property('AppName');
    expect(appOne.AppName).to.equal('bpp1');
    expect(appOne.DisplayName).to.equal('Bpplication One');

    const appTwo = applications.find((value) => {
      return value.AppName === 'bpp2';
    });
    expect(appTwo).to.exist;
    expect(appTwo).to.have.property('AppName');
    expect(appTwo.AppName).to.equal('bpp2');
    expect(appTwo.DisplayName).to.equal('Bpplication Two');
  });
});
