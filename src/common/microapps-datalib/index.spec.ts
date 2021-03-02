import { describe, it } from 'mocha';
import { expect } from 'chai';
import * as dynamodb from '@aws-sdk/client-dynamodb';
import * as dynamodbLocal from 'dynamodb-local';
import { borkBork } from './index';
import { promisify } from 'util';
import fetch from 'node-fetch';
const asyncSleep = promisify(setTimeout);

describe("let's test something", () => {
  let dynamodbProcess;

  before('setup DynamoDB', async function () {
    this.timeout(10000);
    dynamodbProcess = await dynamodbLocal.launch(8000);

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

    after('teardown dynamodb', async function () {
      dynamodbProcess.kill('SIGTERM');
    });

    // Do something
    const dynamoClient = new dynamodb.DynamoDBClient({ endpoint: 'http://localhost:8000/' });
    this.dynamoClient = dynamoClient;

    // Create the table
    const dynamoCreateTable = new dynamodb.CreateTableCommand({
      TableName: 'MicroApps',
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
    await dynamoClient.send(dynamoCreateTable);
  });

  it('calling borkBork should always return false', () => {
    // Call the borkBork function
    const result = borkBork();
    expect(result).equal(false);
  });
});
