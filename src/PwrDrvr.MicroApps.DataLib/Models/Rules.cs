using System.Threading.Tasks;
using Amazon.DynamoDBv2.DataModel;
using System.Collections.Generic;

namespace PwrDrvr.MicroApps.DataLib.Models {
  [DynamoDBTable("MicroApps")]
  public class Rules {
    public Rules() {
    }

    public async Task SaveAsync() {
      // TODO: Validate that all the fields needed are present

      // Save under specific AppName key
      await Manager.Context.SaveAsync(this);
    }

    static public async Task<Rules> GetRulesAsync(string appName) {
      var key = new Rules() {
        AppName = appName,
      };

      var results = await Manager.Context.LoadAsync<Rules>(key.PK, key.SK);
      return results;
    }

    [DynamoDBHashKey] // Partition key
    public string PK {
      get {
        return string.Format("appName#{0}", this.AppName).ToLower();
      }
      set {
        // Don't need to save this, it's a derived value
      }
    }

    [DynamoDBRangeKey] // Sort Key
    public string SK {
      get {
        return "rules";
      }
      set {
        // Don't need to save this, it's a derived value
      }
    }

    [DynamoDBProperty]
    public string AppName {
      get; set;
    }

    [DynamoDBProperty]
    public Dictionary<string, Rule> RuleSet {
      get; set;
    }

    [DynamoDBVersion]
    public int? Version {
      get; set;
    }
  }
}