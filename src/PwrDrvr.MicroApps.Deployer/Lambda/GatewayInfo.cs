using System.Threading.Tasks;
using Amazon.ApiGatewayV2;
using Amazon.ApiGatewayV2.Model;

namespace PwrDrvr.MicroApps.Deployer.Lambda {
  public class GatewayInfo {
    public static async Task<string> GetAPIID(AmazonApiGatewayV2Client apigwy) {
      return (await GetAPI(apigwy)).ApiId;
    }

    public static async Task<Api> GetAPI(AmazonApiGatewayV2Client apigwy) {
      var apis = await apigwy.GetApisAsync(new GetApisRequest() {
        MaxResults = "100",
      });
      // TODO: Handle pagination
      foreach (var api in apis.Items) {
        if (api.Name == "microapps-apis") {
          return api;
        }
      }

      return null;
    }
  }
}