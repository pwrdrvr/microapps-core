import Manager from '@pwrdrvr/microapps-datalib';
import * as lambda from 'aws-lambda';
import fs from 'fs';

const localTesting = process.env.DEBUG ? true : false;

const manager = new Manager();

const appFrame = fs.readFileSync(`${__dirname}/appFrame.html`, 'utf-8');

export async function handler(
  event: lambda.APIGatewayProxyEventV2,
  _context: lambda.Context,
): Promise<lambda.APIGatewayProxyStructuredResultV2> {
  const response = {
    statusCode: 200,
    headers: {},
    isBase64Encoded: false,
  } as lambda.APIGatewayProxyStructuredResultV2;

  try {
    // /someapp will split into length 2 with ["", "someapp"] as results
    const parts = event.rawPath.split('/');

    // TODO: Pass any parts after the appName/Version to the route handler
    let additionalParts: string;
    if (parts.length >= 4 && parts[3] !== '') {
      additionalParts = parts.slice(3).join('/');
    }

    if (parts.length == 2 || (parts.length == 3 && parts[2] === '')) {
      // This is an application name only
      await Get(event, response, parts[1]);
    } else {
      throw new Error('Unmatched route');
    }
  } catch (error) {
    response.statusCode = 599;
    response.headers = {};
    response.headers['Content-Type'] = 'text/plain';
    response.body = `Router - Could not route: ${event.rawPath}, ${error.message}`;
  }

  return response;
}

async function Get(
  request: lambda.APIGatewayProxyEventV2,
  response: lambda.APIGatewayProxyStructuredResultV2,
  appName: string,
) {
  const versionsAndRules = await manager.GetVersionsAndRules(appName);

  if (response.headers === undefined) {
    throw new Error('do not call me with undefined headers');
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

  const defaultVersion = versionsAndRules.Rules?.RuleSet['default']?.SemVer;

  if (defaultVersion == null) {
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
  if (defaultVersionInfo?.DefaultFile === undefined || defaultVersionInfo?.DefaultFile === '') {
    // KLUDGE: We're going to take a missing default file to mean that the
    // app type is Next.js (or similar) and that it wants no trailing slash after the version
    // TODO: Move this to an attribute of the version
    appVersionPath = `/${appName}/${defaultVersion}`;
  } else {
    // Linking to the file directly means this will be peeled off by the S3 route
    // That means we won't have to proxy this from S3
    appVersionPath = `/${appName}/${defaultVersion}/${defaultVersionInfo.DefaultFile}`;
  }

  //
  // Create the versionless host page
  //
  const frameHTML = appFrame.replace('{iframeSrc}', appVersionPath);

  response.headers['Cache-Control'] = 'no-store; private';
  response.headers['Content-Type'] = 'text/html; charset=UTF-8';

  response.statusCode = 200;
  response.body = frameHTML;
}

// Run the function locally for testing
if (localTesting) {
  const payload = JSON.parse(fs.readFileSync('../../test/json/router-release-app.json', 'utf-8'));
  Promise.all([
    handler(
      payload as lambda.APIGatewayProxyEventV2,
      { awsRequestId: 'local-testing' } as lambda.Context,
    ),
  ]);
}
