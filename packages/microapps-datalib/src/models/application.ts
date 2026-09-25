import { randomUUID } from 'crypto';
import type { TransactWriteCommandInput } from '@aws-sdk/lib-dynamodb';
import { plainToInstance } from 'class-transformer';
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
  ExtraAppNames?: string[];
  Revision?: string;
}

export class ApplicationAliasConflictError extends Error {}
export class InvalidApplicationAliasError extends Error {}

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
    // Alias pointers are not standalone application records.
    const record = plainToInstance<Application, unknown>(
      Application,
      Item?.AliasName ? undefined : Item,
    );
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
        const record = plainToInstance<Application, unknown>(Application, item);
        records.push(record);
      }
    }

    return records;
  }

  /** Resolve a top-level route to its owning application without following alias chains. */
  public static async ResolveAppName(opts: {
    dbManager: DBManager;
    appName: string;
  }): Promise<string | undefined> {
    const { dbManager } = opts;
    const appName = opts.appName.toLowerCase();
    const { Item } = await dbManager.ddbDocClient.get({
      TableName: dbManager.tableName,
      Key: { PK: `appname#${appName}`, SK: 'application' },
    });
    if (!Item) return undefined;
    return Item.AppName;
  }

  private _keyBy: SaveBy;
  private _appName: string | undefined;
  private _displayName: string | undefined;
  private _extraAppNames: string[] | undefined;
  public Revision?: string;

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
      ExtraAppNames: this.ExtraAppNames,
      ...(this.Revision ? { Revision: this.Revision } : {}),
    };
  }

  public async Save(dbManager: DBManager): Promise<void> {
    const aliases = this.ExtraAppNames;
    if (
      aliases.length > 49 ||
      aliases.some((name) => !/^[a-z0-9][a-z0-9_-]{0,127}$/.test(name) || name === this.AppName)
    ) {
      throw new InvalidApplicationAliasError(
        'Use at most 49 distinct top-level aliases (letters, digits, hyphens, underscores), excluding the app name',
      );
    }

    const key = { PK: `appname#${this.AppName}`, SK: 'application' };
    const { Item: previous } = await dbManager.ddbDocClient.get({
      TableName: dbManager.tableName,
      Key: key,
      ConsistentRead: true,
    });
    if (previous?.AliasName) {
      throw new ApplicationAliasConflictError(`App name is already an alias: ${this.AppName}`);
    }
    const oldAliases: string[] = previous?.ExtraAppNames ?? [];
    const revision = randomUUID();
    this._keyBy = SaveBy.AppName;
    const record = { ...this.DbStruct, Revision: revision };
    const TransactItems: NonNullable<TransactWriteCommandInput['TransactItems']> = [
      {
        Put: {
          TableName: dbManager.tableName,
          Item: record,
          ConditionExpression: previous
            ? 'AppName = :owner AND attribute_not_exists(AliasName) AND ' +
              (previous.Revision ? 'Revision = :revision' : 'attribute_not_exists(Revision)')
            : 'attribute_not_exists(PK)',
          ...(previous
            ? {
                ExpressionAttributeValues: {
                  ':owner': this.AppName,
                  ...(previous.Revision ? { ':revision': previous.Revision } : {}),
                },
              }
            : {}),
        },
      },
      {
        Put: {
          TableName: dbManager.tableName,
          Item: { ...record, PK: 'applications', SK: key.PK },
        },
      },
      ...aliases.map((alias) => ({
        Put: {
          TableName: dbManager.tableName,
          Item: {
            PK: `appname#${alias}`,
            SK: 'application',
            RecordType: 'applicationAlias',
            AliasName: alias,
            AppName: this.AppName,
          },
          ConditionExpression:
            'attribute_not_exists(PK) OR (AppName = :owner AND AliasName = :alias)',
          ExpressionAttributeValues: { ':owner': this.AppName, ':alias': alias },
        },
      })),
      ...oldAliases
        .filter((alias) => !aliases.includes(alias))
        .map((alias) => ({
          Delete: {
            TableName: dbManager.tableName,
            Key: { PK: `appname#${alias}`, SK: 'application' },
            ConditionExpression: 'AppName = :owner AND AliasName = :alias',
            ExpressionAttributeValues: { ':owner': this.AppName, ':alias': alias },
          },
        })),
    ];
    try {
      await dbManager.ddbDocClient.transactWrite({ TransactItems });
      this.Revision = revision;
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === 'TransactionCanceledException' &&
        (error as Error & { CancellationReasons?: { Code?: string }[] }).CancellationReasons?.some(
          (reason) =>
            reason.Code === 'ConditionalCheckFailed' || reason.Code === 'TransactionConflict',
        )
      ) {
        throw new ApplicationAliasConflictError(
          'An app name or alias is already owned, or the application changed concurrently; reload and retry',
        );
      }
      throw error;
    }
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

  public get ExtraAppNames(): string[] {
    return [...(this._extraAppNames ?? [])];
  }
  public set ExtraAppNames(value: string[]) {
    if (!Array.isArray(value) || value.some((name) => typeof name !== 'string')) {
      throw new InvalidApplicationAliasError('extraAppNames must be an array of strings');
    }
    this._extraAppNames = [...new Set(value.map((name) => name.toLowerCase()))];
  }
}
