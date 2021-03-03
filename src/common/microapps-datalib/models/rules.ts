import * as dynamodb from '@aws-sdk/client-dynamodb';
import { plainToClass } from 'class-transformer';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import Manager from '../index';

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

  public async SaveAsync(dbClient: dynamodb.DynamoDB): Promise<void> {
    // TODO: Validate that all the fields needed are present

    // Save under specific AppName key
    const taskByName = dbClient.putItem({
      TableName: Manager.TableName,
      Item: marshall(this.DbStruct),
    });

    // Save under all Applications key
    const taskByApplications = dbClient.putItem({
      TableName: Manager.TableName,
      Item: marshall(this.DbStruct),
    });

    await Promise.all([taskByName, taskByApplications]);

    // Await the tasks so they can throw / complete
    await taskByName;
    await taskByApplications;
  }

  public static async LoadAsync(dbClient: dynamodb.DynamoDB, appName: string): Promise<Rules> {
    const { Item } = await dbClient.getItem({
      TableName: Manager.TableName,
      Key: marshall({ PK: `appName#${appName}`.toLowerCase(), SK: 'rules' }),
    });
    const uItem = unmarshall(Item);
    const record = plainToClass<Rules, unknown>(Rules, uItem);
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
