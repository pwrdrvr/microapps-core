import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { plainToClass } from 'class-transformer';
import { Config } from '../config';

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
  public static async LoadAsync(ddbDocClient: DynamoDBDocument, appName: string): Promise<Rules> {
    const { Item } = await ddbDocClient.get({
      TableName: Config.TableName,
      Key: { PK: `appName#${appName}`.toLowerCase(), SK: 'rules' },
    });
    const record = plainToClass<Rules, unknown>(Rules, Item);
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

  public async SaveAsync(ddbDocClient: DynamoDBDocument): Promise<void> {
    // TODO: Validate that all the fields needed are present

    // Save under specific AppName key
    const taskByName = ddbDocClient.put({
      TableName: Config.TableName,
      Item: this.DbStruct,
    });

    // Save under all Applications key
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
