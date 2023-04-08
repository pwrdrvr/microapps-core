import { Application, DBManager, Rules, Version } from '@pwrdrvr/microapps-datalib';

interface ICacheEntry<T> {
  timestamp: number;
  data: T;
}

export class AppVersionCache {
  private negativeAppNameCache: Map<string, ICacheEntry<undefined>>;
  private appRulesCache: Map<string, ICacheEntry<Rules>>;
  private appVersionsCache: Map<string, Map<string, ICacheEntry<Version>>>;
  private dbManager: DBManager;

  private static instance: AppVersionCache;

  /**
   * Get the AppVersionCache instance or create it
   */
  public static GetInstance({ dbManager }: { dbManager: DBManager }): AppVersionCache {
    if (!AppVersionCache.instance) {
      AppVersionCache.instance = new AppVersionCache({ dbManager });
    }

    return AppVersionCache.instance;
  }

  constructor({ dbManager }: { dbManager: DBManager }) {
    this.negativeAppNameCache = new Map();
    this.appRulesCache = new Map();
    this.appVersionsCache = new Map();
    this.dbManager = dbManager;
  }

  private get CacheIsEmpty(): boolean {
    return this.appRulesCache.size === 0 && this.appVersionsCache.size === 0;
  }

  /**
   * Used to populate the cache when the cache is completely empty
   * @param appName
   */
  private async PopulateEmptyCache({
    key: { AppName },
  }: {
    key: { AppName: string };
  }): Promise<void> {
    const versionsAndRules = await Application.GetVersionsAndRules({
      dbManager: this.dbManager,
      key: { AppName },
    });

    if (!versionsAndRules || (versionsAndRules.Versions.length === 0 && !versionsAndRules.Rules)) {
      this.negativeAppNameCache.set(AppName.toLowerCase(), {
        timestamp: Date.now(),
        data: undefined,
      });
      return;
    }

    // Remove negative cache entry if it exists
    this.negativeAppNameCache.delete(AppName.toLowerCase());

    this.appRulesCache.set(AppName.toLowerCase(), {
      timestamp: Date.now(),
      data: versionsAndRules.Rules,
    });

    const versionsMap = new Map<string, ICacheEntry<Version>>();
    for (const version of versionsAndRules.Versions) {
      versionsMap.set(version.SemVer, {
        timestamp: Date.now(),
        data: version,
      });
    }
    this.appVersionsCache.set(AppName.toLowerCase(), versionsMap);
  }

  public ClearCache(): void {
    this.appRulesCache.clear();
    this.appVersionsCache.clear();
  }

  /**
   * Get Rules for an app
   *
   * Populates the cache if empty
   * Freshens a cache entry if it is stale
   * Feturns the cached value if it is fresh
   * Fetches a single item if the cache is not empty but the item is not in the cache
   *
   * @param appName
   * @returns
   */
  public async GetRules({
    key: { AppName },
  }: {
    key: { AppName: string };
  }): Promise<Rules | undefined> {
    const now = Date.now();

    // Check the negative cache first
    const negativeCacheEntry = this.negativeAppNameCache.get(AppName.toLowerCase());
    if (negativeCacheEntry && now - negativeCacheEntry.timestamp < 60000) {
      return undefined;
    } else if (negativeCacheEntry) {
      this.negativeAppNameCache.delete(AppName.toLowerCase());
    }

    const ruleCacheEntry = this.appRulesCache.get(AppName.toLowerCase());
    if (ruleCacheEntry && now - ruleCacheEntry.timestamp < 60000) {
      return ruleCacheEntry.data;
    }

    if (this.CacheIsEmpty || !ruleCacheEntry) {
      await this.PopulateEmptyCache({ key: { AppName } });

      return this.appRulesCache.get(AppName.toLowerCase())?.data;
    }

    const versionsAndRules = await Application.GetVersionsAndRules({
      dbManager: this.dbManager,
      key: { AppName: AppName },
    });
    this.appRulesCache.set(AppName.toLowerCase(), { timestamp: now, data: versionsAndRules.Rules });

    return versionsAndRules.Rules;
  }

  /**
   * Get Version info for an app and semVer
   *
   * Populates the cache if empty
   * Freshens a cache entry if it is stale
   * Feturns the cached value if it is fresh
   * Fetches a single item if the cache is not empty but the item is not in the cache
   *
   * @param appName
   * @returns
   */
  public async GetVersionInfo({
    key: { AppName, SemVer },
  }: {
    key: { AppName: string; SemVer: string };
  }): Promise<Version | undefined> {
    const now = Date.now();

    // Check the negative cache first
    const negativeCacheEntry = this.negativeAppNameCache.get(AppName.toLowerCase());
    if (negativeCacheEntry && now - negativeCacheEntry.timestamp < 60000) {
      return undefined;
    } else if (negativeCacheEntry) {
      this.negativeAppNameCache.delete(AppName.toLowerCase());
    }

    // Check if we have the item cached and if it is fresh enough
    const versionCacheEntry = this.appVersionsCache.get(AppName.toLowerCase());
    if (versionCacheEntry) {
      const versionInfo = versionCacheEntry.get(SemVer);
      if (versionInfo && now - versionInfo.timestamp < 900000) {
        return versionInfo.data;
      }
    }

    if (this.CacheIsEmpty || !versionCacheEntry) {
      await this.PopulateEmptyCache({ key: { AppName } });
      if (!this.appVersionsCache) {
        return undefined;
      }

      return this.appVersionsCache.get(AppName.toLowerCase())?.get(SemVer)?.data;
    } else {
      // We have some data in the cache, but not for this version
      // So we need to get the data for this version
      const versionInfo = await Version.LoadVersion({
        dbManager: this.dbManager,
        key: { AppName, SemVer: SemVer },
      });
      if (!versionInfo) {
        return undefined;
      }

      const versionsMap = this.appVersionsCache.get(AppName.toLowerCase());
      if (!versionsMap) {
        return undefined;
      }

      // Save the version info in the cache
      versionsMap.set(SemVer, { timestamp: now, data: versionInfo });

      return versionInfo;
    }
  }
}
