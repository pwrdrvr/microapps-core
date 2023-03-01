import { Application, DBManager, IVersionsAndRules, Version } from '@pwrdrvr/microapps-datalib';

export class AppVersionCache {
  private static readonly negativeCacheTimeout = 2 * 60 * 1000; // 2 minutes

  private static readonly cache: {
    [AppName: string]: {
      [SemVer: string]: { version: Version; timestamp: number };
    };
  } = {};

  private static readonly negativeCache: {
    [AppName: string]: {
      [SemVer: string]: { timestamp: number };
    };
  } = {};

  /**
   * Get single version for an app
   */
  public static async LoadVersion(opts: {
    dbManager: DBManager;
    key: { AppName: string; SemVer: string };
  }): Promise<Version | undefined> {
    const {
      dbManager,
      key: { AppName, SemVer },
    } = opts;

    // Check if this version is negative cached
    // If the cached info is too old, refresh it
    // If it is, return that this version does not exist
    if (this.negativeCache[AppName] && this.negativeCache[AppName][SemVer]) {
      const cachedVersion = this.negativeCache[AppName][SemVer];
      if (cachedVersion) {
        if (cachedVersion.timestamp + this.negativeCacheTimeout > Date.now()) {
          //  Negative cache is fresh enough
          return undefined;
        }
      }
    }

    // Check if this version is already cached
    // If the cached info is too old, refresh it
    // If it is, return the cached version
    if (this.cache[AppName] && this.cache[AppName][SemVer]) {
      const cachedVersion = this.cache[AppName][SemVer];
      if (cachedVersion) {
        // Cached version exists, use it
        return cachedVersion.version;
      }
    }

    const response = await Version.LoadVersion({
      dbManager,
      key: { AppName, SemVer },
    });

    if (response) {
      // Cache the version
      if (!this.cache[AppName]) {
        this.cache[AppName] = {};
      }
      this.cache[AppName][SemVer] = {
        version: response,
        timestamp: Date.now(),
      };

      // Remove negative cache
      if (this.negativeCache[AppName] && this.negativeCache[AppName][SemVer]) {
        delete this.negativeCache[AppName][SemVer];
      }
    } else {
      // Negative cache the version
      if (!this.negativeCache[AppName]) {
        this.negativeCache[AppName] = {};
      }
      this.negativeCache[AppName][SemVer] = {
        timestamp: Date.now(),
      };
    }

    return response;
  }

  public static async GetVersionsAndRules(opts: {
    dbManager: DBManager;
    AppName: string;
  }): Promise<IVersionsAndRules> {
    const { dbManager, AppName } = opts;

    // TODO: Check if this app is negative cached
    // If the cached info is too old, refresh it
    // If it is, return that this app does not exist

    // TODO: Check if this app is already cached
    // If the cached info is too old, refresh it
    // If it is, return the cached version

    const response = await Application.GetVersionsAndRules({ dbManager, key: { AppName } });

    response.Versions;
    return response;
  }
}
