import 'source-map-support/register';
// Used by ts-convict
import 'reflect-metadata';
import type {
  IRequestBase,
  IDeployVersionPreflightRequest,
  ICreateApplicationRequest,
  IDeployerResponse,
  IDeployVersionRequest,
  IDeleteVersionRequest,
  ILambdaAliasRequest,
  IGetVersionRequest,
  IGetConfigRequest,
} from '@pwrdrvr/microapps-deployer-lib';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { DBManager } from '@pwrdrvr/microapps-datalib';
import * as lambda from 'aws-lambda';
import { Config } from './config/Config';
import AppController from './controllers/AppController';
import ConfigController from './controllers/ConfigController';
import {
  DeleteVersion,
  DeployVersion,
  DeployVersionPreflight,
  GetVersion,
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

Log.Instance.info('Deployer config', config);

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
    // Handle 100% proxied requests when in proxy mode
    // Note: Delete is not 100% proxied, some happens locally, some in the parent account
    if (config.parentDeployerLambdaARN) {
      if (['createApp', 'deployVersionPreflight', 'deployVersionLite'].includes(event.type)) {
        const response = await lambdaClient.send(
          new InvokeCommand({
            FunctionName: config.parentDeployerLambdaARN,
            Qualifier: 'currentVersion',
            Payload: Buffer.from(JSON.stringify(event)),
          }),
        );

        const responsePayload = response.Payload
          ? (JSON.parse(Buffer.from(response.Payload).toString()) as IDeployerResponse)
          : { statusCode: 500 };
        Log.Instance.info('response from parent deployer', {
          ...response,
          Payload: {
            ...responsePayload,
            awsCredentials: 'redacted',
          },
        });

        return responsePayload;
      } else if (['deployVersion'].includes(event.type)) {
        // If we're in proxy mode, we don't want to deploy the version
        // ourselves, but we do want to return a response that indicates
        // that the version is deployed
        return {
          statusCode: 400,
          errorMessage: 'Deployer is in proxy mode - `deployVersion` is not allowed',
        };
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

      case 'getVersion': {
        const request = event as IGetVersionRequest;
        return await GetVersion({ dbManager, request, config });
      }

      case 'getConfig': {
        const request = event as IGetConfigRequest;
        return ConfigController.GetConfig({ request, config });
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
  } catch (err) {
    Log.Instance.error('Caught unexpected exception in handler');
    if (typeof err === 'string' || err instanceof Error) {
      Log.Instance.error(err);
    } else {
      Log.Instance.error('An unknown error occurred');
    }
    return { statusCode: 500 };
  }
}
