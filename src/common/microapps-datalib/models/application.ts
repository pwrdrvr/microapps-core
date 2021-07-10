import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { plainToClass } from 'class-transformer';
import { Config } from '../config';

enum SaveBy {
  AppName,
  Applications,
}

interface IApplicationRecord {
  PK: string;
  SK: string;
  AppName: string;
  DisplayName: string;
}

export default class Application implements IApplicationRecord {
  public static async LoadAsync(
    ddbDocClient: DynamoDBDocument,
    appName: string,
  ): Promise<Application> {
    const { Item } = await ddbDocClient.get({
      TableName: Config.TableName,
      Key: { PK: `appName#${appName}`.toLowerCase(), SK: 'application' },
    });
    const record = plainToClass<Application, unknown>(Application, Item);
    return record;
  }

  public static async LoadAllAppsAsync(ddbDocClient: DynamoDBDocument): Promise<Application[]> {
    const { Items } = await ddbDocClient.query({
      TableName: Config.TableName,
      KeyConditionExpression: 'PK = :pkval',
      ExpressionAttributeValues: {
        ':pkval': 'applications',
      },
    });

    const records = [] as Application[];
    if (Items !== undefined) {
      for (const item of Items) {
        const record = plainToClass<Application, unknown>(Application, item);
        records.push(record);
      }
    }

    return records;
  }

  private _keyBy: SaveBy;
  private _appName: string | undefined;
  private _displayName: string | undefined;

  public constructor(init?: Partial<IApplicationRecord>) {
    Object.assign(this, init);
    this._keyBy = SaveBy.AppName;
  }

  public get DbStruct(): IApplicationRecord {
    return {
      PK: this.PK,
      SK: this.SK,
      AppName: this.AppName,
      DisplayName: this.DisplayName,
    };
  }

  public async SaveAsync(ddbDocClient: DynamoDBDocument): Promise<void> {
    // TODO: Validate that all the fields needed are present

    // Save under specific AppName key
    this._keyBy = SaveBy.AppName;
    const taskByName = ddbDocClient.put({
      TableName: Config.TableName,
      Item: this.DbStruct,
    });

    // Save under all Applications key
    this._keyBy = SaveBy.Applications;
    const taskByApplications = ddbDocClient.put({
      TableName: Config.TableName,
      Item: this.DbStruct,
    });

    await Promise.all([taskByName, taskByApplications]);

    // Await the tasks so they can throw / complete
    await taskByName;
    await taskByApplications;
  }

  public get PK(): string {
    switch (this._keyBy) {
      case SaveBy.Applications:
        return 'applications';
      case SaveBy.AppName:
        return `appName#${this.AppName}`.toLowerCase();
      default:
        throw new Error('Missing SaveBy handler');
    }
  }

  public get SK(): string {
    switch (this._keyBy) {
      case SaveBy.Applications:
        return `appName#${this.AppName}`.toLowerCase();
      case SaveBy.AppName:
        return 'application';
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

  public get DisplayName(): string {
    return this._displayName as string;
  }
  public set DisplayName(value: string) {
    this._displayName = value;
  }
}
