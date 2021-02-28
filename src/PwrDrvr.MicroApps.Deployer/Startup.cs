using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpsPolicy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace PwrDrvr.MicroApps.Deployer {
  public class Startup {
    const string ALLOW_DEVELOPMENT_CORS_ORIGINS_POLICY = "AllowDevelopmentSpecificOrigins";
    const string LOCAL_DEVELOPMENT_URL = "http://localhost:3000";

    public Startup(IConfiguration configuration) {
      Configuration = configuration;
    }

    public static IConfiguration Configuration { get; private set; }

    // This method gets called by the runtime. Use this method to add services to the container
    public void ConfigureServices(IServiceCollection services) {
      services.AddControllers();

      services.AddCors(options => {
        options.AddPolicy(name: ALLOW_DEVELOPMENT_CORS_ORIGINS_POLICY,
            builder => {
              builder.WithOrigins(LOCAL_DEVELOPMENT_URL)
                          .AllowAnyMethod()
                          .AllowAnyHeader()
                          .AllowCredentials();
            });
      });

      // Register the Swagger services
      services.AddSwaggerDocument();
    }

    // This method gets called by the runtime. Use this method to configure the HTTP request pipeline
    public void Configure(IApplicationBuilder app, IWebHostEnvironment env) {
      if (env.IsDevelopment()) {
        app.UseDeveloperExceptionPage();
      } else {
        app.UseExceptionHandler("/Error");
        // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
        app.UseHsts();
        app.UseHttpsRedirection();
      }

      app.UseDefaultFiles();
      app.UseStaticFiles();

      app.UseRouting();

      app.UseAuthorization();

      // Register the Swagger generator and the Swagger UI middlewares
      app.UseOpenApi();
      app.UseSwaggerUi3();

      if (env.IsDevelopment())
        app.UseCors(ALLOW_DEVELOPMENT_CORS_ORIGINS_POLICY);

      app.UseEndpoints(endpoints => {
        endpoints.MapControllers();
      });
    }
  }
}
