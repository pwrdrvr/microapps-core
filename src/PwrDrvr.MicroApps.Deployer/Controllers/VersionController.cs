using PwrDrvr.MicroApps.DataLib;
using PwrDrvr.MicroApps.Deployer.Lambda;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using Amazon.S3;
using Amazon.Lambda;
using System;
using System.Text.Json;
using Amazon.ApiGatewayV2;
using Amazon.ApiGatewayV2.Model;

namespace PwrDrvr.MicroApps.Deployer.Controllers {
  public class VersionBody {
    public string appName { get; set; }
    public string semVer { get; set; }
    public string s3SourceURI { get; set; }
    public string lambdaARN { get; set; }
    public string defaultFile { get; set; }
  }

  [ApiController]
  [Route("deployer/[controller]")]
  public class VersionController : ControllerBase {
    // POST /deployer/version/
    [HttpPost]
    async public Task Post([FromBody] VersionBody versionBody) {
      try {
        Console.WriteLine("Got Body: {0}", JsonSerializer.Serialize(versionBody));

        const string destinationBucket = "pwrdrvr-apps";
        string destinationPrefix = string.Format("{0}/{1}", versionBody.appName, versionBody.semVer);

        // Create the version record
        await Manager.CreateVersion(new DataLib.Models.Version() {
          AppName = versionBody.appName,
          SemVer = versionBody.semVer,
          Type = "lambda",
          Status = "pending",
          DefaultFile = versionBody.defaultFile,
        });

        var s3Client = new AmazonS3Client();

        // Parse the S3 Source URI
        var uri = new Uri(versionBody.s3SourceURI);

        var sourceBucket = uri.Host;
        var sourcePrefix = uri.AbsolutePath.Length >= 1 ? uri.AbsolutePath.Substring(1) : null;

        // Example Source: s3://pwrdrvr-apps-staging/release/1.0.0/
        var paginator = s3Client.Paginators.ListObjectsV2(new Amazon.S3.Model.ListObjectsV2Request() {
          BucketName = uri.Host,
          Prefix = sourcePrefix,
        });

        // Loop through all S3 source assets and copy to the destination
        await foreach (var obj in paginator.S3Objects) {
          var sourceKeyRootless = obj.Key.Remove(0, sourcePrefix.Length);
          // Console.WriteLine("object: ${0}", obj.Key);
          await s3Client.CopyObjectAsync(sourceBucket, obj.Key,
          destinationBucket, string.Format("{0}/{1}", destinationPrefix, sourceKeyRootless));
        }

        // TODO: Confirm the Lambda Function exists
        // var lambdaClient = new AmazonLambdaClient();
        // lambdaClient.CreateAliasAsync(new CreateAliasRequest() {
        //   FunctionName = "",
        //   FunctionVersion = "1",
        //   Name = string.Format("v{0}", versionBody.semVer.Replace('.', '_')),
        // });
        // var aliasResponse = await lambdaClient.GetAliasAsync(new GetAliasRequest() {
        //   FunctionName = "",
        //   Name = "",
        // });

        // Add Integration pointing to Lambda Function Alias
        var apigwy = new AmazonApiGatewayV2Client();
        var apiId = await GatewayInfo.GetAPIID(apigwy);
        var integration = await apigwy.CreateIntegrationAsync(new Amazon.ApiGatewayV2.Model.CreateIntegrationRequest() {
          ApiId = apiId,
          IntegrationType = IntegrationType.AWS_PROXY,
          IntegrationMethod = "POST",
          PayloadFormatVersion = "2.0",
          IntegrationUri = versionBody.lambdaARN,
        });

        // Add the route to API Gateway for appName/version/{proxy+}
        var routeRouter = await apigwy.CreateRouteAsync(new CreateRouteRequest() {
          ApiId = apiId,
          Target = string.Format("integrations/{0}", integration.IntegrationId),
          RouteKey = string.Format("ANY /{0}/{1}/{{proxy+}}", versionBody.appName, versionBody.semVer),
        });
      } catch (Exception ex) {
        Response.StatusCode = 500;
        Console.WriteLine("Caught unexpected exception: {0}", ex.Message);
      }
    }
  }
}