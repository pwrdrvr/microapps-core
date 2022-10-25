// Used by ts-convict
import 'source-map-support/register';
import path from 'path';
import { pathExistsSync, readFileSync } from 'fs-extra';
import { Application, DBManager, IVersionsAndRules, Version } from '@pwrdrvr/microapps-datalib';
import Log from './lib/log';

const log = Log.Instance;

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
  const { dbManager, normalizedPathPrefix = '' } = event;

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
    const parts = pathAfterPrefix.split('/');

    // Pass any parts after the appName/Version to the route handler
    let additionalParts = '';
    if (parts.length >= 3 && parts[2] !== '') {
      additionalParts = parts.slice(2).join('/');
    }

    // Route an app and version (only) to include the defaultFile
    // If the second part is not a version that exists, fall through to
    // routing the app and glomming the rest of the path on to the end
    if (parts.length === 3 || parts.length === 4) {
      //   / appName / semVer /
      // ^   ^^^^^^^   ^^^^^^   ^
      // 0         1        2   3
      // This is an app and a version only
      // If the request got here it's likely a static app that has no
      // Lambda function (thus the API Gateway route fell through to the Router)
      const response = await RedirectToDefaultFile({
        dbManager,
        appName: parts[1],
        normalizedPathPrefix,
        semVer: parts[2],
      });
      if (response) {
        return response;
      }
    }

    // Remember the first element is '' (nothing to the left of /)
    if (parts.length >= 2) {
      //  / appName (/ something)?
      // ^  ^^^^^^^    ^^^^^^^^^
      // 0        1            2
      // Got at least an application name, try to route it
      const response = await RouteApp({
        dbManager,
        normalizedPathPrefix,
        event,
        appName: parts[1],
        additionalParts,
      });
      if (response) {
        return response;
      }
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
  additionalParts: string;
  normalizedPathPrefix?: string;
}): Promise<IGetRouteResult> {
  const { dbManager, event, normalizedPathPrefix = '', appName, additionalParts } = opts;
  let versionsAndRules: IVersionsAndRules;

  try {
    versionsAndRules = await Application.GetVersionsAndRules({
      dbManager,
      key: { AppName: appName },
    });
  } catch (error) {
    // 2021-03-10 - NOTE: This isn't clean - DocumentClient.get throws if the item is not found
    // It's not easily detectable either.  When the lib is updated we can improve this
    // Assume this means "succeeded but not found for now"
    log.info(`GetVersionsAndRules threw for '${appName}', assuming not found - returning 404`, {
      appName,
      statusCode: 404,
      error,
    });

    return {
      statusCode: 404,
      errorMessage: `Router - Could not find app: ${event.rawPath}, ${appName}`,
    };
  }

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

  const defaultVersion = versionsAndRules.Rules?.RuleSet.default?.SemVer;

  if (defaultVersion == null) {
    log.error(`could not find app ${appName}, for path ${event.rawPath} - returning 404`, {
      statusCode: 404,
    });

    return {
      statusCode: 404,
      errorMessage: `Router - Could not find app: ${event.rawPath}, ${appName}`,
    };
  }

  // TODO: Yeah, this is lame - We should save these in a dictionary keyed by SemVer
  const defaultVersionInfo = versionsAndRules.Versions.find(
    (item) => item.SemVer === defaultVersion,
  );

  // Prepare the iframe contents
  let appVersionPath: string;
  if (
    defaultVersionInfo?.Type !== 'static' &&
    (defaultVersionInfo?.DefaultFile === undefined ||
      defaultVersionInfo?.DefaultFile === '' ||
      additionalParts !== '')
  ) {
    // KLUDGE: We're going to take a missing default file to mean that the
    // app type is Next.js (or similar) and that it wants no trailing slash after the version
    // TODO: Move this to an attribute of the version
    appVersionPath = `${normalizedPathPrefix}/${appName}/${defaultVersion}`;
    if (additionalParts !== '') {
      appVersionPath += `/${additionalParts}`;
    }
  } else {
    // Linking to the file directly means this will be peeled off by the S3 route
    // That means we won't have to proxy this from S3
    appVersionPath = `${normalizedPathPrefix}/${appName}/${defaultVersion}/${defaultVersionInfo.DefaultFile}`;
  }

  return {
    statusCode: 200,
    appName,
    semVer: defaultVersion,
    ...(defaultVersionInfo?.URL ? { url: defaultVersionInfo?.URL } : {}),
    ...(defaultVersionInfo?.Type
      ? { type: defaultVersionInfo?.Type === 'lambda' ? 'apigwy' : defaultVersionInfo?.Type }
      : {}),
    iFrameAppVersionPath: appVersionPath,
  };
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
}): Promise<IGetRouteResult | undefined> {
  const { dbManager, normalizedPathPrefix = '', appName, semVer } = opts;
  let versionInfo: Version;

  try {
    versionInfo = await Version.LoadVersion({
      dbManager,
      key: { AppName: appName, SemVer: semVer },
    });
  } catch (error) {
    log.info(
      `LoadVersion threw for '${normalizedPathPrefix}/${appName}/${semVer}' - falling through to app routing'`,
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
      `LoadVersion returned undefined for '${normalizedPathPrefix}/${appName}/${semVer}', assuming not found - falling through to app routing'`,
      {
        appName,
        semVer,
      },
    );
    return undefined;
  }

  log.info(
    `found '${normalizedPathPrefix}/${appName}/${semVer}' - returning 302 to ${normalizedPathPrefix}/${appName}/${semVer}/${versionInfo.DefaultFile}`,
    {
      statusCode: 302,
      routedPath: `${normalizedPathPrefix}/${appName}/${semVer}/${versionInfo.DefaultFile}`,
    },
  );

  return {
    statusCode: 302,
    redirectLocation: `${normalizedPathPrefix}/${appName}/${semVer}/${versionInfo.DefaultFile}`,
  };
}
