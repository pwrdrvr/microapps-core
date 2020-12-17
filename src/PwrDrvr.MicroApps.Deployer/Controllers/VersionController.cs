using PwrDrvr.MicroApps.DataLib;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using Amazon.S3;
using Amazon.S3.Transfer;
using System;
using Amazon.Runtime;
using Amazon.DynamoDBv2.Model.Internal.MarshallTransformations;
using System.Diagnostics;
using System.Text.Json;

namespace PwrDrvr.MicroApps.Deployer.Controllers {
  public class VersionBody {
    public string appName { get; set; }
    public string semVer { get; set; }
    public string s3SourceURI { get; set; }
    public string lambdaARN { get; set; }
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
        });

        var s3Client = new AmazonS3Client();

        // Parse the S3 Source URI
        var uri = new System.Uri(versionBody.s3SourceURI);

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

        // TODO: Confirm the Lambda will allow API Gateway to execute
        // TODO: Reject the request if API Gateway can't execute

        // TODO: Add the route to API Gateway

      } catch (Exception ex) {
        Response.StatusCode = 500;
        Console.WriteLine("Caught unexpected exception: {0}", ex.Message);
      }
    }
  }
}
