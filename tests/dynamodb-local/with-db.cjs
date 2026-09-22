const {
  DynamoDBClient,
  CreateTableCommand,
  DeleteTableCommand,
} = require('@aws-sdk/client-dynamodb');
const { tables } = require('../../test-dynamodb-config');
const client = new DynamoDBClient({
  endpoint: process.env.MOCK_DYNAMODB_ENDPOINT,
  region: 'local',
});

beforeEach(async () => {
  for (const table of tables) {
    try {
      await client.send(new DeleteTableCommand({ TableName: table.TableName }));
    } catch (error) {
      if (error.name !== 'ResourceNotFoundException') throw error;
    }
    await client.send(new CreateTableCommand(table));
  }
}, 20000);
afterAll(() => client.destroy());
