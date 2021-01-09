using System;
using System.IO;
using System.Threading.Tasks;

namespace PwrDrvr.MicroApps.DeployTool {
  class Program {
    async static Task<int> Main(string[] args) {
      // Load deploy.json file
      var config = DeployConfig.Load();
      if (config == null) {
        Console.WriteLine("Could not find deploy.json");
        return 1;
      }

      // Check that Static Assets Folder exists
      if (!Directory.Exists(config.StaticAssetsPath)) {
        throw new DirectoryNotFoundException(config.StaticAssetsPath);
      }

      // Confirm the Version Does Not Exist in Published State
      var exists = await DeployerClient.CheckVersionExists(config);
      if (exists) {
        Console.WriteLine("App/Version already exists: {0}/{1}", config.AppName, config.SemVer);
        return 1;
      }

      // Upload Files to S3 Staging AppName/Version Prefix
      await S3Uploader.Upload(config);

      // Call Deployer to Create Version if Not Exists
      await DeployerClient.CreateApp(config);

      // Call Deployer to Deploy AppName/Version
      await DeployerClient.DeployVersion(config);

      return 0;
    }
  }
}
