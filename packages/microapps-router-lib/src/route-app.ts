import { DBManager, Version } from '@pwrdrvr/microapps-datalib';
import { AppVersionCache } from './app-cache';
import { IGetRouteEvent, IGetRouteResult } from './get-route';
import Log from './lib/log';

const log = Log.Instance;

/**
 * Lookup the version of the app to run
 * @param event
 * @param response
 * @param appName
 * @param additionalParts
 * @param log
 * @returns
 */

export async function RouteApp(opts: {
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
      statusCode: 200,
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
