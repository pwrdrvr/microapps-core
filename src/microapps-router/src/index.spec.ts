// eslint-disable-next-line import/no-extraneous-dependencies
import Manager, { Application, Version, Rules } from '@pwrdrvr/microapps-datalib';
// eslint-disable-next-line import/no-unresolved
import * as lambda from 'aws-lambda';
// eslint-disable-next-line import/no-extraneous-dependencies
import { expect } from 'chai';
// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, it } from 'mocha';
import { dynamoClient, InitializeTable, DropTable, TEST_TABLE_NAME } from '../../fixtures';
import { handler } from './index';

describe('router', () => {
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

  it('should serve appframe with version and default file substitued', async () => {
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

    // Call the handler
    const response = await handler(
      { rawPath: '/bat/' } as lambda.APIGatewayProxyEventV2,
      {} as lambda.Context,
    );

    expect(response).to.have.property('statusCode');
    expect(response.statusCode).to.equal(200);
    expect(response).not.equal(undefined);
    expect(response).to.have.property('body');
    expect(response.body.length).greaterThan(80);
    expect(response.body).contains('<iframe src="/bat/3.2.1-beta0/bat.html" seamless');
  });

  it('should serve appframe with no default file', async () => {
    const app = new Application({
      AppName: 'Bat',
      DisplayName: 'Bat App',
    });
    await app.SaveAsync(dynamoClient.ddbDocClient);

    const version = new Version({
      AppName: 'Bat',
      DefaultFile: '',
      IntegrationID: 'abcd',
      SemVer: '3.2.1-beta1',
      Status: 'deployed',
      Type: 'next.js',
    });
    await version.SaveAsync(dynamoClient.ddbDocClient);

    const rules = new Rules({
      AppName: 'Bat',
      Version: 0,
      RuleSet: { default: { SemVer: '3.2.1-beta1', AttributeName: '', AttributeValue: '' } },
    });
    await rules.SaveAsync(dynamoClient.ddbDocClient);

    // Call the handler
    const response = await handler(
      { rawPath: '/bat/' } as lambda.APIGatewayProxyEventV2,
      {} as lambda.Context,
    );

    expect(response).not.equal(undefined);
    expect(response).to.have.property('statusCode');
    expect(response.statusCode).to.equal(200);
    expect(response).to.have.property('body');
    expect(response.body.length).greaterThan(80);
    expect(response.body).contains('<iframe src="/bat/3.2.1-beta1" seamless');
  });

  it('should serve appframe with sub-route', async () => {
    const app = new Application({
      AppName: 'Bat',
      DisplayName: 'Bat App',
    });
    await app.SaveAsync(dynamoClient.ddbDocClient);

    const version = new Version({
      AppName: 'Bat',
      DefaultFile: '',
      IntegrationID: 'abcd',
      SemVer: '3.2.1-beta2',
      Status: 'deployed',
      Type: 'next.js',
    });
    await version.SaveAsync(dynamoClient.ddbDocClient);

    const rules = new Rules({
      AppName: 'Bat',
      Version: 0,
      RuleSet: { default: { SemVer: '3.2.1-beta2', AttributeName: '', AttributeValue: '' } },
    });
    await rules.SaveAsync(dynamoClient.ddbDocClient);

    // Call the handler
    const response = await handler(
      { rawPath: '/bat/demo/grid' } as lambda.APIGatewayProxyEventV2,
      {} as lambda.Context,
    );

    expect(response).not.equal(undefined);
    expect(response).to.have.property('statusCode');
    expect(response.statusCode).to.equal(200);
    expect(response).to.have.property('body');
    expect(response.body.length).greaterThan(80);
    expect(response.body).contains('<iframe src="/bat/3.2.1-beta2/demo/grid" seamless');
  });

  it('should serve appframe with sub-route', async () => {
    const app = new Application({
      AppName: 'Bat',
      DisplayName: 'Bat App',
    });
    await app.SaveAsync(dynamoClient.ddbDocClient);

    const version = new Version({
      AppName: 'Bat',
      DefaultFile: 'someFile.html',
      IntegrationID: 'abcd',
      SemVer: '3.2.1-beta3',
      Status: 'deployed',
      Type: 'next.js',
    });
    await version.SaveAsync(dynamoClient.ddbDocClient);

    const rules = new Rules({
      AppName: 'Bat',
      Version: 0,
      RuleSet: { default: { SemVer: '3.2.1-beta3', AttributeName: '', AttributeValue: '' } },
    });
    await rules.SaveAsync(dynamoClient.ddbDocClient);

    // Call the handler
    const response = await handler(
      { rawPath: '/bat/demo' } as lambda.APIGatewayProxyEventV2,
      {} as lambda.Context,
    );

    expect(response).not.equal(undefined);
    expect(response).to.have.property('statusCode');
    expect(response.statusCode).to.equal(200);
    expect(response).to.have.property('body');
    expect(response.body.length).greaterThan(80);
    expect(response.body).contains('<iframe src="/bat/3.2.1-beta3/demo" seamless');
  });

  it('should return 404 for /favicon.ico', async () => {
    const app = new Application({
      AppName: 'Bat',
      DisplayName: 'Bat App',
    });
    await app.SaveAsync(dynamoClient.ddbDocClient);

    const version = new Version({
      AppName: 'Bat',
      DefaultFile: 'someFile.html',
      IntegrationID: 'abcd',
      SemVer: '3.2.1-beta3',
      Status: 'deployed',
      Type: 'next.js',
    });
    await version.SaveAsync(dynamoClient.ddbDocClient);

    const rules = new Rules({
      AppName: 'Bat',
      Version: 0,
      RuleSet: { default: { SemVer: '3.2.1-beta3', AttributeName: '', AttributeValue: '' } },
    });
    await rules.SaveAsync(dynamoClient.ddbDocClient);

    // Call the handler
    const response = await handler(
      { rawPath: '/favicon.ico' } as lambda.APIGatewayProxyEventV2,
      {} as lambda.Context,
    );

    expect(response).not.equal(undefined);
    expect(response).to.have.property('statusCode');
    expect(response.statusCode).to.equal(404);
  });
});
