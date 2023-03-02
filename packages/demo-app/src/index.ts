import 'source-map-support/register';
import type * as lambda from 'aws-lambda';
import { readFileSync } from 'fs';

const html = readFileSync(`./index.html`, 'utf8');
const file = readFileSync(`./file.html`, 'utf8');

const buildTrigger = '2023-01-24-01';
console.info('Demo-app build trigger', { buildTrigger });

// eslint-disable-next-line @typescript-eslint/require-await
export async function handler(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  event: lambda.APIGatewayProxyEventV2,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  context?: lambda.Context,
): Promise<unknown> {
  // eslint-disable-next-line no-console
  console.log('event', event);

  if (event.rawPath.endsWith('/serverIncrement')) {
    const currValue = parseInt(event.queryStringParameters?.currValue ?? '0', 10);
    const newValue = currValue + 1;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Powered-By': 'demo-app',
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
        'Content-Type': 'text/html',
        'Powered-By': 'demo-app',
      },
      isBase64Encoded: false,
      body: file,
    };
  }

  if (event.headers?.accept && event.headers.accept.includes('text/html')) {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
        'Powered-By': 'demo-app',
      },
      isBase64Encoded: false,
      body: html,
    };
  }

  return {
    statusCode: 404,
    headers: {
      'Content-Type': 'text/plain',
      'Powered-By': 'demo-app',
    },
    isBase64Encoded: false,
    body: `${new Date().toUTCString()} - default failure`,
  };
}
