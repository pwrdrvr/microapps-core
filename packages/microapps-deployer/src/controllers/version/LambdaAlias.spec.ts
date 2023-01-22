/// <reference types="jest" />
import 'reflect-metadata';
import 'jest-dynalite/withDb';
import { Config, IConfig } from '../../config/Config';
jest.mock('../../config/Config');
type Writeable<T> = { -readonly [P in keyof T]: T[P] };
const theConfig: Writeable<IConfig> = {
  awsAccountID: '00123456789',
  awsRegion: 'mock',
  db: {
    tableName: 'microapps',
  },
  apigwy: {
    apiId: '123',
  },
  filestore: {
    stagingBucket: 'pwrdrvr-apps-staging',
    destinationBucket: 'microapps-test-destination',
  },
  uploadRoleName: 'microapps-upload-test-role',
  rootPathPrefix: 'dev',
  requireIAMAuthorization: true,
  parentDeployerLambdaARN: '',
  edgeToOriginRoleARN: '',
};
const origConfig = { ...theConfig };
Object.defineProperty(Config, 'instance', {
  configurable: false,
  enumerable: false,
  get: jest.fn((): IConfig => {
    return theConfig;
  }),
});
import * as apigwy from '@aws-sdk/client-apigatewayv2';
import * as dynamodb from '@aws-sdk/client-dynamodb';
import * as lambda from '@aws-sdk/client-lambda';
import * as s3 from '@aws-sdk/client-s3';
import * as sts from '@aws-sdk/client-sts';

import type {
  ICreateApplicationRequest,
  ILambdaAliasRequest,
  ILambdaAliasResponse,
} from '@pwrdrvr/microapps-deployer-lib';
import { DBManager, Version } from '@pwrdrvr/microapps-datalib';
import type * as lambdaTypes from 'aws-lambda';
import { mockClient, AwsClientStub } from 'aws-sdk-client-mock';
import sinon from 'sinon';
import { handler, overrideDBManager } from '../../index';

let s3Client: AwsClientStub<s3.S3Client>;
let stsClient: AwsClientStub<sts.STSClient>;
let apigwyClient: AwsClientStub<apigwy.ApiGatewayV2Client>;
let lambdaClient: AwsClientStub<lambda.LambdaClient>;
let dynamoClient: dynamodb.DynamoDBClient;
let dbManager: DBManager;

const TEST_TABLE_NAME = 'microapps';

describe('LambdaAlias', () => {
  const config = Config.instance;
  let sandbox: sinon.SinonSandbox;
  const fakeLambdaARNBase = `arn:aws:lambda:${config.awsRegion}:${config.awsAccountID}:function:new-app-function`;

  beforeAll(() => {
    dynamoClient = new dynamodb.DynamoDBClient({
      endpoint: process.env.MOCK_DYNAMODB_ENDPOINT,
      tls: false,
      region: 'local',
    });

    // Init the DB manager to point it at the right table
    dbManager = new DBManager({ dynamoClient, tableName: TEST_TABLE_NAME });
  });

  beforeEach(async () => {
    jest.resetModules(); // Most important - it clears the cache

    // Reset the config that's visible to the handler back to defaults
    Object.keys(origConfig).forEach((key) => {
      (theConfig as { [index: string]: unknown })[key] = (
        origConfig as { [index: string]: unknown }
      )[key];
    });

    overrideDBManager({ dbManager, dynamoClient });

    // Create a test app
    await handler(
      {
        appName: 'NewApp',
        displayName: 'NewDisplayName',
        type: 'createApp',
      } as ICreateApplicationRequest,
      { awsRequestId: '123' } as lambdaTypes.Context,
    );

    sandbox = sinon.createSandbox();
    s3Client = mockClient(s3.S3Client).onAnyCommand().rejects();
    stsClient = mockClient(sts.STSClient).onAnyCommand().rejects();
    apigwyClient = mockClient(apigwy.ApiGatewayV2Client).onAnyCommand().rejects();
    lambdaClient = mockClient(lambda.LambdaClient).onAnyCommand().rejects();
  });

  afterEach(() => {
    sandbox.restore();
    s3Client.restore();
    apigwyClient.restore();
    lambdaClient.restore();
  });

  describe('lambdaAlias - version ARN passed', () => {
    it('should 200 for version that exists when !overwrite', async () => {
      const appName = 'newapp';
      const semVer = '0.0.0';
      const fakeLambdaVersion = '31';
      const fakeLambdaARNWithVersion = `${fakeLambdaARNBase}:${fakeLambdaVersion}`;
      const fakeLambdaAlias = 'v0_0_0';

      s3Client.onAnyCommand().rejects();
      stsClient.onAnyCommand().rejects();
      lambdaClient
        .onAnyCommand()
        .rejects()
        .on(lambda.GetFunctionCommand, {
          FunctionName: fakeLambdaARNBase,
          Qualifier: fakeLambdaVersion,
        })
        .resolves({
          Configuration: {
            LastUpdateStatus: 'Successful',
            FunctionArn: `${fakeLambdaARNBase}:${fakeLambdaVersion}`,
          },
        })
        .on(lambda.GetAliasCommand, {
          FunctionName: fakeLambdaARNBase,
          Name: fakeLambdaAlias,
        })
        .resolves({
          FunctionVersion: fakeLambdaVersion,
          AliasArn: `${fakeLambdaARNBase}:${fakeLambdaAlias}`,
        })
        // AddTagToFunction
        .on(lambda.ListTagsCommand, {
          Resource: fakeLambdaARNBase,
        })
        .resolves({
          Tags: {
            'app-name': appName,
            'sem-ver': semVer,
          },
        })
        .on(lambda.TagResourceCommand, {
          Resource: fakeLambdaARNBase,
          Tags: {
            'microapp-managed': 'true',
          },
        })
        .resolves({})
        // AddOrUpdateFunctionUrl
        .on(lambda.GetFunctionUrlConfigCommand, {
          FunctionName: fakeLambdaARNBase,
          Qualifier: fakeLambdaAlias,
        })
        .resolves({
          FunctionUrl: 'https://fakeurl.com',
        });

      const version = new Version({
        AppName: appName,
        SemVer: semVer,
        // Note: Pending is reported as "does not exist"
        // So don't set this to pending or the test will fail
        Status: 'routed',
        Type: 'lambda',
        LambdaARN: `${fakeLambdaARNBase}:${fakeLambdaAlias}`,
      });
      await version.Save(dbManager);

      const request: ILambdaAliasRequest = {
        appName,
        semVer,
        lambdaARN: fakeLambdaARNWithVersion,
        type: 'lambdaAlias',
      };
      const response = (await handler(request, {
        awsRequestId: '123',
      } as lambdaTypes.Context)) as ILambdaAliasResponse;

      expect(response.statusCode).toBe(200);
      expect(response.type).toBe('lambdaAlias');
      expect(response.lambdaAliasARN).toBe(`${fakeLambdaARNBase}:${fakeLambdaAlias}`);
      expect(response.functionUrl).toBe('https://fakeurl.com');
      expect(lambdaClient.calls()).toHaveLength(5);
    });

    it('should 200 for version that exists when overwrite=true', async () => {
      const appName = 'newapp';
      const semVer = '0.0.0';
      const fakeLambdaVersion = '31';
      const fakeLambdaARNWithVersion = `${fakeLambdaARNBase}:${fakeLambdaVersion}`;
      const fakeLambdaAlias = 'v0_0_0';

      s3Client.onAnyCommand().rejects();
      stsClient.onAnyCommand().rejects();
      lambdaClient
        .onAnyCommand()
        .rejects()
        .on(lambda.GetFunctionCommand, {
          FunctionName: fakeLambdaARNBase,
          Qualifier: fakeLambdaVersion,
        })
        .resolves({
          Configuration: {
            LastUpdateStatus: 'Successful',
            FunctionArn: `${fakeLambdaARNBase}:${fakeLambdaVersion}`,
          },
        })
        .on(lambda.GetAliasCommand, {
          FunctionName: fakeLambdaARNBase,
          Name: fakeLambdaAlias,
        })
        .resolves({
          AliasArn: `${fakeLambdaARNBase}:${fakeLambdaAlias}`,
          FunctionVersion: fakeLambdaVersion,
        })
        // AddTagToFunction
        .on(lambda.ListTagsCommand, {
          Resource: fakeLambdaARNBase,
        })
        .resolves({
          Tags: {
            'app-name': appName,
            'sem-ver': semVer,
          },
        })
        .on(lambda.TagResourceCommand, {
          Resource: fakeLambdaARNBase,
          Tags: {
            'microapp-managed': 'true',
          },
        })
        .resolves({})
        // AddOrUpdateFunctionUrl
        .on(lambda.GetFunctionUrlConfigCommand, {
          FunctionName: fakeLambdaARNBase,
          Qualifier: fakeLambdaAlias,
        })
        .resolves({
          FunctionUrl: 'https://fakeurl.com',
        });

      const version = new Version({
        AppName: appName,
        SemVer: semVer,
        // Note: Pending is reported as "does not exist"
        // So don't set this to pending or the test will fail
        Status: 'routed',
        Type: 'lambda',
        LambdaARN: `${fakeLambdaARNBase}:${fakeLambdaAlias}`,
      });
      await version.Save(dbManager);

      const request: ILambdaAliasRequest = {
        appName,
        semVer,
        lambdaARN: fakeLambdaARNWithVersion,
        type: 'lambdaAlias',
        overwrite: true,
      };
      const response = (await handler(request, {
        awsRequestId: '123',
      } as lambdaTypes.Context)) as ILambdaAliasResponse;

      expect(response.statusCode).toBe(200);
      expect(response.actionTaken).toBe('verified');
      expect(response.type).toBe('lambdaAlias');
      expect(response.lambdaAliasARN).toBe(`${fakeLambdaARNBase}:${fakeLambdaAlias}`);
      expect(response.functionUrl).toBe('https://fakeurl.com');
      expect(lambdaClient.calls()).toHaveLength(5);
    });

    it('should 201 for version that !exists when !overwrite', async () => {
      const appName = 'newapp';
      const semVer = '0.0.0';
      const fakeLambdaVersion = '31';
      const fakeLambdaARNWithVersion = `${fakeLambdaARNBase}:${fakeLambdaVersion}`;
      const fakeLambdaAlias = 'v0_0_0';

      s3Client.onAnyCommand().rejects();
      stsClient.onAnyCommand().rejects();
      lambdaClient
        .onAnyCommand()
        .rejects()
        .on(lambda.GetFunctionCommand, {
          FunctionName: fakeLambdaARNBase,
          Qualifier: fakeLambdaVersion,
        })
        .resolves({
          Configuration: {
            LastUpdateStatus: 'Successful',
            FunctionArn: `${fakeLambdaARNBase}:${fakeLambdaVersion}`,
          },
        })
        .on(lambda.GetAliasCommand, {
          FunctionName: fakeLambdaARNBase,
          Name: fakeLambdaAlias,
        })
        .rejects({
          name: 'ResourceNotFoundException',
        })
        .on(lambda.CreateAliasCommand, {
          FunctionName: fakeLambdaARNBase,
          Name: fakeLambdaAlias,
          FunctionVersion: fakeLambdaVersion,
        })
        .resolves({
          AliasArn: `${fakeLambdaARNBase}:${fakeLambdaAlias}`,
          FunctionVersion: fakeLambdaVersion,
        })
        // AddTagToFunction
        .on(lambda.ListTagsCommand, {
          Resource: fakeLambdaARNBase,
        })
        .resolves({
          Tags: {
            'app-name': appName,
            'sem-ver': semVer,
          },
        })
        .on(lambda.TagResourceCommand, {
          Resource: fakeLambdaARNBase,
          Tags: {
            'microapp-managed': 'true',
          },
        })
        .resolves({})
        // AddOrUpdateFunctionUrl
        .on(lambda.GetFunctionUrlConfigCommand, {
          FunctionName: fakeLambdaARNBase,
          Qualifier: fakeLambdaAlias,
        })
        .resolves({
          FunctionUrl: 'https://fakeurl.com',
        });

      const request: ILambdaAliasRequest = {
        appName,
        semVer,
        lambdaARN: fakeLambdaARNWithVersion,
        type: 'lambdaAlias',
      };
      const response = (await handler(request, {
        awsRequestId: '123',
      } as lambdaTypes.Context)) as ILambdaAliasResponse;

      expect(response.statusCode).toBe(201);
      expect(response.type).toBe('lambdaAlias');
      expect(response.lambdaAliasARN).toBe(`${fakeLambdaARNBase}:${fakeLambdaAlias}`);
      expect(response.functionUrl).toBe('https://fakeurl.com');
      expect(lambdaClient.calls()).toHaveLength(6);
    });

    it('should 200 for version that exists when overwrite and version changed', async () => {
      const appName = 'newapp';
      const semVer = '0.0.0';
      const fakeLambdaVersionStart = '3';
      const fakeLambdaVersionEnd = '31';
      const fakeLambdaARNWithVersionEnd = `${fakeLambdaARNBase}:${fakeLambdaVersionEnd}`;
      const fakeLambdaAlias = 'v0_0_0';

      s3Client.onAnyCommand().rejects();
      stsClient.onAnyCommand().rejects();
      lambdaClient
        .onAnyCommand()
        .rejects()
        .on(lambda.GetFunctionCommand, {
          FunctionName: fakeLambdaARNBase,
          Qualifier: fakeLambdaVersionEnd,
        })
        .resolves({
          Configuration: {
            LastUpdateStatus: 'Successful',
            FunctionArn: `${fakeLambdaARNBase}:${fakeLambdaVersionEnd}`,
          },
        })
        .on(lambda.GetAliasCommand, {
          FunctionName: fakeLambdaARNBase,
          Name: fakeLambdaAlias,
        })
        .resolves({
          AliasArn: `${fakeLambdaARNBase}:${fakeLambdaAlias}`,
          FunctionVersion: fakeLambdaVersionStart,
        })
        .on(lambda.UpdateAliasCommand, {
          FunctionName: fakeLambdaARNBase,
          Name: fakeLambdaAlias,
          FunctionVersion: fakeLambdaVersionEnd,
        })
        .resolves({
          AliasArn: `${fakeLambdaARNBase}:${fakeLambdaAlias}`,
          FunctionVersion: fakeLambdaVersionEnd,
        })
        // AddTagToFunction
        .on(lambda.ListTagsCommand, {
          Resource: fakeLambdaARNBase,
        })
        .resolves({
          Tags: {
            'app-name': appName,
            'sem-ver': semVer,
          },
        })
        .on(lambda.TagResourceCommand, {
          Resource: fakeLambdaARNBase,
          Tags: {
            'microapp-managed': 'true',
          },
        })
        .resolves({})
        // AddOrUpdateFunctionUrl
        .on(lambda.GetFunctionUrlConfigCommand, {
          FunctionName: fakeLambdaARNBase,
          Qualifier: fakeLambdaAlias,
        })
        .resolves({
          FunctionUrl: 'https://fakeurl.com',
        });

      const version = new Version({
        AppName: appName,
        SemVer: semVer,
        // Note: Pending is reported as "does not exist"
        // So don't set this to pending or the test will fail
        Status: 'routed',
        Type: 'lambda',
        LambdaARN: `${fakeLambdaARNBase}:${fakeLambdaAlias}`,
      });
      await version.Save(dbManager);

      const request: ILambdaAliasRequest = {
        appName,
        semVer,
        lambdaARN: fakeLambdaARNWithVersionEnd,
        type: 'lambdaAlias',
        overwrite: true,
      };
      const response = (await handler(request, {
        awsRequestId: '123',
      } as lambdaTypes.Context)) as ILambdaAliasResponse;

      expect(response.statusCode).toBe(200);
      expect(response.actionTaken).toBe('updated');
      expect(response.type).toBe('lambdaAlias');
      expect(response.lambdaAliasARN).toBe(`${fakeLambdaARNBase}:${fakeLambdaAlias}`);
      expect(response.functionUrl).toBe('https://fakeurl.com');
      expect(lambdaClient.calls()).toHaveLength(6);
    });

    describe('lambdaAlias - function ARN passed', () => {
      it('should 201 for function ARN that !exists when !overwrite', async () => {
        const appName = 'newapp';
        const semVer = '0.0.0';
        const fakeLambdaVersion = '31';
        const fakeLambdaAlias = 'v0_0_0';

        s3Client.onAnyCommand().rejects();
        stsClient.onAnyCommand().rejects();
        lambdaClient
          .onAnyCommand()
          .rejects()
          .on(lambda.PublishVersionCommand, {
            FunctionName: fakeLambdaARNBase,
          })
          .resolves({
            FunctionName: fakeLambdaARNBase,
            Version: fakeLambdaVersion,
          })
          .on(lambda.GetFunctionCommand, {
            FunctionName: fakeLambdaARNBase,
            Qualifier: fakeLambdaVersion,
          })
          .resolves({
            Configuration: {
              LastUpdateStatus: 'Successful',
            },
          })
          .on(lambda.GetFunctionCommand, {
            FunctionName: fakeLambdaARNBase,
            Qualifier: fakeLambdaVersion,
          })
          .resolves({
            Configuration: {
              LastUpdateStatus: 'Successful',
              FunctionArn: `${fakeLambdaARNBase}:${fakeLambdaVersion}`,
            },
          })
          .on(lambda.GetAliasCommand, {
            FunctionName: fakeLambdaARNBase,
            Name: fakeLambdaAlias,
          })
          .rejects({
            name: 'ResourceNotFoundException',
          })
          .on(lambda.CreateAliasCommand, {
            FunctionName: fakeLambdaARNBase,
            Name: fakeLambdaAlias,
            FunctionVersion: fakeLambdaVersion,
          })
          .resolves({
            AliasArn: `${fakeLambdaARNBase}:${fakeLambdaAlias}`,
            FunctionVersion: fakeLambdaVersion,
          })
          // AddTagToFunction
          .on(lambda.ListTagsCommand, {
            Resource: fakeLambdaARNBase,
          })
          .resolves({
            Tags: {
              'app-name': appName,
              'sem-ver': semVer,
            },
          })
          .on(lambda.TagResourceCommand, {
            Resource: fakeLambdaARNBase,
            Tags: {
              'microapp-managed': 'true',
            },
          })
          .resolves({})
          // AddOrUpdateFunctionUrl
          .on(lambda.GetFunctionUrlConfigCommand, {
            FunctionName: fakeLambdaARNBase,
            Qualifier: fakeLambdaAlias,
          })
          .resolves({
            FunctionUrl: 'https://fakeurl.com',
          });

        const request: ILambdaAliasRequest = {
          appName,
          semVer,
          lambdaARN: fakeLambdaARNBase,
          type: 'lambdaAlias',
        };
        const response = (await handler(request, {
          awsRequestId: '123',
        } as lambdaTypes.Context)) as ILambdaAliasResponse;

        expect(response.statusCode).toBe(201);
        expect(response.type).toBe('lambdaAlias');
        expect(response.lambdaAliasARN).toBe(`${fakeLambdaARNBase}:${fakeLambdaAlias}`);
        expect(response.functionUrl).toBe('https://fakeurl.com');
        expect(lambdaClient.calls()).toHaveLength(8);
      });
    });
  });
});
