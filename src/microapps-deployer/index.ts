// Used by ts-convict
import 'reflect-metadata';
import { TSConvict } from 'ts-convict';
import { Config } from './config/Config';

import { DynamoDB } from '@aws-sdk/client-dynamodb';
import Manager from '@pwrdrvr/microapps-datalib';
import type * as lambda from 'aws-lambda';
import Log from './lib/Log';
import { LambdaLog, LogMessage } from 'lambda-log';
import AppController from './controllers/AppController';
import VersionController from './controllers/VersionController';

// Load the config
const myConfigLoader = new TSConvict<Config>(Config);
const myConfig: Config = myConfigLoader.load(Config.configFiles());

const localTesting = process.env.DEBUG ? true : false;

const dynamoClient = process.env.TEST
  ? new DynamoDB({ endpoint: 'http://localhost:8000' })
  : new DynamoDB({});

// FIXME: Move to a file to fix circular reference
// FIXME: Pass the table name from an env var
export const manager = new Manager(dynamoClient);

interface IRequestBase {
  type: 'createApp' | 'deployVersion' | 'checkVersionExists';
}

export interface ICreateApplicationRequest extends IRequestBase {
  type: 'createApp';
  appName: string;
  displayName: string;
}

export interface ICheckVersionExistsRequest extends IRequestBase {
  type: 'checkVersionExists';
  appName: string;
  semVer: string;
}

export interface IDeployVersionRequest extends IRequestBase {
  type: 'deployVersion';
  appName: string;
  semVer: string;
  s3SourceURI: string;
  lambdaARN: string;
  defaultFile: string;
}

export interface IDeployerResponse {
  statusCode: number;
}

export async function handler(
  event: IRequestBase,
  context: lambda.Context,
): Promise<IDeployerResponse> {
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

      case 'checkVersionExists': {
        const request = event as ICheckVersionExistsRequest;
        return await VersionController.CheckVersionExists(request);
      }

      case 'deployVersion': {
        const request = event as IDeployVersionRequest;
        return await VersionController.DeployVersion(request);
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
