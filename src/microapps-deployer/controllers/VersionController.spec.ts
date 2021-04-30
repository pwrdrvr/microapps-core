import { describe, it } from 'mocha';
import { expect } from 'chai';
import { handler, ICheckVersionExistsRequest, ICreateApplicationRequest } from '../index';
import Manager, { Version } from '@pwrdrvr/microapps-datalib';
import { dynamoClient, InitializeTable, DropTable } from '../../fixtures';
import type * as lambda from 'aws-lambda';

describe('VersionController', () => {
  before(async () => {
    new Manager(dynamoClient.client);
  });

  beforeEach(async () => {
    // Create the table
    await InitializeTable();

    // Create a test app
    await handler(
      {
        appName: 'NewApp',
        displayName: 'NewDisplayName',
        type: 'createApp',
      } as ICreateApplicationRequest,
      { awsRequestId: '123' } as lambda.Context,
    );
  });

  afterEach(async () => {
    await DropTable();
  });

  it('should return 404 for version that does not exist', async () => {
    const response = await handler(
      {
        appName: 'NewApp',
        semVer: '0.0.0',
        type: 'checkVersionExists',
      } as ICheckVersionExistsRequest,
      { awsRequestId: '123' } as lambda.Context,
    );
    expect(response.statusCode).to.equal(404);
  });

  it('should return 200 for version that exists', async () => {
    const version = new Version({
      AppName: 'NewApp',
      DefaultFile: '',
      IntegrationID: '',
      SemVer: '0.0.0',
      Status: 'complete',
      Type: 'something',
    });
    await version.SaveAsync(dynamoClient.ddbDocClient);

    const response = await handler(
      {
        appName: 'NewApp',
        semVer: '0.0.0',
        type: 'checkVersionExists',
      } as ICheckVersionExistsRequest,
      { awsRequestId: '123' } as lambda.Context,
    );
    expect(response.statusCode).to.equal(200);
  });
});
