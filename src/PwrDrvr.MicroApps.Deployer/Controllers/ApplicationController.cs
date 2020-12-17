using PwrDrvr.MicroApps.DataLib;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace PwrDrvr.MicroApps.Deployer.Controllers {
  [ApiController]
  [Route("[controller]")]
  [Route("deployer/[controller]")]
  public class ApplicationController : ControllerBase {
    public class ApplicationBody {
      public string appName { get; set; }
    }

    // POST /deployer/application
    [HttpPost()]
    async public Task Post([FromBody] ApplicationBody appBody) {
      await Manager.CreateApp(new DataLib.Models.Application() {
        AppName = appBody.appName,
        DisplayName = appBody.appName,
      });
    }
  }
}
