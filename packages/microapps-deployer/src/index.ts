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
  ILambdaAliasRequest,
} from '@pwrdrvr/microapps-deployer-lib';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { DBManager } from '@pwrdrvr/microapps-datalib';
import * as lambda from 'aws-lambda';
import { Config } from './config/Config';
import AppController from './controllers/AppController';
import {
  DeleteVersion,
  DeployVersion,
  DeployVersionPreflight,
  LambdaAlias,
} from './controllers/version';
import Log from './lib/Log';
import { DeployVersionLite } from './controllers/version/DeployVersionLite';

const log = Log.Instance;
const lambdaClient = new LambdaClient({});

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
    // Handle proxied requests when in proxy mode
    if (config.parentDeployerLambdaARN) {
      // TODO: Need `deployVersionLite` here that only cleans DB records and/or S3 files
      if (['deployVersionPreflight', 'deployVersionLite', 'deleteVersion'].includes(event.type)) {
        const response = await lambdaClient.send(
          new InvokeCommand({
            FunctionName: config.parentDeployerLambdaARN,
            Payload: Buffer.from(JSON.stringify(event)),
          }),
        );

        const responsePayload = response.Payload
          ? (JSON.parse(response.Payload.toString()) as IDeployerResponse)
          : { statusCode: 500 };
        Log.Instance.info('response from parent deployer', {
          ...response,
          Payload: responsePayload,
        });

        return responsePayload;
      }
    }

    // Dispatch based on locally handled request type
    switch (event.type) {
      case 'createApp': {
        const request = event as ICreateApplicationRequest;
        return await AppController.CreateApp({ dbManager, app: request });
      }

      case 'deleteVersion': {
        const request = event as IDeleteVersionRequest;
        return await DeleteVersion({ dbManager, request, config });
      }

      case 'deployVersionPreflight': {
        const request = event as IDeployVersionPreflightRequest;
        return await DeployVersionPreflight({ dbManager, request, config });
      }

      case 'deployVersion': {
        const request = event as IDeployVersionRequest;
        return await DeployVersion({ dbManager, request, config });
      }

      case 'deployVersionLite': {
        const request = event as IDeployVersionRequest;
        return await DeployVersionLite({ dbManager, request, config });
      }

      case 'lambdaAlias': {
        const request = event as ILambdaAliasRequest;
        const response = await LambdaAlias({ request, config });
        Log.Instance.info('lambdaAlias response', { response });
        return response;
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
