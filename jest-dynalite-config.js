// use export default for ts based configs
module.exports = {
  tables: [
    {
      TableName: 'microapps',
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
    },
  ],
  basePort: 8000,
};
