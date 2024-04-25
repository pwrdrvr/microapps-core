import 'source-map-support/register';
import type * as lambda from 'aws-lambda';
import { readFileSync } from 'fs';

const html = readFileSync(`./index.html`, 'utf8');
const file = readFileSync(`./file.html`, 'utf8');

// eslint-disable-next-line @typescript-eslint/require-await
export async function handler(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  event: lambda.APIGatewayProxyEventV2,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  context?: lambda.Context,
): Promise<unknown> {
  // eslint-disable-next-line no-console
  console.log('event', event);

  const standardHeaders = {
    'Powered-By': 'demo-app',
    'X-MicroApps-AppName': event.headers['x-microapps-appname'] ?? 'unknown',
    'X-MicroApps-SemVer': event.headers['x-microapps-semver'] ?? 'unknown',
  };

  if (event.rawPath.endsWith('/serverIncrement')) {
    const currValue = parseInt(event.queryStringParameters?.currValue ?? '0', 10);
    const newValue = currValue + 1;

    return {
      statusCode: 200,
      headers: {
        ...standardHeaders,
        'Content-Type': 'application/json',
      },
      isBase64Encoded: false,
      body: {
        newValue,
        source: 'demo-app',
        timestamp: `${new Date().toUTCString()}`,
      },
    };
  }

  // Route for testing files served by the app
  if (event.rawPath.endsWith('/file.html')) {
    return {
      statusCode: 200,
      headers: {
        ...standardHeaders,
        'Content-Type': 'text/html',
      },
      isBase64Encoded: false,
      body: file,
    };
  }

  // Route for testing files served by the app
  if (event.rawPath.endsWith('/notfound.html')) {
    return {
      statusCode: 404,
      headers: {
        ...standardHeaders,
      },
      isBase64Encoded: false,
    };
  }

  if (event.headers?.accept && event.headers.accept.includes('text/html')) {
    return {
      statusCode: 200,
      headers: {
        ...standardHeaders,
        'Content-Type': 'text/html',
      },
      isBase64Encoded: false,
      body: html,
    };
  }

  return {
    statusCode: 404,
    headers: {
      ...standardHeaders,
      'Content-Type': 'text/plain',
    },
    isBase64Encoded: false,
    body: `${new Date().toUTCString()} - default failure`,
  };
}
