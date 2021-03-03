import * as dynamodb from '@aws-sdk/client-dynamodb';
import * as dynamodbLocal from 'dynamodb-local';
import { promisify } from 'util';
import Manager from './common/microapps-datalib/index';
import fetch from 'node-fetch';
import { ChildProcess } from 'child_process';
const asyncSleep = promisify(setTimeout);

export let dynamoClient: dynamodb.DynamoDB;
let dynamodbProcess: ChildProcess;
let manager: Manager;

export async function mochaGlobalSetup(): Promise<void> {
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

  // Do something
  dynamoClient = new dynamodb.DynamoDB({ endpoint: 'http://localhost:8000/' });

  // Init the manager so it saves a handle to the fake DB
  manager = new Manager(dynamoClient);

  // Create the table
  const dynamoCreateTableOutput = await dynamoClient.createTable({
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

//
// Tear down the DynamoDB after tests
//
export async function mochaGlobalTeardown(): Promise<void> {
  dynamodbProcess.kill('SIGTERM');
}
