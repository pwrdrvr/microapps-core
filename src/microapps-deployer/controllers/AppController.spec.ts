import { describe, it } from 'mocha';
import { expect } from 'chai';
import { handler, ICreateApplicationRequest } from '../index';
import Manager, { Application } from '@pwrdrvr/microapps-datalib';
import { dynamoClient, InitializeTable, DropTable } from '../../fixtures';
import type * as lambda from 'aws-lambda';

describe('AppController', () => {
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

  it('should create new app that does not exist', async () => {
    const response = await handler(
      {
        appName: 'NewApp',
        displayName: 'NewDisplayName',
        type: 'createApp',
      } as ICreateApplicationRequest,
      { awsRequestId: '123' } as lambda.Context,
    );
    expect(response.statusCode).to.equal(201);

    const record = await Application.LoadAsync(dynamoClient.ddbDocClient, 'NewApp');
    expect(record).to.not.equal(undefined);
    expect(record.AppName).to.equal('newapp');
    expect(record.DisplayName).to.equal('NewDisplayName');
  });

  it('should not create app that exists', async () => {
    // Create first time
    let response = await handler(
      {
        appName: 'NewApp',
        displayName: 'NewDisplayName',
        type: 'createApp',
      } as ICreateApplicationRequest,
      { awsRequestId: '123' } as lambda.Context,
    );
    expect(response.statusCode).to.equal(201);

    // Try to create second time
    response = await handler(
      {
        appName: 'NewApp',
        displayName: 'NewDisplayName2',
        type: 'createApp',
      } as ICreateApplicationRequest,
      { awsRequestId: '123' } as lambda.Context,
    );
    expect(response.statusCode).to.equal(200);

    const record = await Application.LoadAsync(dynamoClient.ddbDocClient, 'NewApp');
    expect(record).to.not.equal(undefined);
    expect(record.AppName).to.equal('newapp');
    expect(record.DisplayName).to.equal('NewDisplayName');
  });
});
