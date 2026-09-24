const dynalite = require('dynalite');
const {
  CreateTableCommand,
  DeleteTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
} = require('@aws-sdk/client-dynamodb');
const { tables } = require('../../test-dynamodb-config');

const server = dynalite({ createTableMs: 0, deleteTableMs: 0, updateTableMs: 0 });
const client = new DynamoDBClient({
  endpoint: process.env.MOCK_DYNAMODB_ENDPOINT,
  region: 'local',
});

async function waitForTable(tableName, exists) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      const { Table } = await client.send(new DescribeTableCommand({ TableName: tableName }));
      if (exists && Table?.TableStatus === 'ACTIVE') return;
    } catch (error) {
      if (error.name !== 'ResourceNotFoundException') throw error;
      if (!exists) return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Timed out waiting for table ${tableName} to ${exists ? 'exist' : 'be deleted'}`);
}

beforeAll(async () => {
  await new Promise((resolve, reject) => {
    server.listen(Number(process.env.MOCK_DYNAMODB_PORT), (error) =>
      error ? reject(error) : resolve(),
    );
  });
});

beforeEach(async () => {
  for (const table of tables) {
    await client.send(new CreateTableCommand(table));
    await waitForTable(table.TableName, true);
  }
});

afterEach(async () => {
  for (const table of tables) {
    try {
      await client.send(new DeleteTableCommand({ TableName: table.TableName }));
    } catch (error) {
      if (error.name !== 'ResourceNotFoundException') throw error;
    }
    await waitForTable(table.TableName, false);
  }
});

afterAll(async () => {
  client.destroy();
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});
