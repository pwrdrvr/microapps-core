using PwrDrvr.MicroApps.DataLib;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using System.Text;
using System;
using Microsoft.AspNetCore.Builder;

namespace PwrDrvr.MicroApps.Router.Controllers {
  [ApiController]
  [Route("")]
  public class ApplicationController : ControllerBase {
    // GET /{appName}
    [HttpGet("{appName}")]
    async public Task Get(string appName) {
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

      // Prepare the iframe contents
      // var semVerUnderscores = defaultVersion.Replace('.', '_');
      var appVersionPath = string.Format("/{0}/{1}/", appName, defaultVersion);
      var frameHTML = Startup.FrameTemplate.Replace("{{iframeSrc}}", appVersionPath);

      Response.Headers.Add("Cache-Control", "no-store; private");
      Response.ContentType = "text/html; charset=UTF-8";
      await Response.BodyWriter.WriteAsync(Encoding.UTF8.GetBytes(frameHTML));
    }

    // GET /[appName]/[version]
    [HttpGet("{appName}/{version}")]
    async public Task Get(string appName, string version) {
      // Check if caller already has this immutable file cached
      if (Request.Headers.ContainsKey("If-None-Match")) {
        if (Request.Headers["If-None-Match"] == version) {
          Response.StatusCode = 304;
          await Response.Body.DisposeAsync();
          return;
        }
      }

      var versionInfo = await Manager.GetAppVersion(appName, version);

      // If no such version, return 404
      if (versionInfo == null) {
        Response.StatusCode = 404;
        Response.Headers.Add("Cache-Control", "no-store; private");
        await Response.Body.DisposeAsync();
        return;
      }

      const string bucketName = "pwrdrvr-apps";
      string fileName = string.Format("{0}/{1}/{2}", appName, version, versionInfo.DefaultFile);

      // Fetch the default file from S3
      var s3Client = new Amazon.S3.AmazonS3Client();
      var obj = await s3Client.GetObjectAsync(bucketName, fileName);

      // If not found, return non-cachable result
      if (obj == null) {
        Console.WriteLine("File not found on S3: {0}", fileName);
        Response.StatusCode = 404;
        Response.Headers.Add("Cache-Control", "private; no-store");
        await Response.Body.DisposeAsync();
        return;
      }

      // Found, return cacheable result
      // ETag is used to determine that we can short-circuit with a 304
      // and no body (don't even need to hit DB)
      Response.Headers.Add("Cache-Control", "max-age=86400; public");
      Response.Headers.Add("ETag", version);

      // Stream back the bytes from S3
      await obj.ResponseStream.CopyToAsync(Response.Body);
    }
  }
}
