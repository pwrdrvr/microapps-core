// Used by ts-convict
import 'source-map-support/register';
import 'reflect-metadata';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
// eslint-disable-next-line import/no-extraneous-dependencies
import Manager, { IVersionsAndRules } from '@pwrdrvr/microapps-datalib';
// eslint-disable-next-line import/no-unresolved
import type * as lambda from 'aws-lambda';
import { pathExistsSync, readFileSync } from 'fs-extra';
import { LambdaLog, LogMessage } from 'lambda-log';
import { Config } from './config/Config';

const localTesting = process.env.DEBUG ? true : false;

const dynamoClient = process.env.TEST
  ? new DynamoDB({ endpoint: 'http://localhost:8000' })
  : new DynamoDB({});
let manager: Manager;

function loadAppFrame(): string {
  const paths = [__dirname, `${__dirname}/..`, `${__dirname}/templates`, '/opt', '/opt/templates'];

  // Change the logger on each request
  const log = new LambdaLog({
    meta: {
      source: 'microapps-router',
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    dynamicMeta: (_message: LogMessage) => {
      return {
        timestamp: new Date().toISOString(),
      };
    },
  });

  for (const path of paths) {
    const fullPath = `${path}/appFrame.html`;
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

const appFrame = loadAppFrame();

export async function handler(
  event: lambda.APIGatewayProxyEventV2,
  context: lambda.Context,
): Promise<lambda.APIGatewayProxyStructuredResultV2> {
  if (manager === undefined) {
    manager = new Manager({ dynamoDB: dynamoClient, tableName: Config.instance.db.tableName });
  }
  const response = {
    statusCode: 200,
    headers: {},
    isBase64Encoded: false,
  } as lambda.APIGatewayProxyStructuredResultV2;

  // Change the logger on each request
  const log = new LambdaLog({
    dev: localTesting,
    //debug: localTesting,
    meta: {
      source: 'microapps-router',
      awsRequestId: context.awsRequestId,
      rawPath: event.rawPath,
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    dynamicMeta: (_message: LogMessage) => {
      return {
        timestamp: new Date().toISOString(),
      };
    },
  });

  try {
    // /someapp will split into length 2 with ["", "someapp"] as results
    // /someapp/somepath will split into length 3 with ["", "someapp", "somepath"] as results
    // /someapp/somepath/ will split into length 3 with ["", "someapp", "somepath", ""] as results
    // /someapp/somepath/somefile.foo will split into length 4 with ["", "someapp", "somepath", "somefile.foo", ""] as results
    const parts = event.rawPath.split('/');

    // TODO: Pass any parts after the appName/Version to the route handler
    let additionalParts = '';
    if (parts.length >= 3 && parts[2] !== '') {
      additionalParts = parts.slice(2).join('/');
    }

    if (parts.length >= 2) {
      // Got at least an application name, try to route it
      await RouteApp(event, response, parts[1], additionalParts, log);
    } else {
      throw new Error('Unmatched route');
    }
  } catch (error) {
    log.error('unexpected exception - returning 599', { statusCode: 599 });
    log.error(error);
    response.statusCode = 599;
    response.headers = {};
    response.headers['Content-Type'] = 'text/plain';
    response.body = `Router - Could not route: ${event.rawPath}, ${error.message}`;
  }

  return response;
}

async function RouteApp(
  request: lambda.APIGatewayProxyEventV2,
  response: lambda.APIGatewayProxyStructuredResultV2,
  appName: string,
  additionalParts: string,
  log: LambdaLog,
) {
  let versionsAndRules: IVersionsAndRules;

  if (response.headers === undefined) {
    throw new Error('do not call me with undefined headers');
  }

  try {
    versionsAndRules = await Manager.GetVersionsAndRules(appName);
  } catch (error) {
    // 2021-03-10 - NOTE: This isn't clean - DocumentClient.get throws if the item is not found
    // It's not easily detectable either.  When the lib is updated we can improve this
    // Assume this means "succeeded but not found for now"
    log.info(`GetVersionsAndRules threw for '${appName}', assuming not found - returning 404`, {
      appName,
      statusCode: 404,
    });
    log.info(error);
    response.statusCode = 404;
    response.headers['Cache-Control'] = 'no-store; private';
    response.headers['Content-Type'] = 'text/plain; charset=UTF-8';
    response.body = `Router - Could not find app: ${request.rawPath}, ${appName}`;
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
    log.error(`could not find app ${appName}, for path ${request.rawPath} - returning 404`, {
      statusCode: 404,
    });
    response.statusCode = 404;
    response.headers['Cache-Control'] = 'no-store; private';
    response.headers['Content-Type'] = 'text/plain; charset=UTF-8';
    response.body = `Router - Could not find app: ${request.rawPath}, ${appName}`;
    return;
  }

  // TODO: Yeah, this is lame - We should save these in a dictionary keyed by SemVer
  const defaultVersionInfo = versionsAndRules.Versions.find(
    (item) => item.SemVer === defaultVersion,
  );

  // Prepare the iframe contents
  // var semVerUnderscores = defaultVersion.Replace('.', '_');
  let appVersionPath: string;
  if (
    defaultVersionInfo?.DefaultFile === undefined ||
    defaultVersionInfo?.DefaultFile === '' ||
    additionalParts !== ''
  ) {
    // KLUDGE: We're going to take a missing default file to mean that the
    // app type is Next.js (or similar) and that it wants no trailing slash after the version
    // TODO: Move this to an attribute of the version
    appVersionPath = `/${appName}/${defaultVersion}`;
    if (additionalParts !== '') {
      appVersionPath += `/${additionalParts}`;
    }
  } else {
    // Linking to the file directly means this will be peeled off by the S3 route
    // That means we won't have to proxy this from S3
    appVersionPath = `/${appName}/${defaultVersion}/${defaultVersionInfo.DefaultFile}`;
  }

  //
  // Create the versionless host page
  //
  const frameHTML = appFrame.replace('{{iframeSrc}}', appVersionPath);

  response.headers['Cache-Control'] = 'no-store; private';
  response.headers['Content-Type'] = 'text/html; charset=UTF-8';

  response.statusCode = 200;
  response.body = frameHTML;

  log.info(`found app ${appName}, for path ${request.rawPath} - returning 200`, {
    statusCode: 200,
    routedPath: appVersionPath,
  });
}

// Run the function locally for testing
if (localTesting) {
  const payload = JSON.parse(readFileSync('../../test/json/router-release-app.json', 'utf-8'));
  void Promise.all([
    handler(
      payload as lambda.APIGatewayProxyEventV2,
      { awsRequestId: 'local-testing' } as lambda.Context,
    ),
  ]);
}
