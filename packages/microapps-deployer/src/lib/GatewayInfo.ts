import * as apigwy from '@aws-sdk/client-apigatewayv2';

export default class GatewayInfo {
  /**
   * Find first API by name - This is not reliable
   * @deprecated 2021-11-28 - Do NOT use as this will return first matching name, which can have duplicates
   * @param apigwyClient
   * @returns
   */
  public static async GetAPI(opts: {
    apigwyClient: apigwy.ApiGatewayV2Client;
    apiName: string;
  }): Promise<apigwy.Api | undefined> {
    let apis: apigwy.GetApisCommandOutput | undefined;
    do {
      const optionals =
        apis?.NextToken !== undefined
          ? { NextToken: apis.NextToken }
          : ({} as apigwy.GetApisCommandInput);
      apis = await opts.apigwyClient.send(
        new apigwy.GetApisCommand({
          MaxResults: '100',
          ...optionals,
        }),
      );

      if (apis === undefined) {
        throw new Error('GetApisCommand unexpectedly returned undefined');
      }
      if (apis.Items === undefined) {
        continue;
      }

      // Loop through and find our item, it it is here
      for (const api of apis.Items) {
        if (api.Name === opts.apiName) {
          return api;
        }
      }
    } while (apis.NextToken !== undefined);

    return undefined;
  }
}
