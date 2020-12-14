using PwrDrvr.MicroApps.DataLib;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace PwrDrvr.MicroApps.Deployer.Controllers {
  [ApiController]
  [Route("[controller]")]
  public class VersionController : ControllerBase {
    // POST version/{appName}/{semVer}
    [HttpPost("{appName}/{semVer}")]
    async public Task Post(string appName, string semVer) {
      await Manager.CreateVersion(new DataLib.Models.Version() {
        AppName = appName,
        SemVer = semVer,
        Type = "lambda",
        Status = "pending",
      });
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
