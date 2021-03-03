import * as dynamodb from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

export default class Manager {
  private _client: dynamodb.DynamoDB;

  private static readonly _tableName = 'MicroApps';

  constructor(client: dynamodb.DynamoDB) {
    this._client = client;
  }

  public get DBClient(): dynamodb.DynamoDB {
    return this._client;
  }

  public static get TableName(): string {
    return Manager._tableName;
  }
}
