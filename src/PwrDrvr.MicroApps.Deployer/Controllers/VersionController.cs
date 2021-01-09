using PwrDrvr.MicroApps.DataLib;
using PwrDrvr.MicroApps.Deployer.Lambda;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using Amazon.S3;
using Amazon.Lambda;
using Amazon.Lambda.Model;
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
    // GET /deployer/version/{appName}/{semVer}
    [HttpGet("{appName}/{version}")]
    async public Task Get(string appName, string version) {
      try {
        // Check if the version exists
        var record = await Manager.GetAppVersion(appName, version);
        if (record != null && record.Status != "pending") {
          Response.StatusCode = 200;
          Console.WriteLine("App/Version already exists: {0}/{1}", appName, version);
          return;
        } else {
          Response.StatusCode = 404;
          Console.WriteLine("App/Version does not exist: {0}/{1}", appName, version);
          return;
        }
      } catch (Exception ex) {
        Response.StatusCode = 500;
        Console.WriteLine("Caught unexpected exception: {0}", ex.Message);
      }
    }

    // POST /deployer/version/
    [HttpPost]
    async public Task Post([FromBody] VersionBody versionBody) {
      try {
        Console.WriteLine("Got Body: {0}", JsonSerializer.Serialize(versionBody));

        const string destinationBucket = "pwrdrvr-apps";
        string destinationPrefix = string.Format("{0}/{1}", versionBody.appName, versionBody.semVer);

        // Check if the version exists
        var record = await Manager.GetAppVersion(versionBody.appName, versionBody.semVer);
        if (record != null && record.Status == "routed") {
          Response.StatusCode = 409;
          Console.WriteLine("App/Version already exists: {0}/{1}", versionBody.appName, versionBody.semVer);
          return;
        }

        // Create the version record
        if (record == null) {
          record = new DataLib.Models.Version() {
            AppName = versionBody.appName,
            SemVer = versionBody.semVer,
            Type = "lambda",
            Status = "pending",
            DefaultFile = versionBody.defaultFile,
          };
          // Save record with pending status
          await Manager.CreateVersion(record);
        }

        // Only copy the files if not copied yet
        if (record.Status == "pending") {
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

          // Update status to assets-copied
          record.Status = "assets-copied";
          await Manager.CreateVersion(record);
        }

        // TODO: Confirm the Lambda Function exists
        var lambdaClient = new AmazonLambdaClient();
        // lambdaClient.CreateAliasAsync(new CreateAliasRequest() {
        //   FunctionName = "",
        //   FunctionVersion = "1",
        //   Name = string.Format("v{0}", versionBody.semVer.Replace('.', '_')),
        // });
        // var aliasResponse = await lambdaClient.GetAliasAsync(new GetAliasRequest() {
        //   FunctionName = "",
        //   Name = "",
        // });

        // Get the API Gateway
        var apigwy = new AmazonApiGatewayV2Client();
        var api = await GatewayInfo.GetAPI(apigwy);

        if (record.Status == "assets-copied") {
          // Get the account ID
          var lambdaArnParts = versionBody.lambdaARN.Split(':');
          var accountId = lambdaArnParts[4];
          var region = lambdaArnParts[3];

          // Ensure that the Lambda function allows API Gateway to invoke
          await lambdaClient.RemovePermissionAsync(new RemovePermissionRequest() {
            FunctionName = versionBody.lambdaARN,
            StatementId = "apigwy",
          });
          await lambdaClient.AddPermissionAsync(new AddPermissionRequest() {
            Principal = "apigateway.amazonaws.com",
            StatementId = "apigwy",
            Action = "lambda:InvokeFunction",
            FunctionName = versionBody.lambdaARN,
            SourceArn = string.Format("arn:aws:execute-api:{0}:{1}:{2}/*/*/{3}/*/api/{{proxy+}}", region, accountId, api.ApiId, versionBody.appName)
          });
          record.Status = "permissioned";
          await Manager.CreateVersion(record);
        }

        // Add Integration pointing to Lambda Function Alias
        var integrationId = "";
        if (record.Status == "permissioned") {
          if (!string.IsNullOrEmpty(record.IntegrationID)) {
            integrationId = record.IntegrationID;
          } else {
            var integration = await apigwy.CreateIntegrationAsync(new CreateIntegrationRequest() {
              ApiId = api.ApiId,
              IntegrationType = IntegrationType.AWS_PROXY,
              IntegrationMethod = "POST",
              PayloadFormatVersion = "2.0",
              IntegrationUri = versionBody.lambdaARN,
            });

            integrationId = integration.IntegrationId;

            // Save the created IntegrationID
            record.IntegrationID = integration.IntegrationId;
            record.Status = "integrated";
            await Manager.CreateVersion(record);
          }
        }

        // Add the route to API Gateway for appName/version/{proxy+}
        var routeRouter = await apigwy.CreateRouteAsync(new CreateRouteRequest() {
          ApiId = api.ApiId,
          Target = string.Format("integrations/{0}", integrationId),
          RouteKey = string.Format("ANY /{0}/{1}/api/{{proxy+}}", versionBody.appName, versionBody.semVer),
        });

        // Update the status - Final status
        record.Status = "routed";
        await Manager.CreateVersion(record);
      } catch (Exception ex) {
        Response.StatusCode = 500;
        Console.WriteLine("Caught unexpected exception: {0}", ex.Message);
      }
    }
  }
}
