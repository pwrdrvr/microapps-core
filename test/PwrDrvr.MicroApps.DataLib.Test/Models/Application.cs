using System;
using System.Threading.Tasks;
using Xunit;
using PwrDrvr.MicroApps.DataLib;

namespace PwrDrvr.MicroApps.DataLib.Application.Test {
  public class ApplicationTest {
    [Fact]
    public void Test1() {
      // Arrange
      var app = new Models.Application();
      app.Name = "apptest1";

      // Act

      // Assert
      Assert.Equal("appName#apptest1", app.PK);
      Assert.Equal("application", app.SK);
    }
  }
}
