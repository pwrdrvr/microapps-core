import * as apigwy from '@aws-sdk/client-apigatewayv2';

export default class GatewayInfo {
  // public static async GetAPIID(apigwyClient: apigwy.ApiGatewayV2Client): Promise<string> {
  //   return (await GatewayInfo.GetAPI(apigwyClient))?.ApiId as string;
  // }

  public static async GetAPI(
    apigwyClient: apigwy.ApiGatewayV2Client,
  ): Promise<apigwy.Api | undefined> {
    let apis: apigwy.GetApisCommandOutput | undefined;
    do {
      const optionals =
        apis?.NextToken !== undefined
          ? { NextToken: apis.NextToken }
          : ({} as apigwy.GetApisCommandInput);
      apis = await apigwyClient.send(
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
        // FIXME: Load the api name from an env var
        if (api.Name === 'microapps-apis') {
          return api;
        }
      }
    } while (apis.NextToken !== undefined);

    return undefined;
  }
}
