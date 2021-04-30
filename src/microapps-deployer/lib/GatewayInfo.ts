import * as apigwy from '@aws-sdk/client-apigatewayv2';

export default class GatewayInfo {
  // public static async GetAPIID(apigwyClient: apigwy.ApiGatewayV2Client): Promise<string> {
  //   return (await GatewayInfo.GetAPI(apigwyClient))?.ApiId as string;
  // }

  public static async GetAPI(
    apigwyClient: apigwy.ApiGatewayV2Client,
  ): Promise<apigwy.Api | undefined> {
    const apis = await apigwyClient.send(
      new apigwy.GetApisCommand({
        MaxResults: '100',
      }),
    );
    // TODO: Handle continuation tokens when more than 100 integrations
    if (apis === undefined || apis.Items === undefined) {
      return undefined;
    }
    for (const api of apis.Items) {
      if (api.Name === 'microapps-apis') {
        return api;
      }
    }

    return undefined;
  }
}
