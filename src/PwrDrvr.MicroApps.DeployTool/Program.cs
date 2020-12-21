using System.IO;
using System.Threading.Tasks;

namespace PwrDrvr.MicroApps.DeployTool {
  class Program {
    async static Task Main(string[] args) {
      // Load deploy.json file
      var config = DeployConfig.Load();

      // Check that Static Assets Folder exists
      if (!Directory.Exists(config.StaticAssetsPath)) {
        throw new DirectoryNotFoundException(config.StaticAssetsPath);
      }

      // TODO: Confirm the Version Does Not Exist
      // Make a call to Deployer service?

      // TODO: Upload Files to S3 Staging AppName/Version Prefix
      await S3Uploader.Upload(config);

      // Call Deployer to Create Version if Not Exists
      await DeployerClient.CreateApp(config);

      // Call Deployer to Deploy AppName/Version
      await DeployerClient.DeployVersion(config);
    }
  }
}
