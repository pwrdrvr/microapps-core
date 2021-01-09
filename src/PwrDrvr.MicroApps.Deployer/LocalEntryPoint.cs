﻿using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;

namespace PwrDrvr.MicroApps.Deployer {
  /// <summary>
  /// The Main function can be used to run the ASP.NET Core application locally using the Kestrel webserver.
  /// </summary>
  public class LocalEntryPoint {
    public static void Main(string[] args) {
      CreateHostBuilder(args).Build().Run();
    }

    public static IHostBuilder CreateHostBuilder(string[] args) =>
        Host.CreateDefaultBuilder(args)
            .ConfigureWebHostDefaults(webBuilder => {
              webBuilder.UseStartup<Startup>();
            });
  }
}
