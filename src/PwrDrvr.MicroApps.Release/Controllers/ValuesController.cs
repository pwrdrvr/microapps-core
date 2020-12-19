using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;

namespace PwrDrvr.MicroApps.Release.Controllers {
  [Route("[controller]")]
  [Route("{release}/{version}/[controller]")]
  public class ValuesController : ControllerBase {
    // GET values
    [HttpGet]
    public IEnumerable<string> Get(string release, string version) {
      return new string[] { "value1", "value2", release, version };
    }
  }
}
