import * as dynamodb from '@aws-sdk/client-dynamodb';

import Application from './models/application';
import Version from './models/version';
import Rules from './models/rules';

export { Application, Version, Rules };

export interface IVersionsAndRules {
  Versions: Version[];
  Rules: Rules;
}

export default class Manager {
  private static _client?: dynamodb.DynamoDB;

  private static readonly _tableName = 'MicroApps';

  public constructor(client?: dynamodb.DynamoDB) {
    if (client === undefined && Manager._client === undefined) {
      Manager._client = new dynamodb.DynamoDB({});
    } else {
      Manager._client = client;
    }
  }

  public get DBClient(): dynamodb.DynamoDB {
    return Manager._client;
  }

  public static get TableName(): string {
    return Manager._tableName;
  }

  public async GetVersionsAndRules(appName: string): Promise<IVersionsAndRules> {
    // Get all versions and rules for an app
    // Note: versions are moved out of this key as they become inactive
    // There should be less than, say, 100 versions per app

    const versionTask = Version.LoadVersionsAsync(Manager._client, appName);
    const rulesTask = Rules.LoadAsync(Manager._client, appName);

    await Promise.all([versionTask, rulesTask]);

    return {
      Versions: await versionTask,
      Rules: await rulesTask,
    };
  }
}
