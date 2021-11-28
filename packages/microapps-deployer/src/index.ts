import 'source-map-support/register';
// Used by ts-convict
import 'reflect-metadata';
import {
  IRequestBase,
  IDeployVersionPreflightRequest,
  ICreateApplicationRequest,
  IDeployerResponse,
  IDeployVersionRequest,
} from '@pwrdrvr/microapps-deployer-lib';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DBManager } from '@pwrdrvr/microapps-datalib';
import type * as lambda from 'aws-lambda';
import { LambdaLog, LogMessage } from 'lambda-log';
import { Config } from './config/Config';
import AppController from './controllers/AppController';
import VersionController from './controllers/VersionController';
import Log from './lib/Log';

const localTesting = process.env.DEBUG ? true : false;

let dbManager: DBManager;
let dynamoClient = new DynamoDBClient({
  maxAttempts: 8,
});

export function overrideDBManager(opts: {
  dbManager: DBManager;
  dynamoClient: DynamoDBClient;
}): void {
  dbManager = opts.dbManager;
  dynamoClient = opts.dynamoClient;
}
dbManager = new DBManager({ dynamoClient, tableName: Config.instance.db.tableName });

const config = Config.instance;

export async function handler(
  event: IRequestBase,
  context: lambda.Context,
): Promise<IDeployerResponse> {
  if (dbManager === undefined) {
    dbManager = new DBManager({
      dynamoClient,
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
        return await AppController.CreateApp({ dbManager, app: request });
      }

      case 'deployVersionPreflight': {
        const request = event as IDeployVersionPreflightRequest;
        return await VersionController.DeployVersionPreflight({ dbManager, request, config });
      }

      case 'deployVersion': {
        const request = event as IDeployVersionRequest;
        return await VersionController.DeployVersion({ dbManager, request, config });
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
  void Promise.all([
    handler(payload as IRequestBase, { awsRequestId: 'local-testing' } as lambda.Context),
  ]);
}
