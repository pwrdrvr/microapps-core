import { plainToClass } from 'class-transformer';
import { DBManager } from '../manager';
import { Rules } from './rules';
import { Version, IVersionRecord } from './version';

enum SaveBy {
  AppName,
  Applications,
}

/**
 * Represents Versions and Rules
 */
export interface IVersionsAndRules {
  Versions: Version[];
  Rules: Rules;
}

interface IApplicationRecord {
  PK: string;
  SK: string;
  AppName: string;
  DisplayName: string;
}

export class Application implements IApplicationRecord {
  public static async UpdateDefaultRule(opts: {
    dbManager: DBManager;
    key: Pick<IVersionRecord, 'AppName' | 'SemVer'>;
  }): Promise<void> {
    const { dbManager, key } = opts;

    const rules = await Rules.Load({ dbManager, key });

    const defaultRule = rules.RuleSet.default;
    defaultRule.SemVer = key.SemVer;

    await rules.Save(dbManager);
  }

  public static async GetVersionsAndRules(opts: {
    dbManager: DBManager;
    key: Pick<IApplicationRecord, 'AppName'>;
  }): Promise<IVersionsAndRules> {
    const { key, dbManager } = opts;

    // Get all versions and rules for an app
    // Note: versions are moved out of this key as they become inactive
    // There should be less than, say, 100 versions per app

    const versionTask = Version.LoadVersions({ dbManager, key });
    const rulesTask = Rules.Load({ dbManager, key });

    await Promise.all([versionTask, rulesTask]);

    return {
      Versions: await versionTask,
      Rules: await rulesTask,
    };
  }

  public static async Load(opts: {
    dbManager: DBManager;
    key: Pick<IApplicationRecord, 'AppName'>;
  }): Promise<Application> {
    const { key, dbManager } = opts;

    const { Item } = await dbManager.ddbDocClient.get({
      TableName: dbManager.tableName,
      Key: { PK: `appName#${key.AppName}`.toLowerCase(), SK: 'application' },
    });
    const record = plainToClass<Application, unknown>(Application, Item);
    return record;
  }

  public static async LoadAllApps(dbManager: DBManager): Promise<Application[]> {
    const { Items } = await dbManager.ddbDocClient.query({
      TableName: dbManager.tableName,
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

  public async Save(dbManager: DBManager): Promise<void> {
    // TODO: Validate that all the fields needed are present

    // Save under specific AppName key
    this._keyBy = SaveBy.AppName;
    const taskByName = dbManager.ddbDocClient.put({
      TableName: dbManager.tableName,
      Item: this.DbStruct,
    });

    // Save under all Applications key
    this._keyBy = SaveBy.Applications;
    const taskByApplications = dbManager.ddbDocClient.put({
      TableName: dbManager.tableName,
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
