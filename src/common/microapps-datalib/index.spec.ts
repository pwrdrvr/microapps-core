import { describe, it } from 'mocha';
import { expect } from 'chai';
import * as dynamodb from '@aws-sdk/client-dynamodb';
import * as dynamodbLocal from 'dynamodb-local';
import Manager, { borkBork } from './index';
import { promisify } from 'util';
import fetch from 'node-fetch';
import Application from './models/application';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
const asyncSleep = promisify(setTimeout);

describe.skip('database manager', () => {
  let dynamodbProcess;
  let dynamoClient: dynamodb.DynamoDB;

  //
  // Create a DynamoDB for testing
  //
  before('setup DynamoDB', async function () {
    this.timeout(10000);
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

    //
    // Tear down the DynamoDB after tests
    //
    after('teardown dynamodb', async function () {
      dynamodbProcess.kill('SIGTERM');
    });

    // Do something
    dynamoClient = new dynamodb.DynamoDB({ endpoint: 'http://localhost:8000/' });

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
  });

  it('calling borkBork should always return false', () => {
    // Call the borkBork function
    const result = borkBork();
    expect(result).equal(false);
  });

  describe('application table', async () => {
    it('saving an application should create two records', async () => {
      const application = new Application();
      application.AppName = 'Cat';
      application.DisplayName = 'Dog';

      await application.SaveAsync(dynamoClient);

      // .query({
      //   TableName: DataManager._tableName,
      //   KeyConditionExpression: 'PK = :pkval and SK = :skval',
      //   ExpressionAttributeValues: {
      //     ':pkval': pk,
      //     ':skval': 'subscription',
      //   },
      //   ProjectionExpression: 'PK,SK,DriverEmail,DriverUuid,FirstName,PaidThroughDate',
      // })

      // TODO: Get the records out of the DB
      // 'PK,SK,AppName,DisplayName'
      {
        const { Item } = await dynamoClient.getItem({
          TableName: Manager.TableName,
          Key: marshall({ PK: 'appname#cat', SK: 'application' }),
          // ProjectionExpression: 'PK,SK,AppName,DisplayName',
        });
        const uItem = unmarshall(Item);
        expect(uItem.PK).equal('appname#cat');
        expect(uItem.SK).equal('application');
        expect(uItem.AppName).equal('cat');
        expect(uItem.DisplayName).equal('Dog');
      }

      {
        const { Item } = await dynamoClient.getItem({
          TableName: Manager.TableName,
          Key: marshall({ PK: 'applications', SK: 'appname#cat' }),
          // ProjectionExpression: 'PK,SK,AppName,DisplayName',
        });
        const uItem = unmarshall(Item);
        expect(uItem.PK).equal('applications');
        expect(uItem.SK).equal('appname#cat');
        expect(uItem.AppName).equal('cat');
        expect(uItem.DisplayName).equal('Dog');
      }
    });
  });
});
