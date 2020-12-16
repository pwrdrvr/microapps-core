using PwrDrvr.MicroApps.DataLib;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using Amazon.S3;
using Amazon.S3.Transfer;
using System;
using Amazon.Runtime;
using Amazon.DynamoDBv2.Model.Internal.MarshallTransformations;
using System.Diagnostics;

namespace PwrDrvr.MicroApps.Deployer.Controllers {
  public class VersionBody {
    public string s3SourceURI { get; set; }
    public string lambdaARN { get; set; }
  }

  [ApiController]
  [Route("deployer/[controller]")]
  public class VersionController : ControllerBase {
    // POST version/{appName}/{semVer}
    [HttpPost("{appName}/{semVer}")]
    async public Task Post(string appName, string semVer, [FromBody] VersionBody versionBody) {
      try {
        Console.WriteLine("Got Body: ${0}", versionBody);

        const string destinationBucket = "pwrdrvr-apps";
        string destinationPrefix = string.Format("{0}/{1}", appName, semVer);

        // Create the version record
        await Manager.CreateVersion(new DataLib.Models.Version() {
          AppName = appName,
          SemVer = semVer,
          Type = "lambda",
          Status = "pending",
        });

        // S3DirectoryInfo source = new S3DirectoryInfo(s3Client, bucketName, "sourceFolder");
        //  string bucketName2 = "destination butcket";
        //     S3DirectoryInfo destination = new S3DirectoryInfo(s3Client, bucketName2);
        //   source.CopyTo(destination);
        // // or
        // source.MoveTo(destination);

        // TODO: Create the folder on the target bucket
        var s3Client = new AmazonS3Client();
        // var xferUtil = new TransferUtility(s3Client);
        // xferUtil.UploadDirectoryAsync("/tmp/foo", "",

        // Parse the S3 Source URI
        var uri = new System.Uri(versionBody.s3SourceURI);

        var sourceBucket = uri.Host;
        var sourcePrefix = uri.AbsolutePath.Length >= 1 ? uri.AbsolutePath.Substring(1) : null;

        // Example Source: s3://pwrdrvr-apps-staging/release/1.0.0/
        var paginator = s3Client.Paginators.ListObjectsV2(new Amazon.S3.Model.ListObjectsV2Request() {
          BucketName = uri.Host,
          Prefix = sourcePrefix,
        });

        await foreach (var obj in paginator.S3Objects) {
          var sourceKeyRootless = obj.Key.Remove(0, sourcePrefix.Length);
          Console.WriteLine("object: ${0}", obj.Key);
          await s3Client.CopyObjectAsync(sourceBucket, obj.Key,
          destinationBucket, string.Format("{0}/{1}", destinationPrefix, sourceKeyRootless));
        }


        // TODO: Copy the S3 assets from the source bucket

        // TODO: Confirm the Lambda Function exists

        // TODO: Confirm the Lambda will allow API Gateway to execute
        // TODO: Reject the request if API Gateway can't execute

        // TODO: Add the route to API Gateway

      } catch (Exception ex) {
        Response.StatusCode = 500;
      }
    }

    // GET version/{appName}
    [HttpGet("{appName}")]
    async public Task<string> Get(string appName) {
      return "Not Implemented";
    }

    // DELETE /version/{appName}
    [HttpDelete("{appName}")]
    public void Delete(string appName) {
    }
  }
}
