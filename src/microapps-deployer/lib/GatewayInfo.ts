import * as apigwy from '@aws-sdk/client-apigatewayv2';

export default class GatewayInfo {
  public static async GetAPIID(apigwyClient: apigwy.ApiGatewayV2Client): Promise<string> {
    return (await GatewayInfo.GetAPI(apigwyClient)).ApiId;
  }

  public static async GetAPI(apigwyClient: apigwy.ApiGatewayV2Client): Promise<apigwy.Api> {
    const apis = await apigwyClient.send(
      new apigwy.GetApisCommand({
        MaxResults: '100',
      }),
    );
    // TODO: Handle pagination
    for (const api of apis.Items) {
      if (api.Name == 'microapps-apis') {
        return api;
      }
    }

    return undefined;
  }
}
