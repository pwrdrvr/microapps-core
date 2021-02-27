using PwrDrvr.MicroApps.DataLib;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using System.Collections.Generic;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace PwrDrvr.MicroApps.Deployer.Controllers {
  [ApiController]
  [Route("[controller]")]
  [Route("deployer/[controller]")]
  public class ApplicationController : ControllerBase {
    public class ApplicationBody {
      public string appName { get; set; }
    }

    // GET /deployer/application
    [HttpGet()]
    async public Task<List<DataLib.Models.Application>> Get() {
      return await Manager.GetAllApps();
    }

    // POST /deployer/application
    [HttpPost()]
    async public Task Post([FromBody] ApplicationBody appBody) {
      // Save info in DynamoDB - Status Pending
      await Manager.CreateApp(new DataLib.Models.Application() {
        AppName = appBody.appName,
        DisplayName = appBody.appName,
      });

      // TODO: Update DynamoDB status to indicate integration has been
      // created
    }
  }
}
