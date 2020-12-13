using System;
using System.Collections;
using Amazon.DynamoDBv2.DataModel;
using PwrDrvr.MicroApps;
using PwrDrvr.MicroApps.DataLib;

namespace PwrDrvr.MicroApps.Models {
  [DynamoDBTable("MicroApps")]
  public class Rule {
    private enum SaveBy {
      AppName,
    }

    private SaveBy _keyBy;

    public Rule() {
      _keyBy = SaveBy.AppName;
    }

    public async void SaveAsync() {
      // TODO: Validate that all the fields needed are present

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
            if (string.IsNullOrWhiteSpace(this.AttributeName)) {
              return string.Format("rule##");
            } else {
              return string.Format("rule#{0}#{1}",
                this.AttributeName, this.AttributeValue);
            }
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
      // TODO: Validate the SemVer?
      get; set;
    }

    [DynamoDBProperty]
    public string AttributeName {
      get; set;
    }

    [DynamoDBProperty]
    public string AttributeValue {
      get; set;
    }
  }
}