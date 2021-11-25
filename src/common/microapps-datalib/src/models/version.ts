import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { plainToClass } from 'class-transformer';
import { Config } from '../config';

enum SaveBy {
  AppName,
}

export type VersionStatus =
  | 'pending'
  | 'assets-copied'
  | 'permissioned'
  | 'integrated'
  | 'routed'
  | 'deployed';

export interface IVersionRecord {
  PK: string;
  SK: string;
  AppName: string;
  SemVer: string;
  Type: string;
  Status: VersionStatus;
  DefaultFile: string;
  IntegrationID: string;
}

export default class Version implements IVersionRecord {
  public static async LoadVersionsAsync(
    ddbDocClient: DynamoDBDocument,
    appName: string,
  ): Promise<Version[]> {
    const { Items } = await ddbDocClient.query({
      TableName: Config.TableName,
      KeyConditionExpression: 'PK = :pkval and begins_with(SK, :skval)',
      ExpressionAttributeValues: {
        ':pkval': `appName#${appName}`.toLowerCase(),
        ':skval': 'version',
      },
    });
    const records = [] as Version[];
    if (Items !== undefined) {
      for (const item of Items) {
        const record = plainToClass<Version, unknown>(Version, item);
        records.push(record);
      }
    }

    return records;
  }

  public static async LoadVersionAsync(
    ddbDocClient: DynamoDBDocument,
    appName: string,
    semVer: string,
  ): Promise<Version> {
    const { Item } = await ddbDocClient.get({
      TableName: Config.TableName,
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

  private _keyBy: SaveBy;
  private _appName: string | undefined;
  private _semVer: string | undefined;
  private _type: string | undefined;
  private _status: VersionStatus | undefined;
  private _defaultFile: string | undefined;
  private _integrationID: string | undefined;

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
      TableName: Config.TableName,
      Item: this.DbStruct,
    });
  }

  public get SK(): string {
    switch (this._keyBy) {
      case SaveBy.AppName:
        return `version#${this.SemVer}`.toLowerCase();
      default:
        throw new Error('Missing SaveBy handler');
    }
  }

  public get AppName(): string {
    return this._appName as string;
  }
  public set AppName(value: string) {
    this._appName = value.toLowerCase();
  }

  public get SemVer(): string {
    return this._semVer as string;
  }
  public set SemVer(value: string) {
    this._semVer = value;
  }

  public get Type(): string {
    return this._type as string;
  }
  public set Type(value: string) {
    this._type = value;
  }

  public get Status(): VersionStatus {
    return this._status;
  }
  public set Status(value: VersionStatus) {
    this._status = value;
  }

  public get DefaultFile(): string {
    return this._defaultFile as string;
  }
  public set DefaultFile(value: string) {
    this._defaultFile = value;
  }

  public get IntegrationID(): string {
    return this._integrationID as string;
  }
  public set IntegrationID(value: string) {
    this._integrationID = value;
  }
}
