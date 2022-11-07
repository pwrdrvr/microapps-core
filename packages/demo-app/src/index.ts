import 'source-map-support/register';
import type * as lambda from 'aws-lambda';
import { readFileSync } from 'fs';

const html = readFileSync(`./index.html`, 'utf8');

// eslint-disable-next-line @typescript-eslint/require-await
export async function handler(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  event: lambda.APIGatewayProxyEventV2,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  context?: lambda.Context,
): Promise<unknown> {
  if (event.rawPath.endsWith('/serverIncrement')) {
    const currValue = parseInt(event.queryStringParameters?.currValue ?? '0', 10);
    const newValue = currValue + 1;

    return {
      statusCode: 200,
      headers: {
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
