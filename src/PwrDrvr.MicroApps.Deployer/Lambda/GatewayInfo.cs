using System.Threading.Tasks;
using Amazon.ApiGatewayV2;
using Amazon.ApiGatewayV2.Model;

namespace PwrDrvr.MicroApps.Deployer.Lambda {
  public class GatewayInfo {
    public static async Task<string> GetAPIID(AmazonApiGatewayV2Client apigwy) {
      var apis = await apigwy.GetApisAsync(new GetApisRequest() {
        MaxResults = "100",
      });
      string apiId = "";
      // TODO: Handle pagination
      foreach (var api in apis.Items) {
        if (api.Name == "microapps-apis") {
          apiId = api.ApiId;
          break;
        }
      }

      return apiId;
    }

    public static async Task<string> GetRouterIntegrationId(AmazonApiGatewayV2Client apigwy, string apiId) {
      var intRouterId = "";
      var integrations = await apigwy.GetIntegrationsAsync(new GetIntegrationsRequest() {
        ApiId = apiId,
        MaxResults = "100",
      });
      foreach (var integration in integrations.Items) {
        if (integration.IntegrationUri.EndsWith("microapps-router")) {
          intRouterId = integration.IntegrationId;
          break;
        }
      }

      return intRouterId;
    }
  }
}