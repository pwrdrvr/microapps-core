using System;
using System.Threading.Tasks;
using Amazon.DynamoDBv2.DataModel;
using System.Collections.Generic;
using Amazon.DynamoDBv2.DocumentModel;
using System.Linq;
using Amazon.DynamoDBv2.Model.Internal.MarshallTransformations;

namespace PwrDrvr.MicroApps.DataLib.Models {
  [DynamoDBTable("MicroApps")]
  public class Version {
    private enum SaveBy {
      AppName,
    }

    private SaveBy _keyBy;

    public Version() {
      _keyBy = SaveBy.AppName;
    }

    public async Task SaveAsync() {
      // TODO: Validate that all the fields needed are present

      // Save under specific AppName key
      this._keyBy = SaveBy.AppName;
      await Manager.Context.SaveAsync(this);
    }

    static public async Task<List<Version>> GetVersionsAsync(string appName) {
      var key = new Version() {
        AppName = appName,
        _keyBy = SaveBy.AppName,
      };

      // Get all record that have the PK and start with the SK prefix
      var results = Manager.Context.QueryAsync<Version>(key.PK,
      QueryOperator.BeginsWith, new string[] {
        key.SK
      });
      return await results.GetRemainingAsync();
    }

    static public async Task<Version> GetVersionAsync(string appName, string version) {
      var key = new Version() {
        AppName = appName,
        SemVer = version,
        _keyBy = SaveBy.AppName,
      };

      // Get the record that have the PK and start with the SK prefix
      var results = Manager.Context.QueryAsync<Version>(key.PK,
      QueryOperator.BeginsWith, new string[] {
        key.SK
      });

      var records = await results.GetRemainingAsync();
      if (records.Count == 0) {
        return null;
      } else {
        return records.First();
      }
    }

    [DynamoDBHashKey] // Partition key
    public string PK {
      get {
        switch (this._keyBy) {
          case SaveBy.AppName:
            return string.Format("appName#{0}", this.AppName).ToLower();
          default:
            throw new NotImplementedException("Missing SaveBy handler");
        }
      }
      set {
        // Don't need to save this, it's a derived value
      }
    }

    [DynamoDBRangeKey] // Sort Key
    public string SK {
      get {
        switch (this._keyBy) {
          case SaveBy.AppName:
            return string.Format("version#{0}", this.SemVer).ToLower();
          default:
            throw new NotImplementedException("Missing SaveBy handler");
        }
      }
      set {
        // Don't need to save this, it's a derived value
      }
    }

    private string _appName;
    [DynamoDBProperty]
    public string AppName {
      get {
        return _appName;
      }
      set {
        _appName = value.ToLower();
      }
    }

    [DynamoDBProperty]
    public string SemVer {
      get; set;
    }

    [DynamoDBProperty]
    public string Type {
      get; set;
    }

    [DynamoDBProperty]
    public string Status {
      get; set;
    }

    // File to be served on /appName/1.0.0/ request
    // This gets proxied from S3 and marked as cachable/immutable if found/
    // If not found, marked as no-store, must-revalidate
    [DynamoDBProperty]
    public string DefaultFile {
      get; set;
    }

    [DynamoDBProperty]
    public string IntegrationID {
      get; set;
    }
  }
}