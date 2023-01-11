import 'source-map-support/register';
// Used by ts-convict
import 'reflect-metadata';
import {
  IRequestBase,
  IDeployVersionPreflightRequest,
  ICreateApplicationRequest,
  IDeployerResponse,
  IDeployVersionRequest,
  IDeleteVersionRequest,
} from '@pwrdrvr/microapps-deployer-lib';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DBManager } from '@pwrdrvr/microapps-datalib';
import type * as lambda from 'aws-lambda';
import { Config } from './config/Config';
import AppController from './controllers/AppController';
import VersionController from './controllers/VersionController';
import Log from './lib/Log';

const log = Log.Instance;

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
  context?: lambda.Context,
): Promise<IDeployerResponse> {
  // Set meta on each request
  log.options.meta = {
    awsRequestId: context?.awsRequestId,
    requestType: event.type,
  };

  if (dbManager === undefined) {
    dbManager = new DBManager({
      dynamoClient,
      tableName: Config.instance.db.tableName,
    });
  }

  // Get the current AWS Account ID, once, if not set as env var
  if (config.awsAccountID === '' && context?.invokedFunctionArn !== undefined) {
    const parts = context.invokedFunctionArn.split(':');
    const accountIDStr = parts[4];
    if (accountIDStr !== '') {
      // @ts-expect-error we want to overwrite this config value
      config.awsAccountID = accountIDStr;
    }
  }

  Log.Instance.info('received request', {
    request: event,
  });

  try {
    // Dispatch based on request type
    switch (event.type) {
      case 'createApp': {
        const request = event as ICreateApplicationRequest;
        return await AppController.CreateApp({ dbManager, app: request });
      }

      case 'deleteVersion': {
        const request = event as IDeleteVersionRequest;
        return await VersionController.DeleteVersion({ dbManager, request, config });
      }

      case 'deployVersionPreflight': {
        const request = event as IDeployVersionPreflightRequest;
        return await VersionController.DeployVersionPreflight({ dbManager, request, config });
      }

      case 'deployVersion': {
        const request = event as IDeployVersionRequest;
        return await VersionController.DeployVersion({ dbManager, request, config });
      }

      default:
        return { statusCode: 400 };
    }
  } catch (err: any) {
    Log.Instance.error('Caught unexpected exception in handler');
    Log.Instance.error(err);
    return { statusCode: 500 };
  }
}
