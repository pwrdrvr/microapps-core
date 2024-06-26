// Used by ts-convict
import 'source-map-support/register';
import 'reflect-metadata';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Application, DBManager, IVersionsAndRules, Version } from '@pwrdrvr/microapps-datalib';
import { loadAppFrame, normalizePathPrefix } from '@pwrdrvr/microapps-router-lib';
import type * as lambda from 'aws-lambda';
import { Config } from './config/Config';
import Log from './lib/log';

const log = Log.Instance;

let dbManager: DBManager;
let dynamoClient = new DynamoDBClient({
  maxAttempts: 8,
});

export function overrideDBManager(opts: {
  dbManager: DBManager;
  dynamoClient: DynamoDBClient;
}): void {
  dbManager = opts.dbManager;
  dynamoClient = opts.dynamoClient;
}
dbManager = new DBManager({ dynamoClient, tableName: Config.instance.db.tableName });

const appFrame = loadAppFrame({ basePath: __dirname });
const normalizedPathPrefix = normalizePathPrefix(Config.instance.rootPathPrefix);

/**
 * Exported Lambda Handler
 * @param event
 * @param context
 * @returns
 */
export async function handler(
  event: lambda.APIGatewayProxyEventV2,
  context: lambda.Context,
): Promise<lambda.APIGatewayProxyStructuredResultV2> {
  // Set meta on each request
  log.options.meta = {
    source: 'microapps-router',
    awsRequestId: context.awsRequestId,
    rawPath: event.rawPath,
  };

  log.info('received request', { event });

  if (dbManager === undefined) {
    dbManager = new DBManager({ dynamoClient, tableName: Config.instance.db.tableName });
  }
  const response = {
    statusCode: 200,
    headers: {},
    isBase64Encoded: false,
  } as lambda.APIGatewayProxyStructuredResultV2;

  try {
    if (normalizedPathPrefix !== '' && !event.rawPath.startsWith(normalizedPathPrefix)) {
      // The prefix is required if configured, if missing we cannot serve this app
      response.statusCode = 404;
      return response;
    }

    const pathAfterPrefix =
      normalizedPathPrefix !== '' && event.rawPath.startsWith(normalizedPathPrefix)
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
      if (await RedirectToDefaultFile({ response, appName: parts[1], semVer: parts[2] })) {
        return response;
      }
    }

    // Remember the first element is '' (nothing to the left of /)
    if (parts.length >= 2) {
      //  / appName (/ something)?
      // ^  ^^^^^^^    ^^^^^^^^^
      // 0        1            2
      // Got at least an application name, try to route it
      await RouteApp({ event, response, appName: parts[1], additionalParts });
    } else {
      throw new Error('Unmatched route');
    }
  } catch (error) {
    log.error('unexpected exception - returning 599', { statusCode: 599, error });
    response.statusCode = 599;
    response.headers = {};
    response.headers['Content-Type'] = 'text/plain';
    if (error instanceof Error) {
      response.body = `Router - Could not route: ${event.rawPath}, ${error.message}`;
    } else if (typeof error === 'string') {
      response.body = `Router - Could not route: ${event.rawPath}, ${error}`;
    } else {
      response.body = `Router - Could not route: ${event.rawPath}, unknown error`;
    }
  }

  return response;
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
  event: lambda.APIGatewayProxyEventV2;
  response: lambda.APIGatewayProxyStructuredResultV2;
  appName: string;
  additionalParts: string;
}) {
  const { event, response, appName, additionalParts } = opts;
  let versionsAndRules: IVersionsAndRules;

  if (response.headers === undefined) {
    throw new Error('do not call me with undefined headers');
  }

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
    response.statusCode = 404;
    response.headers['Cache-Control'] = 'private';
    response.headers['Content-Type'] = 'text/plain; charset=UTF-8';
    response.body = `Router - Could not find app: ${event.rawPath}, ${appName}`;
    return;
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
    response.statusCode = 404;
    response.headers['Cache-Control'] = 'private';
    response.headers['Content-Type'] = 'text/plain; charset=UTF-8';
    response.body = `Router - Could not find app: ${event.rawPath}, ${appName}`;
    return;
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

  //
  // Create the versionless host page
  //
  const frameHTML = appFrame.replace('{{iframeSrc}}', appVersionPath);

  response.headers['Cache-Control'] = 'private';
  response.headers['Content-Type'] = 'text/html; charset=UTF-8';

  response.statusCode = 200;
  response.body = frameHTML;

  log.info(`found app ${appName}, for path ${event.rawPath} - returning 200`, {
    statusCode: 200,
    routedPath: appVersionPath,
  });
}

/**
 * Redirect the request to app/x.y.z/? to app/x.y.z/{defaultFile}
 * @param request
 * @param response
 * @param appName
 * @param semVer
 * @param log
 * @returns
 */
async function RedirectToDefaultFile(opts: {
  response: lambda.APIGatewayProxyStructuredResultV2;
  appName: string;
  semVer: string;
}): Promise<boolean> {
  const { response, appName, semVer } = opts;
  let versionInfo: Version;

  if (response.headers === undefined) {
    throw new Error('do not call me with undefined headers');
  }

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
    return false;
  }

  if (versionInfo === undefined) {
    log.info(
      `LoadVersion returned undefined for '${normalizedPathPrefix}/${appName}/${semVer}', assuming not found - falling through to app routing'`,
      {
        appName,
        semVer,
      },
    );
    return false;
  }

  if (!versionInfo.DefaultFile) {
    return false;
  }

  response.statusCode = 302;
  response.headers['Cache-Control'] = 'private';
  response.headers[
    'Location'
  ] = `${normalizedPathPrefix}/${appName}/${semVer}/${versionInfo.DefaultFile}`;

  log.info(
    `found '${normalizedPathPrefix}/${appName}/${semVer}' - returning 302 to ${normalizedPathPrefix}/${appName}/${semVer}/${versionInfo.DefaultFile}`,
    {
      statusCode: 302,
      routedPath: `${normalizedPathPrefix}/${appName}/${semVer}/${versionInfo.DefaultFile}`,
    },
  );

  return true;
}
