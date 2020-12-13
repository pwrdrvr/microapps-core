using Amazon.CDK;
using Amazon.CDK.RegionInfo;
using System;
using System.Collections.Generic;
using System.Linq;

namespace CDK {
  sealed class Program {
    public static void Main(string[] args) {
      var app = new App();

      // The CloudFront stack has to be created in us-east-2 because
      // the S3 bucket is there.
      new CloudfrontStack(app, "CloudfrontStack", new StackProps() {
        Env = new Amazon.CDK.Environment() {
          Region = "us-east-2",
          Account = "239161478713"
        }
      });
      new MicroApps(app, "MicroApps", new StackProps() {
        Env = new Amazon.CDK.Environment() {
          Region = "us-east-2",
          Account = "239161478713"
        }
      });
      app.Synth();
    }
  }
}
