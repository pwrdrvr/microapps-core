import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

/**
 * Represents a DB Manager
 */
export interface IDBManager {
  readonly client: DynamoDBClient;
  readonly ddbDocClient: DynamoDBDocument;
}

export class DBManager implements IDBManager {
  private _client: DynamoDBClient;
  private _ddbDocClient: DynamoDBDocument;
  private _tableName: string;

  public get client(): DynamoDBClient {
    return this._client;
  }

  public get ddbDocClient(): DynamoDBDocument {
    return this._ddbDocClient;
  }

  public constructor(args: { dynamoClient: DynamoDBClient; tableName: string }) {
    const { dynamoClient, tableName } = args;
    this._tableName = tableName;
    this._client = dynamoClient;
    this._ddbDocClient = DynamoDBDocument.from(this._client);
  }

  public get tableName(): string {
    return this._tableName;
  }
  public set tableName(value: string) {
    this._tableName = value;
  }
}
