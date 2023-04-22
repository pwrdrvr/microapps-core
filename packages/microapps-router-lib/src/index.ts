import 'source-map-support/register';
import path from 'path';
import { pathExistsSync, readFileSync } from 'fs-extra';
import { DBManager, Rules, Version } from '@pwrdrvr/microapps-datalib';
import Log from './lib/log';
import { AppVersionCache } from './app-cache';

const log = Log.Instance;

export { AppVersionCache };

/**
 * Find and load the appFrame file
 * @returns
 */
export function loadAppFrame({ basePath = '.' }: { basePath?: string }): string {
  const paths = [
    basePath,
    path.join(basePath, '..'),
    path.join(basePath, 'templates'),
    basePath,
    '/opt',
    '/opt/templates',
  ];

  for (const pathRoot of paths) {
    const fullPath = path.join(pathRoot, 'appFrame.html');
    try {
      if (pathExistsSync(fullPath)) {
        log.info('found html file', { fullPath });
        return readFileSync(fullPath, 'utf-8');
      }
    } catch {
      // Don't care - we get here if stat throws because the file does not exist
    }
  }

  log.error('appFrame.html not found');
  throw new Error('appFrame.html not found');
}

/**
 * Ensure that the path starts with a / and does not end with a /
 *
 * @param pathPrefix
 * @returns
 */
export function normalizePathPrefix(pathPrefix: string): string {
  let normalizedPathPrefix = pathPrefix;
  if (normalizedPathPrefix !== '' && !normalizedPathPrefix.startsWith('/')) {
    normalizedPathPrefix = '/' + pathPrefix;
  }
  if (normalizedPathPrefix.endsWith('/')) {
    normalizedPathPrefix.substring(0, normalizedPathPrefix.length - 1);
  }

  return normalizedPathPrefix;
}

export interface IGetRouteResult {
  /**
   * HTTP status code for immediate response, immediate redirect, and errors
   */
  readonly statusCode?: number;

  /**
   * Error message for errors
   */
  readonly errorMessage?: string;

  /**
   * Location to redirect to
   */
  readonly redirectLocation?: string;

  /**
   * Optional headers for immediate response, immediate redirect, and errors
   */
  readonly headers?: Record<string, string>;

  /**
   *
   *
   * @example /myapp/1.0.0/index.html
   * @example /myapp/1.0.1
   * @example /myapp/1.0.2/some/path?query=string
   */
  readonly iFrameAppVersionPath?: string;

  /**
   * Name of the app if resolved
   */
  readonly appName?: string;

  /**
   * Version of the app if resolved
   */
  readonly semVer?: string;

  /**
   * Type of the app
   */
  readonly type?: 'apigwy' | 'lambda-url' | 'url' | 'static';

  /**
   * Startup type of the app (indirect with iframe or direct)
   */
  readonly startupType?: 'iframe' | 'direct';

  /**
   * URL to the app if resolved
   */
  readonly url?: string;
}

export interface IGetRouteEvent {
  readonly dbManager: DBManager;

  /**
   * rawPath from the Lambda event
   */
  readonly rawPath: string;

  /**
   * Configured prefix of the deployment, must start with a / and not end with a /
   */
  readonly normalizedPathPrefix?: string;

  /**
   * Query string params, if any
   * Checked for `appver=1.2.3` to override the app version
   */
  readonly queryStringParameters?: URLSearchParams;
}

/**
 * Get information about immediate redirect, immediate response,
 * or which host to route the request to.
 *
 * @param event
 *
 * @returns IGetRouteResult
 */
export async function GetRoute(event: IGetRouteEvent): Promise<IGetRouteResult> {
  const { dbManager, normalizedPathPrefix = '', queryStringParameters } = event;

  try {
    if (normalizedPathPrefix && !event.rawPath.startsWith(normalizedPathPrefix)) {
      // The prefix is required if configured, if missing we cannot serve this app
      return { statusCode: 404, errorMessage: 'Request not routable' };
    }

    const pathAfterPrefix =
      normalizedPathPrefix && event.rawPath.startsWith(normalizedPathPrefix)
        ? event.rawPath.slice(normalizedPathPrefix.length - 1)
        : event.rawPath;

    // /someapp will split into length 2 with ["", "someapp"] as results
    // /someapp/somepath will split into length 3 with ["", "someapp", "somepath"] as results
    // /someapp/somepath/ will split into length 3 with ["", "someapp", "somepath", ""] as results
    // /someapp/somepath/somefile.foo will split into length 4 with ["", "someapp", "somepath", "somefile.foo", ""] as results
    const partsAfterPrefix = pathAfterPrefix.split('/');

    // Handle ${prefix}/_next/data/${semver}/${appname}/route
    let appName: string | undefined;
    if (
      partsAfterPrefix.length >= 4 &&
      partsAfterPrefix[1] === '_next' &&
      partsAfterPrefix[2] === 'data'
    ) {
      appName = await GetAppInfo({
        dbManager,
        appName: partsAfterPrefix[4],
      });
    }

    if (!appName) {
      appName = await GetAppInfo({
        dbManager,
        appName: partsAfterPrefix.length >= 2 ? partsAfterPrefix[1] : '[root]',
      });
    }

    if (!appName) {
      return { statusCode: 404, errorMessage: 'App not found' };
    }

    const isRootApp = appName === '[root]';
    const appNameOrRootTrailingSlash = isRootApp ? '' : `${appName}/`;

    // Strip the appName from the start of the path, if there was one
    const pathAfterAppName = isRootApp
      ? pathAfterPrefix
      : pathAfterPrefix.slice(appName.length + 1);
    const partsAfterAppName = pathAfterAppName.split('/');

    // Pass any parts after the appName/Version to the route handler
    let additionalParts = '';
    if (partsAfterAppName.length >= 2 && partsAfterAppName[1] !== '') {
      additionalParts = partsAfterAppName.slice(1).join('/');
    }

    // Route an app and version (only) to include the defaultFile
    // If the second part is not a version that exists, fall through to
    // routing the app and glomming the rest of the path on to the end
    if (
      partsAfterAppName.length === 2 ||
      (partsAfterAppName.length === 3 && !partsAfterAppName[2])
    ) {
      //   / semVer /
      // ^   ^^^^^^   ^
      // 0        1   2
      // This is an app and a version only
      // If the request got here it's likely a static app that has no
      // Lambda function (thus the API Gateway route fell through to the Router)
      const response = await RedirectToDefaultFile({
        dbManager,
        appName,
        normalizedPathPrefix,
        semVer: partsAfterAppName[1],
        appNameOrRootTrailingSlash,
      });
      if (response) {
        return response;
      }
    }

    // Check for a version in the path
    // Examples
    //  / semVer / somepath
    //  / _next / data / semVer / somepath
    const possibleSemVerPathNextData = partsAfterAppName.length >= 4 ? partsAfterAppName[3] : '';
    const possibleSemVerPathAfterApp = partsAfterAppName.length >= 2 ? partsAfterAppName[1] : '';

    //  (/ something)?
    // ^  ^^^^^^^^^^^^
    // 0             1
    // Got at least an application name, try to route it
    const response = await RouteApp({
      dbManager,
      normalizedPathPrefix,
      event,
      appName,
      possibleSemVerPathNextData,
      possibleSemVerPathAfterApp,
      possibleSemVerQuery: queryStringParameters?.get('appver') || '',
      additionalParts,
      appNameOrRootTrailingSlash,
    });
    if (response) {
      return response;
    }

    return {
      statusCode: 599,
      errorMessage: `Router - Could not route: ${event.rawPath}, no matching route`,
    };
  } catch (error: any) {
    log.error('unexpected exception - returning 599', { statusCode: 599, error });
    return {
      statusCode: 599,
      errorMessage: `Router - Could not route: ${event.rawPath}, ${error.message}`,
    };
  }
}

/**
 * Determine if we have an appname or a catch all app
 */
export async function GetAppInfo(opts: {
  dbManager: DBManager;
  appName: string;
}): Promise<string | undefined> {
  const { dbManager, appName } = opts;

  let rules: Rules | undefined;

  const appVersionCache = AppVersionCache.GetInstance({ dbManager });

  // Check if we got a matching app name
  rules = await appVersionCache.GetRules({ key: { AppName: appName } });
  if (rules && rules.AppName === appName.toLowerCase()) {
    return appName;
  }

  // Check if we have a `[root]` app that is a catch all
  rules = await appVersionCache.GetRules({ key: { AppName: '[root]' } });
  if (rules && rules.AppName === '[root]') {
    return '[root]';
  }

  return undefined;
}

/**
 * Lookup the version of the app to run
 * @param event
 * @param response
 * @param appName
 * @param additionalParts
 * @param log
 * @returns
 */
async function RouteApp(opts: {
  dbManager: DBManager;
  event: IGetRouteEvent;
  appName: string;
  possibleSemVerPathNextData?: string;
  possibleSemVerPathAfterApp?: string;
  possibleSemVerQuery?: string;
  additionalParts: string;
  normalizedPathPrefix?: string;
  appNameOrRootTrailingSlash: string;
}): Promise<IGetRouteResult> {
  const {
    dbManager,
    event,
    normalizedPathPrefix = '',
    appName,
    possibleSemVerPathNextData,
    possibleSemVerPathAfterApp,
    possibleSemVerQuery,
    additionalParts,
    appNameOrRootTrailingSlash,
  } = opts;

  let versionInfoToUse: Version | undefined;

  const appVersionCache = AppVersionCache.GetInstance({ dbManager });

  // Check if the semver placeholder is actually a defined version
  const possibleSemVerPathAfterAppVersionInfo = possibleSemVerPathAfterApp
    ? await appVersionCache.GetVersionInfo({
        key: { AppName: appName, SemVer: possibleSemVerPathAfterApp },
      })
    : undefined;
  const possibleSemVerPathNextDataVersionInfo = possibleSemVerPathNextData
    ? await appVersionCache.GetVersionInfo({
        key: { AppName: appName, SemVer: possibleSemVerPathNextData },
      })
    : undefined;
  const possibleSemVerQueryVersionInfo = possibleSemVerQuery
    ? await appVersionCache.GetVersionInfo({
        key: { AppName: appName, SemVer: possibleSemVerQuery },
      })
    : undefined;

  // If there is a version in the path, use it
  const possibleSemVerPathVersionInfo =
    possibleSemVerPathAfterAppVersionInfo || possibleSemVerPathNextDataVersionInfo;
  if (possibleSemVerPathVersionInfo) {
    // This is a version, and it's in the path already, route the request to it
    // without creating iframe
    return {
      appName,
      semVer: possibleSemVerPathVersionInfo.SemVer,
      ...(possibleSemVerPathVersionInfo?.URL ? { url: possibleSemVerPathVersionInfo?.URL } : {}),
      ...(possibleSemVerPathVersionInfo?.Type
        ? {
            type:
              possibleSemVerPathVersionInfo?.Type === 'lambda'
                ? 'apigwy'
                : possibleSemVerPathVersionInfo?.Type,
          }
        : {}),
    };
  } else if (possibleSemVerQueryVersionInfo) {
    // We got a version for the query string, but it's not in the path,
    // so fall back to normal routing (create an iframe or direct route)
    versionInfoToUse = possibleSemVerQueryVersionInfo;
  } else if (possibleSemVerQuery) {
    // We got a version in the query string but it does not exist
    // This needs to 404 as this is a very specific request for a specific version
    log.error(`could not find app ${appName}, for path ${event.rawPath} - returning 404`, {
      statusCode: 404,
    });

    return {
      statusCode: 404,
      errorMessage: `Router - Could not find app: ${event.rawPath}, ${appName}`,
    };
  } else {
    //
    // TODO: Get the incoming attributes of user
    // For logged in users, these can be: department, product type,
    //  employee, office, division, etc.
    // For anonymous users this can be: geo region, language,
    // browser, IP, CIDR, ASIN, etc.
    //
    // The Rules can be either a version or a distribution of versions,
    // including default, for example:
    //     80% to 1.1.0, 20% to default (1.0.3)
    //

    const rules = await appVersionCache.GetRules({ key: { AppName: appName } });
    const defaultVersion = rules?.RuleSet.default?.SemVer;

    if (defaultVersion == null) {
      log.error(`could not find app ${appName}, for path ${event.rawPath} - returning 404`, {
        statusCode: 404,
      });

      return {
        statusCode: 404,
        errorMessage: `Router - Could not find app: ${event.rawPath}, ${appName}`,
      };
    }

    const defaultVersionInfo = await appVersionCache.GetVersionInfo({
      key: { AppName: appName, SemVer: defaultVersion },
    });

    versionInfoToUse = defaultVersionInfo;
  }

  if (!versionInfoToUse) {
    log.error(
      `could not find version info for app ${appName}, for path ${event.rawPath} - returning 404`,
      {
        statusCode: 404,
      },
    );

    return {
      statusCode: 404,
      errorMessage: `Router - Could not find version info for app: ${event.rawPath}, ${appName}`,
    };
  }

  if (versionInfoToUse?.StartupType === 'iframe' || !versionInfoToUse?.StartupType) {
    // Prepare the iframe contents
    let appVersionPath: string;
    if (
      versionInfoToUse?.Type !== 'static' &&
      (versionInfoToUse?.DefaultFile === undefined ||
        versionInfoToUse?.DefaultFile === '' ||
        additionalParts !== '')
    ) {
      // KLUDGE: We're going to take a missing default file to mean that the
      // app type is Next.js (or similar) and that it wants no trailing slash after the version
      // TODO: Move this to an attribute of the version
      appVersionPath = `${normalizedPathPrefix}/${appNameOrRootTrailingSlash}${versionInfoToUse.SemVer}`;
      if (additionalParts !== '') {
        appVersionPath += `/${additionalParts}`;
      }
    } else {
      // Linking to the file directly means this will be peeled off by the S3 route
      // That means we won't have to proxy this from S3
      appVersionPath = `${normalizedPathPrefix}/${appNameOrRootTrailingSlash}${versionInfoToUse.SemVer}/${versionInfoToUse.DefaultFile}`;
    }

    return {
      statusCode: 200,
      appName,
      semVer: versionInfoToUse.SemVer,
      startupType: 'iframe',
      ...(versionInfoToUse?.URL ? { url: versionInfoToUse?.URL } : {}),
      ...(versionInfoToUse?.Type
        ? { type: versionInfoToUse?.Type === 'lambda' ? 'apigwy' : versionInfoToUse?.Type }
        : {}),
      iFrameAppVersionPath: appVersionPath,
    };
  } else {
    // This is a direct app version, no iframe needed

    if (versionInfoToUse?.Type === 'lambda') {
      throw new Error('Invalid type for direct app version');
    }
    if (['apigwy', 'static'].includes(versionInfoToUse?.Type || '')) {
      throw new Error('Invalid type for direct app version');
    }

    return {
      statusCode: 200,
      appName,
      semVer: versionInfoToUse.SemVer,
      startupType: 'direct',
      ...(versionInfoToUse?.URL ? { url: versionInfoToUse?.URL } : {}),
      ...(versionInfoToUse?.Type ? { type: versionInfoToUse?.Type } : {}),
    };
  }
}

/**
 * Redirect the request to app/x.y.z/? to app/x.y.z/{defaultFile}
 * @param response
 * @param normalizedPathPrefix
 * @param appName
 * @param semVer
 * @returns
 */
async function RedirectToDefaultFile(opts: {
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
