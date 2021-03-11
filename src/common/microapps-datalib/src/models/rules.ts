import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { plainToClass } from 'class-transformer';
import Manager from '../../src/index';

export interface IRule {
  SemVer: string;
  AttributeName: string;
  AttributeValue: string;
}

type RuleSet = { [key: string]: IRule };

export interface IRulesRecord {
  PK: string;
  SK: 'rules';
  AppName: string;
  RuleSet: RuleSet;
  Version: number;
}

export default class Rules implements IRulesRecord {
  public constructor(init?: Partial<IRulesRecord>) {
    Object.assign(this, init);
    if (init === undefined) {
      this.RuleSet = {};
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

  public async SaveAsync(ddbDocClient: DynamoDBDocument): Promise<void> {
    // TODO: Validate that all the fields needed are present

    // Save under specific AppName key
    const taskByName = ddbDocClient.put({
      TableName: Manager.TableName,
      Item: this.DbStruct,
    });

    // Save under all Applications key
    const taskByApplications = ddbDocClient.put({
      TableName: Manager.TableName,
      Item: this.DbStruct,
    });

    await Promise.all([taskByName, taskByApplications]);

    // Await the tasks so they can throw / complete
    await taskByName;
    await taskByApplications;
  }

  public static async LoadAsync(ddbDocClient: DynamoDBDocument, appName: string): Promise<Rules> {
    const { Item } = await ddbDocClient.get({
      TableName: Manager.TableName,
      Key: { PK: `appName#${appName}`.toLowerCase(), SK: 'rules' },
    });
    const record = plainToClass<Rules, unknown>(Rules, Item);
    return record;
  }

  public get PK(): string {
    return `appName#${this.AppName}`.toLowerCase();
  }

  public get SK(): 'rules' {
    return 'rules';
  }

  private _appName: string;
  public get AppName(): string {
    return this._appName;
  }
  public set AppName(value: string) {
    this._appName = value.toLowerCase();
  }

  private _ruleSet: RuleSet;
  public get RuleSet(): RuleSet {
    return this._ruleSet;
  }
  public set RuleSet(value: RuleSet) {
    this._ruleSet = value;
  }

  private _version;
  public get Version(): number {
    return this._version;
  }
  public set Version(value: number) {
    this._version = value;
  }
}
