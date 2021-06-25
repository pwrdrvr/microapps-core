import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

import Application from './models/application';
import Version from './models/version';
import Rules from './models/rules';
import { Config } from './config';

export { Application, Version, Rules };

export interface IVersionsAndRules {
  Versions: Version[];
  Rules: Rules;
}

export default class Manager {
  private static _client: DynamoDB;
  private static _ddbDocClient: DynamoDBDocument;

  public constructor(args: { dynamoDB: DynamoDB; tableName: string }) {
    const { dynamoDB, tableName } = args;
    if (Manager._client === undefined) {
      Config.TableName = tableName;
      Manager._client = dynamoDB;
      Manager._ddbDocClient = DynamoDBDocument.from(Manager._client);
    }
  }

  public static get TableName(): string {
    return Config.TableName;
  }

  public static get DBClient(): DynamoDB {
    return Manager._client;
  }
  public static get DBDocClient(): DynamoDBDocument {
    return Manager._ddbDocClient;
  }

  public static async UpdateDefaultRule(appName: string, semVer: string): Promise<void> {
    const rules = await Rules.LoadAsync(Manager._ddbDocClient, appName);

    const defaultRule = rules.RuleSet.default;
    defaultRule.SemVer = semVer;

    await rules.SaveAsync(this._ddbDocClient);
  }

  public static async GetVersionsAndRules(appName: string): Promise<IVersionsAndRules> {
    // Get all versions and rules for an app
    // Note: versions are moved out of this key as they become inactive
    // There should be less than, say, 100 versions per app

    const versionTask = Version.LoadVersionsAsync(Manager._ddbDocClient, appName);
    const rulesTask = Rules.LoadAsync(Manager._ddbDocClient, appName);

    await Promise.all([versionTask, rulesTask]);

    return {
      Versions: await versionTask,
      Rules: await rulesTask,
    };
  }
}
