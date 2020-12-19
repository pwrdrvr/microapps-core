using PwrDrvr.MicroApps.DataLib;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using Amazon.ApiGatewayV2.Model;
using Amazon.ApiGatewayV2;
using System;

namespace PwrDrvr.MicroApps.Deployer.Controllers {
  [ApiController]
  [Route("[controller]")]
  [Route("deployer/[controller]")]
  public class ApplicationController : ControllerBase {
    public class ApplicationBody {
      public string appName { get; set; }
    }

    // POST /deployer/application
    [HttpPost()]
    async public Task Post([FromBody] ApplicationBody appBody) {
      // Save info in DynamoDB - Status Pending
      await Manager.CreateApp(new DataLib.Models.Application() {
        AppName = appBody.appName,
        DisplayName = appBody.appName,
      });

      // Get reference to Router function
      var lambda = new Amazon.Lambda.AmazonLambdaClient();
      var function = await lambda.GetFunctionAsync("microapps-router");

      var apigwy = new Amazon.ApiGatewayV2.AmazonApiGatewayV2Client();

      // Get the APIId of the microapps API
      var apiId = await GetAPI(apigwy);

      // Get integration for Route function
      string intRouterId = await GetRouterIntegrationId(apigwy, apiId);

      var routes = await apigwy.GetRoutesAsync(new GetRoutesRequest() {
        ApiId = apiId,
        MaxResults = "100",
      });
      foreach (var route in routes.Items) {
        Console.WriteLine("route: {0}", route.RouteId);
      }

      // TODO: Add Route for new App root, pointing to Router integration
      var routeRouter = await apigwy.CreateRouteAsync(new CreateRouteRequest() {
        ApiId = apiId,
        Target = string.Format("integrations/{0}", intRouterId),
        RouteKey = string.Format("ANY /{0}", appBody.appName),

      });

      // TODO: Update DynamoDB status to indicate integration has been
      // created

    }

    private static async Task<string> GetRouterIntegrationId(AmazonApiGatewayV2Client apigwy, string apiId) {
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

    private static async Task<string> GetAPI(Amazon.ApiGatewayV2.AmazonApiGatewayV2Client apigwy) {
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
  }
}
