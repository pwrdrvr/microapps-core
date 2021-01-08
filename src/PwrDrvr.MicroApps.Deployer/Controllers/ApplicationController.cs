using PwrDrvr.MicroApps.DataLib;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using Amazon.ApiGatewayV2.Model;
using System;
using PwrDrvr.MicroApps.Deployer.Lambda;

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

#if false
      // Get reference to Router function
      var lambda = new Amazon.Lambda.AmazonLambdaClient();
      var function = await lambda.GetFunctionAsync("microapps-router");

      var apigwy = new Amazon.ApiGatewayV2.AmazonApiGatewayV2Client();

      // Get the APIId of the microapps API
      var apiId = await GatewayInfo.GetAPIID(apigwy);

      // Get integration for Route function
      string intRouterId = await GatewayInfo.GetRouterIntegrationId(apigwy, apiId);

      var routes = await apigwy.GetRoutesAsync(new GetRoutesRequest() {
        ApiId = apiId,
        MaxResults = "100",
      });
      foreach (var route in routes.Items) {
        Console.WriteLine("route: {0}", route.RouteId);
      }

      // Add Route for new App root, pointing to Router integration
      var routeRouter = await apigwy.CreateRouteAsync(new CreateRouteRequest() {
        ApiId = apiId,
        Target = string.Format("integrations/{0}", intRouterId),
        RouteKey = string.Format("ANY /{0}", appBody.appName),
      });
#endif

      // TODO: Update DynamoDB status to indicate integration has been
      // created
    }
  }
}
