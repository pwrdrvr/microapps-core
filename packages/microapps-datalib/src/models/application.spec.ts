import '../../../../tests/dynamodb/withDb';
import * as dynamodb from '@aws-sdk/client-dynamodb';
import { DBManager } from '../manager';
import { Application } from './application';
import { Version } from './version';
import { Rules } from './rules';

let dynamoClient: dynamodb.DynamoDBClient;
let dbManager: DBManager;

const TEST_TABLE_NAME = 'microapps';

describe('application records', () => {
  beforeAll(() => {
    dynamoClient = new dynamodb.DynamoDBClient({
      endpoint: process.env.MOCK_DYNAMODB_ENDPOINT,
      tls: false,
      region: 'local',
    });

    // Init the DB manager to point it at the right table
    dbManager = new DBManager({ dynamoClient, tableName: TEST_TABLE_NAME });
  });

  afterAll(() => {
    dynamoClient.destroy();
  }, 20000);

  it('saving an application should create two records', async () => {
    const application = new Application();
    application.AppName = 'Cat';
    application.DisplayName = 'Dog';

    await application.Save(dbManager);

    //
    // Single item key
    //
    {
      const { Item } = await dbManager.ddbDocClient.get({
        TableName: TEST_TABLE_NAME,
        Key: { PK: 'appname#cat', SK: 'application' },
      });
      expect(Item).toBeDefined();
      expect(Item?.PK).toBe('appname#cat');
      expect(Item?.SK).toBe('application');
      expect(Item?.AppName).toBe('cat');
      expect(Item?.DisplayName).toBe('Dog');
    }

    //
    // List key
    //
    {
      const { Item } = await dbManager.ddbDocClient.get({
        TableName: TEST_TABLE_NAME,
        Key: { PK: 'applications', SK: 'appname#cat' },
        // ProjectionExpression: 'PK,SK,AppName,DisplayName',
      });
      expect(Item).toBeDefined();
      expect(Item?.PK).toBe('applications');
      expect(Item?.SK).toBe('appname#cat');
      expect(Item?.AppName).toBe('cat');
      expect(Item?.DisplayName).toBe('Dog');
    }
  });

  it('stores normalized alias pointers without duplicating applications in the listing', async () => {
    const app = new Application({
      AppName: 'Cat',
      DisplayName: 'Cat',
      ExtraAppNames: ['Kitty', 'Kitten', 'KITTY'],
    });
    await app.Save(dbManager);
    expect(app.ExtraAppNames).toEqual(['kitty', 'kitten']);
    for (const alias of app.ExtraAppNames) {
      const { Item } = await dbManager.ddbDocClient.get({
        TableName: TEST_TABLE_NAME,
        Key: { PK: `appname#${alias}`, SK: 'application' },
      });
      expect(Item).toMatchObject({
        RecordType: 'applicationAlias',
        AliasName: alias,
        AppName: 'cat',
      });
      expect(await Application.ResolveAppName({ dbManager, appName: alias.toUpperCase() })).toBe(
        'cat',
      );
      expect(await Application.Load({ dbManager, key: { AppName: alias } })).toBeUndefined();
    }
    expect(await Application.LoadAllApps(dbManager)).toHaveLength(1);
    expect((await Application.Load({ dbManager, key: { AppName: 'cat' } })).ExtraAppNames).toEqual([
      'kitty',
      'kitten',
    ]);
  });

  it('replaces and removes aliases while preserving the canonical app', async () => {
    const app = new Application({ AppName: 'cat', DisplayName: 'Cat', ExtraAppNames: ['kitty'] });
    await app.Save(dbManager);
    app.ExtraAppNames = ['kitten'];
    await app.Save(dbManager);
    expect(await Application.ResolveAppName({ dbManager, appName: 'kitty' })).toBeUndefined();
    expect(await Application.ResolveAppName({ dbManager, appName: 'kitten' })).toBe('cat');
    app.ExtraAppNames = [];
    await app.Save(dbManager);
    expect(await Application.ResolveAppName({ dbManager, appName: 'kitten' })).toBeUndefined();
    expect(await Application.ResolveAppName({ dbManager, appName: 'cat' })).toBe('cat');
  });

  it.each(['real app', 'alias'])(
    'rejects collisions with another %s without partially changing aliases',
    async (kind) => {
      await new Application({
        AppName: 'owner',
        DisplayName: 'Owner',
        ExtraAppNames: ['taken'],
      }).Save(dbManager);
      const app = new Application({ AppName: 'cat', DisplayName: 'Cat', ExtraAppNames: ['kitty'] });
      await app.Save(dbManager);
      app.ExtraAppNames = ['new-name', kind === 'real app' ? 'owner' : 'taken'];
      await expect(app.Save(dbManager)).rejects.toThrow(/already owned/);
      expect(await Application.ResolveAppName({ dbManager, appName: 'new-name' })).toBeUndefined();
      expect(await Application.ResolveAppName({ dbManager, appName: 'kitty' })).toBe('cat');
      expect(
        (await Application.Load({ dbManager, key: { AppName: 'cat' } })).ExtraAppNames,
      ).toEqual(['kitty']);
    },
  );

  it('does not create a real app over an existing alias', async () => {
    await new Application({
      AppName: 'owner',
      DisplayName: 'Owner',
      ExtraAppNames: ['taken'],
    }).Save(dbManager);
    await expect(
      new Application({ AppName: 'taken', DisplayName: 'Bad' }).Save(dbManager),
    ).rejects.toThrow(/already an alias/);
  });

  it('only allows one application to claim an alias concurrently', async () => {
    const results = await Promise.allSettled(
      ['one', 'two'].map(async (AppName) =>
        new Application({ AppName, DisplayName: AppName, ExtraAppNames: ['shared'] }).Save(
          dbManager,
        ),
      ),
    );
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const apps = await Application.LoadAllApps(dbManager);
    expect(apps).toHaveLength(1);
    expect(await Application.ResolveAppName({ dbManager, appName: 'shared' })).toBe(
      apps[0].AppName,
    );
  });

  it.each(['', 'cat', '[root]', '_next', 'foo/bar', 'has space', 'foo.json'])(
    'rejects invalid alias %s',
    async (alias) => {
      await expect(
        new Application({ AppName: 'cat', DisplayName: 'Cat', ExtraAppNames: [alias] }).Save(
          dbManager,
        ),
      ).rejects.toThrow(/top-level aliases/);
      expect(await Application.LoadAllApps(dbManager)).toHaveLength(0);
    },
  );

  it('load function should load records', async () => {
    let application = new Application();
    application.AppName = 'App1';
    application.DisplayName = 'Application One';
    await application.Save(dbManager);

    application = new Application();
    application.AppName = 'App2';
    application.DisplayName = 'Application Two';
    await application.Save(dbManager);

    {
      const record = await Application.Load({ dbManager, key: { AppName: 'App1' } });

      expect(record.PK).toBe('appname#app1');
      expect(record.SK).toBe('application');
      expect(record.AppName).toBe('app1');
      expect(record.DisplayName).toBe('Application One');
    }

    {
      const record = await Application.Load({ dbManager, key: { AppName: 'App2' } });

      expect(record.PK).toBe('appname#app2');
      expect(record.SK).toBe('application');
      expect(record.AppName).toBe('app2');
      expect(record.DisplayName).toBe('Application Two');
    }
  });

  it('Load should handle missing records', async () => {
    const record = await Application.Load({ dbManager, key: { AppName: 'App1' } });
    expect(record).toBeUndefined();
  });

  it('LoadAllAppsAsync should return all applications', async () => {
    let application = new Application();
    application.AppName = 'Bpp1';
    application.DisplayName = 'Bpplication One';
    await application.Save(dbManager);

    application = new Application();
    application.AppName = 'Bpp2';
    application.DisplayName = 'Bpplication Two';
    await application.Save(dbManager);

    const applications = await Application.LoadAllApps(dbManager);
    expect(applications).toBeDefined();
    const appOne = applications.find((value) => {
      return value.AppName === 'bpp1';
    });
    expect(appOne).toBeDefined();
    expect(appOne).toHaveProperty('AppName');
    expect(appOne?.AppName).toBe('bpp1');
    expect(appOne?.DisplayName).toBe('Bpplication One');

    const appTwo = applications.find((value) => {
      return value.AppName === 'bpp2';
    });
    expect(appTwo).toBeDefined();
    expect(appTwo).toHaveProperty('AppName');
    expect(appTwo?.AppName).toBe('bpp2');
    expect(appTwo?.DisplayName).toBe('Bpplication Two');
  });

  it('should get versions and rules when asked', async () => {
    const app = new Application({
      AppName: 'Bat',
      DisplayName: 'Bat App',
    });
    await app.Save(dbManager);

    const version = new Version({
      AppName: 'Bat',
      DefaultFile: 'bat.html',
      IntegrationID: 'abcd',
      SemVer: '3.2.1-beta0',
      Status: 'deployed',
      Type: 'lambda',
    });
    await version.Save(dbManager);

    const rules = new Rules({
      AppName: 'Bat',
      Version: 0,
      RuleSet: { default: { SemVer: '3.2.1-beta0', AttributeName: '', AttributeValue: '' } },
    });
    await rules.Save(dbManager);

    const versAndRules = await Application.GetVersionsAndRules({
      dbManager,
      key: { AppName: 'bat' },
    });

    expect(versAndRules).toHaveProperty('Versions');
    expect(versAndRules).toHaveProperty('Rules');
    expect(versAndRules.Rules).toHaveProperty('RuleSet');
    expect(versAndRules.Rules.RuleSet).toHaveProperty('default');
    expect(versAndRules.Rules.RuleSet.default).toHaveProperty('SemVer');
    expect(versAndRules.Rules.RuleSet.default.SemVer).toBe('3.2.1-beta0');
    expect(versAndRules.Versions.length).toBe(1);
    expect(versAndRules.Versions[0].SemVer).toBe('3.2.1-beta0');
  });

  it('should update default rule', async () => {
    const app = new Application({
      AppName: 'Bat2',
      DisplayName: 'Bat App',
    });
    await app.Save(dbManager);

    const version = new Version({
      AppName: 'Bat2',
      DefaultFile: 'bat.html',
      IntegrationID: 'abcd',
      SemVer: '3.2.1-beta0',
      Status: 'deployed',
      Type: 'lambda',
    });
    await version.Save(dbManager);

    const rules = new Rules({
      AppName: 'Bat2',
      Version: 0,
      RuleSet: { default: { SemVer: '3.2.1-beta0', AttributeName: '', AttributeValue: '' } },
    });
    await rules.Save(dbManager);

    // Check version before update
    let versAndRules = await Application.GetVersionsAndRules({
      dbManager,
      key: { AppName: 'bat2' },
    });
    expect(versAndRules.Rules.RuleSet.default.SemVer).toBe('3.2.1-beta0');

    // Update default version
    await Application.UpdateDefaultRule({ dbManager, key: { AppName: 'bat2', SemVer: '3.2.2' } });
    versAndRules = await Application.GetVersionsAndRules({ dbManager, key: { AppName: 'bat2' } });
    expect(versAndRules.Rules.RuleSet.default.SemVer).toBe('3.2.2');
  });
});
