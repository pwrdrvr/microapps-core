using PwrDrvr.MicroApps.DataLib;
using Amazon.Lambda.Core;
using Amazon.Lambda.APIGatewayEvents;
using System.Threading.Tasks;
using System.Collections.Generic;
using Amazon.S3;
using System.Text;
using System;
using System.IO;
using System.Linq;

// Assembly attribute to enable the Lambda function's JSON input to be converted into a .NET class.
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace PwrDrvr.MicroApps.Router {
  public class Function {

    IAmazonS3 S3Client { get; set; }

    // Load the template file

    string FrameTemplate { get; set; }

    /// <summary>
    /// Default constructor. This constructor is used by Lambda to construct the instance. When invoked in a Lambda environment
    /// the AWS credentials will come from the IAM role associated with the function and the AWS region will be set to the
    /// region the Lambda function is executed in.
    /// </summary>
    public Function() {
      var assemblyPath = System.AppDomain.CurrentDomain.BaseDirectory;
      var fullPathToTemplate = Path.Join(assemblyPath, "appFrame.html");
      FrameTemplate = System.IO.File.ReadAllText(fullPathToTemplate);

      S3Client = new AmazonS3Client();
    }

    /// <summary>
    /// Constructs an instance with a preconfigured S3 client. This can be used for testing the outside of the Lambda environment.
    /// </summary>
    /// <param name="s3Client"></param>
    public Function(IAmazonS3 s3Client) {
      this.S3Client = s3Client;

      var assemblyPath = System.AppDomain.CurrentDomain.BaseDirectory;
      var fullPathToTemplate = Path.Join(assemblyPath, "appFrame.html");
      FrameTemplate = System.IO.File.ReadAllText(fullPathToTemplate);
    }

    /// <summary>
    /// Simple router without all the WebAPI cruft.
    /// </summary>
    /// <param name="evnt">API Gateay HTTP V2 Request</param>
    /// <param name="context"></param>
    /// <returns>API Gateway HTTP V2 Response</returns>
    public async Task<APIGatewayHttpApiV2ProxyResponse> Handler(APIGatewayHttpApiV2ProxyRequest request, ILambdaContext context) {
      var response = new APIGatewayHttpApiV2ProxyResponse();
      response.Headers = new Dictionary<string, string>();

      try {
        // /someapp will split into length 2 with ["", "someapp"] as results
        var parts = request.RawPath.Split('/');

        // TODO: Pass any parts after the appName/Version to the route handler
        string additionalParts;
        if (parts.Length >= 4 && parts[3] != string.Empty) {
          additionalParts = string.Join('/', parts.Skip(3));
        }

        if (parts.Length == 2 || (parts.Length == 3 && parts[2] == string.Empty)) {
          // This is an application name only
          await this.Get(request, response, parts[1]);
        } else if (parts.Length == 2) {
          // TODO: Remove this route as it cannot actually get hit for two reasons:
          // 1) API Gateway has no route to send these requests to Router (I think?)
          // 2) If we write the file name in the versionless frame the request will
          //    go directly to S3, bypassing API Gateway and Router
          await this.Get(request, response, parts[1], parts[2]);
        } else {
          throw new Exception("Unmatched route");
        }
      } catch (Exception e) {
        response.StatusCode = 599;
        response.IsBase64Encoded = false;
        response.Headers.Clear();
        response.Headers.Add("Content-Type", "text/plain");
        response.Body = string.Format("Router - Could not route: {0}, {1}", request.RawPath, e.Message);
      }

      return response;
    }

    async private Task Get(APIGatewayHttpApiV2ProxyRequest request,
        APIGatewayHttpApiV2ProxyResponse response, string appName) {
      var versionsAndRules = await Manager.GetVersionsAndRules(appName);

      //
      // TODO: Get the incoming attributes of user
      // For logged in users, these can be: department, product type,
      //  employee, office, division, etc.
      // For anonymous users this can be: geo region, language,
      // browser, IP, CIDR, ASIN, etc.
      //
      // The Rules can be either a version or a distribution of versions,
      // including default, for example:
      //     80% to 1.1.0, 20% to default (1.0.3)
      //

      var defaultVersion = versionsAndRules.Rules?.RuleSet["default"]?.SemVer;

      if (defaultVersion == null) {
        response.StatusCode = 404;
        response.Headers.Add("Cache-Control", "no-store; private");
        response.Headers.Add("Content-Type", "text/plain; charset=UTF-8");
        response.Body = string.Format("Router - Could not find app: {0}, {1}", request.RawPath, appName);
        return;
      }

      // TODO: Yeah, this is lame - We should save these in a dictionary keyed by SemVer
      var defaultVersionInfo = versionsAndRules.Versions.Find(version => version.SemVer == defaultVersion);


      // Prepare the iframe contents
      // var semVerUnderscores = defaultVersion.Replace('.', '_');
      string appVersionPath;
      if (string.IsNullOrWhiteSpace(defaultVersionInfo.DefaultFile)) {
        // KLUDGE: We're going to take a missing default file to mean that the
        // app type is Next.js (or similar) and that it wants no trailing slash after the version
        // TODO: Move this to an attribute of the version
        appVersionPath = string.Format("/{0}/{1}", appName, defaultVersion);
      } else {
        // Linking to the file directly means this will be peeled off by the S3 route
        // That means we won't have to proxy this from S3
        appVersionPath = string.Format("/{0}/{1}/{2}", appName, defaultVersion, defaultVersionInfo.DefaultFile);
      }


      //
      // Create the versionless host page
      //
      var frameHTML = this.FrameTemplate.Replace("{{iframeSrc}}", appVersionPath);

      response.Headers.Add("Cache-Control", "no-store; private");
      response.Headers.Add("Content-Type", "text/html; charset=UTF-8");

      response.StatusCode = 200;
      response.Body = frameHTML;
    }

    [Obsolete("/appname/version/ requests should not reach Router")]
    async private Task Get(APIGatewayHttpApiV2ProxyRequest request,
        APIGatewayHttpApiV2ProxyResponse response, string appName, string version) {
      // Check if caller already has this immutable file cached
      if (request.Headers.ContainsKey("If-None-Match")) {
        if (request.Headers["If-None-Match"] == version) {
          response.StatusCode = 304;
          return;
        }
      }

      var versionInfo = await Manager.GetAppVersion(appName, version);

      // If no such version, return 404
      if (versionInfo == null) {
        response.StatusCode = 404;
        response.Headers.Add("Cache-Control", "no-store; private");
        return;
      }

      const string bucketName = "pwrdrvr-apps";
      string fileName = string.Format("{0}/{1}/{2}", appName, version, versionInfo.DefaultFile);

      // Fetch the default file from S3
      var obj = await this.S3Client.GetObjectAsync(bucketName, fileName);

      // If not found, return non-cachable result
      if (obj == null) {
        Console.WriteLine("File not found on S3: {0}", fileName);
        response.StatusCode = 404;
        response.Headers.Add("Cache-Control", "private; no-store");
        return;
      }

      // Found, return cacheable result
      // ETag is used to determine that we can short-circuit with a 304
      // and no body (don't even need to hit DB)
      response.Headers.Add("Cache-Control", "max-age=86400; public");
      response.Headers.Add("ETag", version);

      // Stream back the bytes from S3
      response.Headers.Add("Content-Type", "text/html; charset=UTF-8");
      using (var ms = new MemoryStream()) {
        await obj.ResponseStream.CopyToAsync(ms);
        response.Body = Encoding.UTF8.GetString(ms.GetBuffer());
      }
    }
  }
}
