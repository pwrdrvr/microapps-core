import Log from './lib/log';
import { GetAppInfo } from './get-app-info';
import { RouteApp } from './route-app';
import { RedirectToDefaultFile } from './redirect-default-file';
import { DBManager } from '@pwrdrvr/microapps-datalib';

const log = Log.Instance;

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
   * List of locale prefixes after the normalizedPathPrefix
   *
   * @default []
   */
  readonly locales?: string[];

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
  const { dbManager, normalizedPathPrefix = '', queryStringParameters, locales = [] } = event;

  try {
    if (!!normalizedPathPrefix && !event.rawPath.startsWith(normalizedPathPrefix)) {
      // The prefix is required if configured, if missing we cannot serve this app
      return { statusCode: 404, errorMessage: 'Request not routable' };
    }

    const pathAfterPrefix =
      normalizedPathPrefix && event.rawPath.startsWith(normalizedPathPrefix)
        ? event.rawPath.slice(normalizedPathPrefix.length - 1)
        : event.rawPath;

    const pathAfterPrefixAndLocale = locales.reduce((path, locale) => {
      if (path.startsWith(`/${locale}/`)) {
        return path.slice(locale.length + 1);
      }
      return path;
    }, pathAfterPrefix);

    // /someapp will split into length 2 with ["", "someapp"] as results
    // /someapp/somepath will split into length 3 with ["", "someapp", "somepath"] as results
    // /someapp/somepath/ will split into length 3 with ["", "someapp", "somepath", ""] as results
    // /someapp/somepath/somefile.foo will split into length 4 with ["", "someapp", "somepath", "somefile.foo", ""] as results
    const partsAfterPrefixAndLocale = pathAfterPrefixAndLocale.split('/');

    // Handle ${prefix}/_next/data/${semver}[/${locale}]/${appname}/route
    let appName: string | undefined;
    if (
      partsAfterPrefixAndLocale.length >= 4 &&
      partsAfterPrefixAndLocale[1] === '_next' &&
      partsAfterPrefixAndLocale[2] === 'data'
    ) {
      // Remove locale if present after SemVer
      const localeIsPresent =
        partsAfterPrefixAndLocale.length >= 5 &&
        locales.some((locale) => partsAfterPrefixAndLocale[4] === locale);
      const possibleAppNamePart = localeIsPresent
        ? partsAfterPrefixAndLocale[5]
        : partsAfterPrefixAndLocale[4];

      // if partsAfterPrefix[4] has .json suffix, strip it
      const possibleAppName = possibleAppNamePart.endsWith('.json')
        ? possibleAppNamePart.slice(0, possibleAppNamePart.length - 5)
        : possibleAppNamePart;

      appName = await GetAppInfo({
        dbManager,
        appName: possibleAppName,
      });
    }

    if (!appName) {
      appName = await GetAppInfo({
        dbManager,
        appName: partsAfterPrefixAndLocale.length >= 2 ? partsAfterPrefixAndLocale[1] : '[root]',
      });
    }

    if (!appName) {
      return { statusCode: 404, errorMessage: 'App not found' };
    }

    const isRootApp = appName === '[root]';
    const appNameOrRootTrailingSlash = isRootApp ? '' : `${appName}/`;

    // Strip the appName from the start of the path, if there was one
    const pathAfterAppName = isRootApp
      ? pathAfterPrefixAndLocale
      : pathAfterPrefixAndLocale.slice(appName.length + 1);
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
    // Get the version afer `/_next/data/` from partsAfterPrefix
    const possibleSemVerPathNextDataBasePath =
      partsAfterAppName.length >= 4 ? partsAfterAppName[3] : '';
    const possibleSemVerPathNextData =
      partsAfterPrefixAndLocale.length >= 4 &&
      partsAfterPrefixAndLocale[1] === '_next' &&
      partsAfterPrefixAndLocale[2] == 'data'
        ? partsAfterPrefixAndLocale[3]
        : possibleSemVerPathNextDataBasePath;

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
