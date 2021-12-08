import 'source-map-support/register';
import type * as lambda from 'aws-lambda';

// eslint-disable-next-line @typescript-eslint/require-await
export async function handler(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  event: lambda.APIGatewayProxyEventV2,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  context?: lambda.Context,
): Promise<unknown> {
  // return {
  //   statusCode: 200,
  //   headers: {
  //     'Content-Type': 'application/json',
  //   },
  //   isBase64Encoded: false,
  //   body: JSON.stringify({
  //     source: 'demo-app',
  //     timestamp: `${new Date().toUTCString()}`,
  //   }),
  // };

  return {
    source: 'demo-app',
    timestamp: `${new Date().toUTCString()}`,
  };
}
