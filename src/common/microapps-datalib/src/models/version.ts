import { plainToClass } from 'class-transformer';
import { DBManager } from '..';

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

export type IVersionRecordNoKeysLoose = Partial<
  Omit<IVersionRecord, 'PK' | 'SK' | 'AppName' | 'SemVer'>
> &
  Pick<IVersionRecord, 'AppName' | 'SemVer'>;

export class Version implements IVersionRecord {
  public static async LoadVersions(opts: {
    dbManager: DBManager;
    key: Pick<IVersionRecord, 'AppName'>;
  }): Promise<Version[]> {
    const { dbManager, key } = opts;

    const { Items } = await dbManager.ddbDocClient.query({
      TableName: dbManager.tableName,
      KeyConditionExpression: 'PK = :pkval and begins_with(SK, :skval)',
      ExpressionAttributeValues: {
        ':pkval': `appName#${key.AppName}`.toLowerCase(),
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

  public static async LoadVersion(opts: {
    dbManager: DBManager;
    key: Pick<IVersionRecord, 'AppName' | 'SemVer'>;
  }): Promise<Version> {
    const { dbManager, key } = opts;

    const { Item } = await dbManager.ddbDocClient.get({
      TableName: dbManager.tableName,
      Key: {
        PK: `appName#${key.AppName}`.toLowerCase(),
        SK: `version#${key.SemVer}`.toLowerCase(),
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
  private _status: VersionStatus;
  private _defaultFile: string;
  private _integrationID: string;

  public constructor(init?: Partial<IVersionRecordNoKeysLoose>) {
    this._keyBy = SaveBy.AppName;
    this._status = 'pending';
    this._defaultFile = '';
    this._integrationID = '';

    // Save any passed in values over the defaults
    Object.assign(this, init);
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

  public async Save(dbManager: DBManager): Promise<void> {
    // TODO: Validate that all the fields needed are present

    // Save under specific AppName key
    this._keyBy = SaveBy.AppName;
    await dbManager.ddbDocClient.put({
      TableName: dbManager.tableName,
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
