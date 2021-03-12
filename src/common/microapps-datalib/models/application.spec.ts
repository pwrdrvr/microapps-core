import { describe, it } from 'mocha';
import { expect } from 'chai';
import { dynamoClient } from '../../../fixtures';
import Application from './application';
import { TABLE_NAME } from '../config';

describe('application records', () => {
  it('saving an application should create two records', async () => {
    const application = new Application();
    application.AppName = 'Cat';
    application.DisplayName = 'Dog';

    await application.SaveAsync(dynamoClient.ddbDocClient);

    {
      const { Item } = await dynamoClient.ddbDocClient.get({
        TableName: TABLE_NAME,
        Key: { PK: 'appname#cat', SK: 'application' },
      });
      expect(Item.PK).equal('appname#cat');
      expect(Item.SK).equal('application');
      expect(Item.AppName).equal('cat');
      expect(Item.DisplayName).equal('Dog');
    }

    {
      const { Item } = await dynamoClient.ddbDocClient.get({
        TableName: TABLE_NAME,
        Key: { PK: 'applications', SK: 'appname#cat' },
        // ProjectionExpression: 'PK,SK,AppName,DisplayName',
      });
      expect(Item.PK).equal('applications');
      expect(Item.SK).equal('appname#cat');
      expect(Item.AppName).equal('cat');
      expect(Item.DisplayName).equal('Dog');
    }
  });

  it('load function should load records', async () => {
    let application = new Application();
    application.AppName = 'App1';
    application.DisplayName = 'Application One';
    await application.SaveAsync(dynamoClient.ddbDocClient);

    application = new Application();
    application.AppName = 'App2';
    application.DisplayName = 'Application Two';
    await application.SaveAsync(dynamoClient.ddbDocClient);

    {
      const record = await Application.LoadAsync(dynamoClient.ddbDocClient, 'App1');

      expect(record.PK).equal('appname#app1');
      expect(record.SK).equal('application');
      expect(record.AppName).equal('app1');
      expect(record.DisplayName).equal('Application One');
    }

    {
      const record = await Application.LoadAsync(dynamoClient.ddbDocClient, 'App2');

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
    await application.SaveAsync(dynamoClient.ddbDocClient);

    application = new Application();
    application.AppName = 'Bpp2';
    application.DisplayName = 'Bpplication Two';
    await application.SaveAsync(dynamoClient.ddbDocClient);

    const applications = await Application.LoadAllAppsAsync(dynamoClient.ddbDocClient);
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
