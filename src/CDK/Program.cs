﻿using Amazon.CDK;

namespace CDK {
  sealed class Program {
    public static void Main(string[] args) {
      var app = new App();

      // The CloudFront stack has to be created in us-east-2 because
      // the S3 bucket is there.
      var cfStack = new CloudfrontStack(app, "CloudfrontStack", new StackProps() {
        Env = new Amazon.CDK.Environment() {
          Region = "us-east-2",
          Account = "***REMOVED***"
        }
      });
      var repos = new Repos(app, "Repos", new StackProps() {
        Env = new Amazon.CDK.Environment() {
          Region = "us-east-2",
          Account = "***REMOVED***"
        }
      });
      new MicroApps(app, "MicroApps", new MicroAppsStackProps() {
        Env = new Amazon.CDK.Environment() {
          Region = "us-east-2",
          Account = "***REMOVED***"
        },
        ReposExports = repos,
        CFStackExports = cfStack,
      });
      new ReleaseApp(app, "ReleaseApp", new ReleaseAppStackProps() {
        Env = new Amazon.CDK.Environment() {
          Region = "us-east-2",
          Account = "***REMOVED***"
        },
        ReposExports = repos,
      });
      app.Synth();
    }
  }
}
