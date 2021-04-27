import { DynamoDB } from '@aws-sdk/client-dynamodb';
import Manager, { IVersionsAndRules } from '@pwrdrvr/microapps-datalib';
import type * as lambda from 'aws-lambda';
import fs from 'fs';
import { LambdaLog, LogMessage } from 'lambda-log';

const localTesting = process.env.DEBUG ? true : false;

const dynamoClient = process.env.TEST
  ? new DynamoDB({ endpoint: 'http://localhost:8000' })
  : new DynamoDB({});
const manager = new Manager(dynamoClient);

export type DeployerRequest = {
  a: number;
};

export type DeployerResponse = {
  a: number;
};

export async function handler(
  event: DeployerRequest,
  context: lambda.Context,
): Promise<DeployerResponse> {
  const response = {
    a: 100,
  } as DeployerResponse;

  // Change the logger on each request
  const log = new LambdaLog({
    dev: localTesting,
    //debug: localTesting,
    meta: {
      source: 'microapps-deployer',
      awsRequestId: context.awsRequestId,
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    dynamicMeta: (_message: LogMessage) => {
      return {
        timestamp: new Date().toISOString(),
      };
    },
  });

  // TODO: Re-implement the DeployerSvc

  return response;
}

// Run the function locally for testing
if (localTesting) {
  const payload = { a: 100 } as DeployerRequest;
  Promise.all([
    handler(payload as DeployerRequest, { awsRequestId: 'local-testing' } as lambda.Context),
  ]);
}
