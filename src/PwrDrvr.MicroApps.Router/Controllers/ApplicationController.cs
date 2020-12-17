using PwrDrvr.MicroApps.DataLib;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using System.Text;

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
      var semVerUnderscores = defaultVersion.Replace('.', '_');
      var appVersionPath = string.Format("/{0}/{1}/", appName, semVerUnderscores);
      var frameHTML = Startup.FrameTemplate.Replace("{{iframeSrc}}", appVersionPath);

      Response.ContentType = "text/html; charset=UTF-8";
      await Response.BodyWriter.WriteAsync(Encoding.UTF8.GetBytes(frameHTML));
    }
  }
}
