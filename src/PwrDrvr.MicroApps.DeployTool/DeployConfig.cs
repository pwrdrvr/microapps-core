using System;
using System.Globalization;
using System.Linq.Expressions;
using System.Text.Json;
using System.IO;

namespace PwrDrvr.MicroApps.DeployTool {
  public class DeployConfig {
    private static readonly string _fileName = "deploy.json";

    internal static DeployConfig Load() {
      if (File.Exists(DeployConfig._fileName)) {
        var config = JsonSerializer.Deserialize<DeployConfig>(File.ReadAllText(DeployConfig._fileName));
        return config;
      }
      return null;
    }

    public string DefaultFile { get; set; }
    private string _appName;
    public string AppName {
      get {
        return _appName;
      }
      set {
        _appName = value.ToLower();
      }
    }
    public string SemVer { get; set; }
    public string StaticAssetsPath { get; set; }
    public string LambdaARN { get; set; }
  }
}