using PwrDrvr.MicroApps.DataLib;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace PwrDrvr.MicroApps.Deployer.Controllers {
  [ApiController]
  [Route("[controller]")]
  public class ApplicationController : ControllerBase {
    // POST application/{appName}
    [HttpPost("{appName}")]
    async public Task Post(string appName) {
      await Manager.CreateApp(new DataLib.Models.Application() {
        AppName = appName,
        DisplayName = appName
      });
    }

    // GET application/{appName}
    [HttpGet("{appName}")]
    async public Task<string> Get(string appName) {
      return "Not Implemented";
    }

    // DELETE api/application/{appName}
    [HttpDelete("{appName}")]
    public void Delete(string appName) {
    }
  }
}
