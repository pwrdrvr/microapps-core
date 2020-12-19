using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Amazon.DynamoDBv2.DataModel;

namespace PwrDrvr.MicroApps.DataLib.Models {
  [DynamoDBTable("MicroApps")]
  public class Application {
    private enum SaveBy {
      AppName,
      Applications
    }

    private SaveBy _keyBy;

    public Application() {
      _keyBy = SaveBy.AppName;
    }

    public async Task SaveAsync() {
      // TODO: Validate that all the fields needed are present

      // Save under specific AppName key
      this._keyBy = SaveBy.AppName;
      var taskByName = Manager.Context.SaveAsync(this);

      // Save under all Applications key
      this._keyBy = SaveBy.Applications;
      var taskByApplications = Manager.Context.SaveAsync(this);

      await Task.WhenAll(taskByName, taskByApplications);

      // Await the tasks so they can throw / complete
      await taskByName;
      await taskByApplications;
    }

    [DynamoDBHashKey] // Partition key
    public string PK {
      get {
        switch (this._keyBy) {
          case SaveBy.Applications:
            return "applications";
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
          case SaveBy.Applications:
            return string.Format("appName#{0}", this.AppName).ToLower();
          case SaveBy.AppName:
            return "application";
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
    public string DisplayName {
      get; set;
    }

    // TODO: Add Status
    // created, registered (integration), disabled
  }
}