import { plainToInstance } from 'class-transformer';
import { DBManager } from '..';
import { IVersionRecord } from './version';

/**
 * Represents a Rule
 */
export interface IRule {
  SemVer: string;
  AttributeName: string;
  AttributeValue: string;
}

type RuleSet = { [key: string]: IRule };

/**
 * Represents a Rules Record
 */
export interface IRulesRecord {
  PK: string;
  SK: 'rules';
  AppName: string;
  RuleSet: RuleSet;
  Version: number;
}

export class Rules implements IRulesRecord {
  public static async Load(opts: {
    dbManager: DBManager;
    key: Pick<IVersionRecord, 'AppName'>;
  }): Promise<Rules> {
    const { dbManager, key } = opts;

    const { Item } = await dbManager.ddbDocClient.get({
      TableName: dbManager.tableName,
      Key: { PK: `appName#${key.AppName}`.toLowerCase(), SK: 'rules' },
    });
    const record = plainToInstance<Rules, unknown>(Rules, Item);
    return record;
  }

  private _appName: string | undefined;
  private _ruleSet: RuleSet | undefined;
  private _version: number | undefined;

  public constructor(init?: Partial<IRulesRecord>) {
    Object.assign(this, init);
    if (init === undefined) {
      this._ruleSet = {};
    }
  }

  public get DbStruct(): IRulesRecord {
    return {
      PK: this.PK,
      SK: this.SK,
      AppName: this.AppName,
      RuleSet: this.RuleSet,
      Version: this.Version,
    };
  }

  public async Save(dbManager: DBManager): Promise<void> {
    // TODO: Validate that all the fields needed are present

    // Save under specific AppName key
    const taskByName = dbManager.ddbDocClient.put({
      TableName: dbManager.tableName,
      Item: this.DbStruct,
    });

    // Save under all Applications key
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
    return `appName#${this.AppName}`.toLowerCase();
  }

  public get SK(): 'rules' {
    return 'rules';
  }

  public get AppName(): string {
    return this._appName as string;
  }
  public set AppName(value: string) {
    this._appName = value.toLowerCase();
  }

  public get RuleSet(): RuleSet {
    return this._ruleSet as RuleSet;
  }
  public set RuleSet(value: RuleSet) {
    this._ruleSet = value;
  }

  public get Version(): number {
    return this._version as number;
  }
  public set Version(value: number) {
    this._version = value;
  }
}
