import { DBManager, Version } from '@pwrdrvr/microapps-datalib';
import { AppVersionCache } from './app-cache';
import { IGetRouteResult } from './get-route';
import Log from './lib/log';

const log = Log.Instance;

/**
 * Redirect the request to app/x.y.z/? to app/x.y.z/{defaultFile}
 * @param response
 * @param normalizedPathPrefix
 * @param appName
 * @param semVer
 * @returns
 */

export async function RedirectToDefaultFile(opts: {
  dbManager: DBManager;
  normalizedPathPrefix?: string;
  appName: string;
  semVer: string;
  appNameOrRootTrailingSlash: string;
}): Promise<IGetRouteResult | undefined> {
  const {
    dbManager,
    normalizedPathPrefix = '',
    appName,
    appNameOrRootTrailingSlash,
    semVer,
  } = opts;
  let versionInfo: Version | undefined;

  try {
    // Get the cache
    const appVersionCache = AppVersionCache.GetInstance({ dbManager });

    versionInfo = await appVersionCache.GetVersionInfo({
      key: { AppName: appName, SemVer: semVer },
    });
  } catch (error) {
    log.info(
      `LoadVersion threw for '${normalizedPathPrefix}/${appNameOrRootTrailingSlash}${semVer}' - falling through to app routing'`,
      {
        appName,
        semVer,
        error,
      },
    );
    return undefined;
  }

  if (versionInfo === undefined) {
    log.info(
      `LoadVersion returned undefined for '${normalizedPathPrefix}/${appNameOrRootTrailingSlash}${semVer}', assuming not found - falling through to app routing'`,
      {
        appName,
        semVer,
      },
    );
    return undefined;
  }

  if (!versionInfo.DefaultFile) {
    return undefined;
  }

  log.info(
    `found '${normalizedPathPrefix}/${appNameOrRootTrailingSlash}${semVer}' - returning 302 to ${normalizedPathPrefix}/${appNameOrRootTrailingSlash}${semVer}/${versionInfo.DefaultFile}`,
    {
      statusCode: 302,
      routedPath: `${normalizedPathPrefix}/${appNameOrRootTrailingSlash}${semVer}/${versionInfo.DefaultFile}`,
    },
  );

  return {
    statusCode: 302,
    redirectLocation: `${normalizedPathPrefix}/${appNameOrRootTrailingSlash}${semVer}/${versionInfo.DefaultFile}`,
  };
}
