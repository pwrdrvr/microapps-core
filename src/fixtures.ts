/* eslint-disable import/no-extraneous-dependencies */
import { ChildProcess } from 'child_process';
import { promisify } from 'util';
import * as dynamodb from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import Manager from '@pwrdrvr/microapps-datalib';
import * as dynamodbLocal from 'dynamodb-local';
import fetch from 'node-fetch';
const asyncSleep = promisify(setTimeout);

export const TEST_TABLE_NAME = 'MicroAppsLocalTest';

export const dynamoClient: { client?: dynamodb.DynamoDB; ddbDocClient?: DynamoDBDocument } = {};
let dynamodbProcess: ChildProcess;

export async function DropTable(): Promise<void> {
  await dynamoClient.client?.deleteTable({
    TableName: Manager.TableName,
  });
}

export async function InitializeTable(): Promise<void> {
  // Create the table
  await dynamoClient.client?.createTable({
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
}

export async function mochaGlobalSetup(): Promise<void> {
  try {
    console.log('mochaGlobalSetup - Creating DB');

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

    const manager = new Manager({ dynamoDB: dynamoClient.client, tableName: TEST_TABLE_NAME });

    console.log('mochaGlobalSetup - DB Created');
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
