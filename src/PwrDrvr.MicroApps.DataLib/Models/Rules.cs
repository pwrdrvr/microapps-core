using System;
using System.Collections.Generic;
using System.Data;
using Amazon.DynamoDBv2.DataModel;
using PwrDrvr.MicroApps.DataLib;

namespace PwrDrvr.MicroApps.DataLib.Models {
  [DynamoDBTable("MicroApps")]
  public class Rules {
    public Rules() {
    }

    public async void SaveAsync() {
      // TODO: Validate that all the fields needed are present

      // Save under specific AppName key
      await Manager.Context.SaveAsync(this);
    }

    [DynamoDBHashKey] // Partition key
    public string PK {
      get {
        return "appName#" + this.AppName;
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