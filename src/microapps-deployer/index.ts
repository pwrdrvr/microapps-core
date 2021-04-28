import { DynamoDB } from '@aws-sdk/client-dynamodb';
import Manager, { IVersionsAndRules } from '@pwrdrvr/microapps-datalib';
import type * as lambda from 'aws-lambda';
import { LambdaLog, LogMessage } from 'lambda-log';

const localTesting = process.env.DEBUG ? true : false;

const dynamoClient = process.env.TEST
  ? new DynamoDB({ endpoint: 'http://localhost:8000' })
  : new DynamoDB({});
const manager = new Manager(dynamoClient);

interface RequestBase {
  type: 'createApp' | 'deployVersion' | 'checkVersionExists';
}

export interface CreateApplicationRequest extends RequestBase {
  type: 'createApp';
  appName: string;
}

export interface CheckVersionExistsRequest extends RequestBase {
  type: 'checkVersionExists';
  appName: string;
  semVer: string;
}

export interface DeployVersionRequest extends RequestBase {
  type: 'deployVersion';
  appName: string;
  semVer: string;
  s3SourceURI: string;
  lambdaARN: string;
  defaultFile: string;
}

export async function handler(event: RequestBase, context: lambda.Context): Promise<string> {
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

  return 'OK';
}

// Run the function locally for testing
if (localTesting) {
  const payload = { appName: 'test-app' } as CreateApplicationRequest;
  Promise.all([
    handler(payload as RequestBase, { awsRequestId: 'local-testing' } as lambda.Context),
  ]);
}
