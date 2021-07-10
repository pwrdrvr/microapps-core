// Used by ts-convict
import 'source-map-support/register';
import 'reflect-metadata';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import Manager from '@pwrdrvr/microapps-datalib';
import type * as lambda from 'aws-lambda';
import Log from './lib/Log';
import { LambdaLog, LogMessage } from 'lambda-log';
import AppController from './controllers/AppController';
import VersionController from './controllers/VersionController';
import { Config } from './config/Config';

const localTesting = process.env.DEBUG ? true : false;

const dynamoClient = process.env.TEST
  ? new DynamoDB({ endpoint: 'http://localhost:8000' })
  : new DynamoDB({});

let manager: Manager;

const config = Config.instance;

interface IRequestBase {
  type: 'createApp' | 'deployVersion' | 'deployVersionPreflight';
}

export interface ICreateApplicationRequest extends IRequestBase {
  type: 'createApp';
  appName: string;
  displayName: string;
}

export interface IDeployVersionRequestBase extends IRequestBase {
  appName: string;
  semVer: string;
}

export interface IDeployVersionPreflightRequest extends IDeployVersionRequestBase {
  type: 'deployVersionPreflight';
}

export interface IDeployVersionRequest extends IDeployVersionRequestBase {
  type: 'deployVersion';
  lambdaARN: string;
  defaultFile: string;
}

export interface IDeployerResponse {
  statusCode: number;
}

export interface IDeployVersionPreflightResponse extends IDeployerResponse {
  s3UploadUrl?: string;
  awsCredentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
  };
}

export async function handler(
  event: IRequestBase,
  context: lambda.Context,
): Promise<IDeployerResponse> {
  if (manager === undefined) {
    manager = new Manager({
      dynamoDB: dynamoClient,
      tableName: Config.instance.db.tableName,
    });
  }

  // Get the current AWS Account ID, once, if not set as env var
  if (config.awsAccountID === 0 && context?.invokedFunctionArn !== undefined) {
    const parts = context.invokedFunctionArn.split(':');
    const accountIDStr = parts[4];
    if (accountIDStr !== '') {
      config.awsAccountID = parseInt(accountIDStr, 10);
    }
  }

  // Change the logger on each request
  Log.Instance = new LambdaLog({
    dev: localTesting,
    debug: localTesting,
    meta: {
      source: 'microapps-deployer',
      awsRequestId: context.awsRequestId,
      requestType: event.type,
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    dynamicMeta: (_message: LogMessage) => {
      return {
        timestamp: new Date().toISOString(),
      };
    },
  });

  try {
    // Dispatch based on request type
    switch (event.type) {
      case 'createApp': {
        const request = event as ICreateApplicationRequest;
        return await AppController.CreateApp(request);
      }

      case 'deployVersionPreflight': {
        const request = event as IDeployVersionPreflightRequest;
        return await VersionController.DeployVersionPreflight(request, config);
      }

      case 'deployVersion': {
        const request = event as IDeployVersionRequest;
        return await VersionController.DeployVersion(request, config);
      }
    }
  } catch (err) {
    Log.Instance.error('Caught unexpected exception in handler');
    Log.Instance.error(err);
    return { statusCode: 500 };
  }
}

// Run the function locally for testing
if (localTesting) {
  const payload = { appName: 'test-app' } as ICreateApplicationRequest;
  Promise.all([
    handler(payload as IRequestBase, { awsRequestId: 'local-testing' } as lambda.Context),
  ]);
}
