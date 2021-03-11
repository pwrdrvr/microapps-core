import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { plainToClass } from 'class-transformer';
import Manager from '../../src/index';

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
  private _keyBy: SaveBy;

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
      TableName: Manager.TableName,
      Item: this.DbStruct,
    });

    // Save under all Applications key
    this._keyBy = SaveBy.Applications;
    const taskByApplications = ddbDocClient.put({
      TableName: Manager.TableName,
      Item: this.DbStruct,
    });

    await Promise.all([taskByName, taskByApplications]);

    // Await the tasks so they can throw / complete
    await taskByName;
    await taskByApplications;
  }

  public static async LoadAsync(
    ddbDocClient: DynamoDBDocument,
    appName: string,
  ): Promise<Application> {
    const { Item } = await ddbDocClient.get({
      TableName: Manager.TableName,
      Key: { PK: `appName#${appName}`.toLowerCase(), SK: 'application' },
    });
    const record = plainToClass<Application, unknown>(Application, Item);
    return record;
  }

  public static async LoadAllAppsAsync(ddbDocClient: DynamoDBDocument): Promise<Application[]> {
    const { Items } = await ddbDocClient.query({
      TableName: Manager.TableName,
      KeyConditionExpression: 'PK = :pkval',
      ExpressionAttributeValues: {
        ':pkval': 'applications',
      },
    });

    const records = [] as Application[];
    for (const item of Items) {
      const record = plainToClass<Application, unknown>(Application, item);
      records.push(record);
    }

    return records;
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

  private _appName: string;
  public get AppName(): string {
    return this._appName;
  }
  public set AppName(value: string) {
    this._appName = value.toLowerCase();
  }

  private _displayName;
  public get DisplayName(): string {
    return this._displayName;
  }
  public set DisplayName(value: string) {
    this._displayName = value;
  }
}
