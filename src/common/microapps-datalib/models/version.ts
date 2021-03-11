import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
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

  public constructor(init?: Partial<IVersionRecord>) {
    Object.assign(this, init);
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

  public async SaveAsync(ddbDocClient: DynamoDBDocument): Promise<void> {
    // TODO: Validate that all the fields needed are present

    // Save under specific AppName key
    this._keyBy = SaveBy.AppName;
    await ddbDocClient.put({
      TableName: Manager.TableName,
      Item: this.DbStruct,
    });
  }

  public static async LoadVersionsAsync(
    ddbDocClient: DynamoDBDocument,
    appName: string,
  ): Promise<Version[]> {
    const { Items } = await ddbDocClient.query({
      TableName: Manager.TableName,
      KeyConditionExpression: 'PK = :pkval and begins_with(SK, :skval)',
      ExpressionAttributeValues: {
        ':pkval': `appName#${appName}`.toLowerCase(),
        ':skval': 'version',
      },
    });
    const records = [] as Version[];
    for (const item of Items) {
      const record = plainToClass<Version, unknown>(Version, item);
      records.push(record);
    }

    return records;
  }

  public static async LoadVersionAsync(
    ddbDocClient: DynamoDBDocument,
    appName: string,
    semVer: string,
  ): Promise<Version> {
    const { Item } = await ddbDocClient.get({
      TableName: Manager.TableName,
      Key: {
        PK: `appName#${appName}`.toLowerCase(),
        SK: `version#${semVer}`.toLowerCase(),
      },
    });
    const record = plainToClass<Version, unknown>(Version, Item);
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
