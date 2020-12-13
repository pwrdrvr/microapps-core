using System;
using System.Collections;
using Amazon.DynamoDBv2.DataModel;
using PwrDrvr.MicroApps.DataLib;

namespace PwrDrvr.MicroApps.DataLib.Models {
  [DynamoDBTable("MicroApps")]
  public class Rule {
    public Rule() {
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