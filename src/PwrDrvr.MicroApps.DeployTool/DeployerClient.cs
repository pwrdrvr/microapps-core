using System.Net.Http;
using System.Threading.Tasks;
using System.Net.Http.Json;
using System.Net;
using System;

namespace PwrDrvr.MicroApps.DeployTool {
  public class CreateApplicationRequest {
    public string appName { get; set; }
  }

  public class DeployVersionRequest {
    public string appName { get; set; }
    public string semVer { get; set; }
    public string s3SourceURI { get; set; }
    public string lambdaARN { get; set; }
    public string defaultFile { get; set; }
  }

  internal class DeployerClient {
    static readonly HttpClient _client = new HttpClient();

    internal async static Task CreateApp(DeployConfig config) {
      var url = "https://apps.pwrdrvr.com/deployer/application/";
      var appRequst = new CreateApplicationRequest() {
        appName = config.AppName,
      };
      var response = await _client.PostAsJsonAsync(url, appRequst);
      if (response.StatusCode != HttpStatusCode.OK) {
        throw new InvalidOperationException();
      }
    }

    internal async static Task<bool> CheckVersionExists(DeployConfig config) {
      var url = string.Format("https://apps.pwrdrvr.com/deployer/version/{0}/{1}/", config.AppName, config.SemVer);
      var response = await _client.GetAsync(url);
      if (response.StatusCode == HttpStatusCode.OK) {
        return true;
      } else {
        return false;
      }
    }

    internal async static Task DeployVersion(DeployConfig config) {
      var url = "https://apps.pwrdrvr.com/deployer/version/";
      var verRequest = new DeployVersionRequest() {
        appName = config.AppName,
        semVer = config.SemVer,
        defaultFile = config.DefaultFile,
        lambdaARN = config.LambdaARN,
        s3SourceURI = string.Format("s3://pwrdrvr-apps-staging/{0}/{1}/", config.AppName, config.SemVer),
      };
      var response = await _client.PostAsJsonAsync(url, verRequest);
      if (response.StatusCode != HttpStatusCode.OK) {
        throw new InvalidOperationException();
      }
    }
  }
}