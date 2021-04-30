import { describe, it } from 'mocha';
import * as chai from 'chai';
import { mockClient, AwsClientStub } from 'aws-sdk-client-mock';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import {
  handler,
  ICheckVersionExistsRequest,
  ICreateApplicationRequest,
  IDeployVersionRequest,
} from '../index';
import Manager, { Version } from '@pwrdrvr/microapps-datalib';
import { dynamoClient, InitializeTable, DropTable } from '../../fixtures';
import type * as lambda from 'aws-lambda';
import { VersionStatus } from '@pwrdrvr/microapps-datalib/models/version';

chai.use(sinonChai);
chai.use(chaiAsPromised);

const { expect } = chai;

describe('VersionController', () => {
  let sandbox: sinon.SinonSandbox;

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

    sandbox = sinon.createSandbox();
  });

  afterEach(async () => {
    await DropTable();
    sandbox.restore();
  });

  describe('checkVersionExists', () => {
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
        // Note: Pending is reported as "does not exist"
        // So don't set this to pending or the test will fail
        Status: 'integrated' as VersionStatus,
        Type: 'lambda',
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

  //IDeployVersionRequest
  describe('deployVersion', () => {
    it.skip('should return 201 for deploying version that does not exist', async () => {
      // TODO: Mock S3 get for source path - return one file name

      // TODO: Mock S3 put for destination path - accept the file

      // TODO: Mock Lambda Get request to return success for ARN

      // TODO: Mock API Gateway Integration Get for Router

      // TODO: Mock API Gateway Integration Create for Version

      const response = await handler(
        {
          appName: 'NewApp',
          semVer: '0.0.0',
          defaultFile: '',
          lambdaARN: '', // TODO: Need some sort of arn
          s3SourceURI: 's3://pwrdrvr-apps-staging/newapp/0.0.0/', // TODO: Need a fake s3 URI
          type: 'deployVersion',
        } as IDeployVersionRequest,
        { awsRequestId: '123' } as lambda.Context,
      );
      expect(response.statusCode).to.equal(201);
    });
  });
});
