using System.Collections.Generic;
using Microsoft.AspNetCore.Mvc;

namespace PwrDrvr.MicroApps.Release.Controllers {
  [Route("api/[controller]")]
  [Route("{release}/{version}/api/[controller]")]
  public class ValuesController : ControllerBase {
    // GET values
    [HttpGet]
    public IEnumerable<string> Get(string release, string version) {
      return new string[] { "value1", "value2", release, version };
    }
  }
}
