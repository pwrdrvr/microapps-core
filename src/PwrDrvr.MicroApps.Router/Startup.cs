using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System.IO;

namespace PwrDrvr.MicroApps.Router {
  public class Startup {
    public Startup(IConfiguration configuration) {
      Configuration = configuration;

      // Load the template file
      var assemblyPath = System.AppDomain.CurrentDomain.BaseDirectory;
      var fullPathToTemplate = Path.Join(assemblyPath, "appFrame.html");
      FrameTemplate = System.IO.File.ReadAllText(fullPathToTemplate);
    }

    public static IConfiguration Configuration { get; private set; }
    public static string FrameTemplate { get; private set; }

    // This method gets called by the runtime. Use this method to add services to the container
    public void ConfigureServices(IServiceCollection services) {
      services.AddControllers();
    }

    // This method gets called by the runtime. Use this method to configure the HTTP request pipeline
    public void Configure(IApplicationBuilder app, IWebHostEnvironment env) {
      if (env.IsDevelopment()) {
        app.UseDeveloperExceptionPage();
      }

      app.UseHttpsRedirection();

      app.UseRouting();

      app.UseAuthorization();

      app.UseEndpoints(endpoints => {
        endpoints.MapControllers();
        endpoints.MapGet("/", async context => {
          await context.Response.WriteAsync("Welcome to running ASP.NET Core on AWS Lambda");
        });
      });
    }
  }
}
