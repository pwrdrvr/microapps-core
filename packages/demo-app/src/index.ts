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
  if (event.rawPath === '/demo-app') {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
      },
      isBase64Encoded: false,
      body: html,
    };
  }

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

  return {
    source: 'demo-app',
    timestamp: `${new Date().toUTCString()}`,
  };
}
