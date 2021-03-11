import * as dynamodb from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import * as dynamodbLocal from 'dynamodb-local';
import { promisify } from 'util';
import Manager from '@pwrdrvr/microapps-datalib';
import fetch from 'node-fetch';
import { ChildProcess } from 'child_process';
const asyncSleep = promisify(setTimeout);

export const dynamoClient: { client?: dynamodb.DynamoDB; ddbDocClient?: DynamoDBDocument } = {};
let dynamodbProcess: ChildProcess;

export async function mochaGlobalSetup(): Promise<void> {
  try {
    //
    // Create a DynamoDB for testing
    //
    dynamodbProcess = await dynamodbLocal.launch(8000, '', ['-sharedDb']);

    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const response = await fetch('http://localhost:8000/');
        if (response.status === 400) {
          // Break out when Dynamodb accepts but returns an error
          break;
        }
      } catch (error) {
        await asyncSleep(500);
      }
    }

    dynamoClient.client = new dynamodb.DynamoDB({ endpoint: 'http://localhost:8000/' });
    dynamoClient.ddbDocClient = DynamoDBDocument.from(dynamoClient.client);

    // Create the table
    await dynamoClient.client.createTable({
      TableName: Manager.TableName,
      AttributeDefinitions: [
        {
          AttributeName: 'PK',
          AttributeType: 'S',
        },
        {
          AttributeName: 'SK',
          AttributeType: 'S',
        },
      ],
      KeySchema: [
        {
          AttributeName: 'PK',
          KeyType: 'HASH',
        },
        {
          AttributeName: 'SK',
          KeyType: 'RANGE',
        },
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1,
      },
    });
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
}

//
// Tear down the DynamoDB after tests
//
export async function mochaGlobalTeardown(): Promise<void> {
  dynamodbProcess.kill('SIGTERM');
}
