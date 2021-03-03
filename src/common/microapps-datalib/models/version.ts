import * as dynamodb from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { plainToClass } from 'class-transformer';
import Manager from '../index';

enum SaveBy {
  AppName,
}

export interface IVersionRecord {
  PK: string;
  SK: string;
  AppName: string;
  SemVer: string;
  Type: string;
  Status: string;
  DefaultFile: string;
  IntegrationID: string;
}

export default class Version implements IVersionRecord {
  private _keyBy: SaveBy;

  constructor() {
    this._keyBy = SaveBy.AppName;
  }

  public get DbStruct(): IVersionRecord {
    return {
      PK: this.PK,
      SK: this.SK,
      AppName: this.AppName,
      SemVer: this.SemVer,
      Type: this.Type,
      Status: this.Status,
      DefaultFile: this.DefaultFile,
      IntegrationID: this.IntegrationID,
    };
  }

  public async SaveAsync(dbClient: dynamodb.DynamoDB): Promise<void> {
    // TODO: Validate that all the fields needed are present

    // Save under specific AppName key
    this._keyBy = SaveBy.AppName;
    await dbClient.putItem({
      TableName: Manager.TableName,
      Item: marshall(this.DbStruct),
    });
  }

  public static async LoadVersionsAsync(
    dbClient: dynamodb.DynamoDB,
    appName: string,
  ): Promise<Version[]> {
    const { Items } = await dbClient.query({
      TableName: Manager.TableName,
      KeyConditionExpression: 'PK = :pkval and begins_with(SK, :skval)',
      ExpressionAttributeValues: marshall({
        ':pkval': `appName#${appName}`.toLowerCase(),
        ':skval': 'version',
      }),
    });
    const records = [] as Version[];
    for (const item of Items) {
      const uItem = unmarshall(item);
      const record = plainToClass<Version, unknown>(Version, uItem);
      records.push(record);
    }

    return records;
  }

  public static async LoadVersionAsync(
    dbClient: dynamodb.DynamoDB,
    appName: string,
    semVer: string,
  ): Promise<Version> {
    const { Item } = await dbClient.getItem({
      TableName: Manager.TableName,
      Key: marshall({
        PK: `appName#${appName}`.toLowerCase(),
        SK: `version#${semVer}`.toLowerCase(),
      }),
    });
    const uItem = unmarshall(Item);
    const record = plainToClass<Version, unknown>(Version, uItem);
    return record;
  }

  public get PK(): string {
    switch (this._keyBy) {
      case SaveBy.AppName:
        return `appName#${this.AppName}`.toLowerCase();
      default:
        throw new Error('Missing SaveBy handler');
    }
  }

  public get SK(): string {
    switch (this._keyBy) {
      case SaveBy.AppName:
        return `version#${this.SemVer}`.toLowerCase();
      default:
        throw new Error('Missing SaveBy handler');
    }
  }

  private _appName: string;
  public get AppName(): string {
    return this._appName;
  }
  public set AppName(value: string) {
    this._appName = value.toLowerCase();
  }

  private _semVer: string;
  public get SemVer(): string {
    return this._semVer;
  }
  public set SemVer(value: string) {
    this._semVer = value;
  }

  private _type;
  public get Type(): string {
    return this._type;
  }
  public set Type(value: string) {
    this._type = value;
  }

  private _status;
  public get Status(): string {
    return this._status;
  }
  public set Status(value: string) {
    this._status = value;
  }

  private _defaultFile;
  public get DefaultFile(): string {
    return this._defaultFile;
  }
  public set DefaultFile(value: string) {
    this._defaultFile = value;
  }

  private _integrationID;
  public get IntegrationID(): string {
    return this._integrationID;
  }
  public set IntegrationID(value: string) {
    this._integrationID = value;
  }
}
