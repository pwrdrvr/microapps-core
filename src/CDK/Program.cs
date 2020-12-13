using Amazon.CDK;
using Amazon.CDK.RegionInfo;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Cloudfront {
  sealed class Program {
    public static void Main(string[] args) {
      var app = new App();
      new CloudfrontStack(app, "CloudfrontStack", new StackProps() {
        Env = new Amazon.CDK.Environment() {
          Region = "us-east-2",
          Account = "239161478713"
        }
      });
      app.Synth();
    }
  }
}
