import * as dynamodb from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import Manager from '../index';

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

  constructor() {
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

  public async SaveAsync(dbClient: dynamodb.DynamoDB): Promise<void> {
    // TODO: Validate that all the fields needed are present

    // Save under specific AppName key
    this._keyBy = SaveBy.AppName;
    const taskByName = dbClient.putItem({
      TableName: Manager.TableName,
      Item: marshall(this.DbStruct),
    });

    // Save under all Applications key
    this._keyBy = SaveBy.Applications;
    const taskByApplications = dbClient.putItem({
      TableName: Manager.TableName,
      Item: marshall(this.DbStruct),
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
