using PwrDrvr.MicroApps.DataLib;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using System.Buffers;

namespace PwrDrvr.MicroApps.Router.Controllers {
  [ApiController]
  [Route("")]
  public class ApplicationController : ControllerBase {
    // GET /{appName}
    [HttpGet("{appName}")]
    async public Task<string> Get(string appName) {
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



      return defaultVersion.Replace('.', '_');
    }
  }
}
