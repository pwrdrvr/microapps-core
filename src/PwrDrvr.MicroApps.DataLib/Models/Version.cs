using System;
using System.Collections;
using Amazon.DynamoDBv2.DataModel;
using PwrDrvr.MicroApps;
using PwrDrvr.MicroApps.DataLib;

namespace PwrDrvr.MicroApps.Models {
  [DynamoDBTable("MicroApps")]
  public class Version {
    private enum SaveBy {
      AppName,
      Applications
    }

    private SaveBy _keyBy;

    public Version() {
      _keyBy = SaveBy.AppName;
    }

    public async void SaveAsync() {
      // TODO: Validate that all the fields needed are present

      // Save under all Applications key
      this._keyBy = SaveBy.Applications;
      await Manager.Context.SaveAsync(this);

      // Save under specific AppName key
      this._keyBy = SaveBy.AppName;
      await Manager.Context.SaveAsync(this);
    }

    [DynamoDBHashKey] // Partition key
    public string PK {
      get {
        switch (this._keyBy) {
          case SaveBy.AppName:
            return "appName#" + this.AppName;
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
            return string.Format("version#{0}", this.SemVer);
          default:
            throw new NotImplementedException("Missing SaveBy handler");
        }
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
  }
}