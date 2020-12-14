using System;
using System.Threading.Tasks;
using Xunit;
using PwrDrvr.MicroApps.DataLib;
using System.Runtime.CompilerServices;

namespace PwrDrvr.MicroApps.DataLib.Application.Test {
  public class ApplicationTest {
    [Fact]
    public void AppConstruction() {
      // Arrange
      var app = new Models.Application();
      app.AppName = "apptest1";

      // Act

      // Assert
      Assert.Equal("appname#apptest1", app.PK);
      Assert.Equal("application", app.SK);
    }
  }
}
