using Amazon.CDK;
using Amazon.CDK.AWS.CloudFront;
using Amazon.CDK.AWS.CertificateManager;
using Amazon.CDK.AWS.CloudFront.Origins;
using Amazon.CDK.AWS.IAM;
using Amazon.CDK.AWS.S3;
using Amazon.CDK.AWS.Route53;
using Amazon.CDK.AWS.Route53.Targets;

namespace CDK {
  public interface ICloudfrontStackExports {
    OriginAccessIdentity CloudFrontOAI { get; set; }
  }

  public class CloudfrontStack : Stack, ICloudfrontStackExports {
    internal CloudfrontStack(Construct scope, string id, IStackProps props = null) : base(scope, id, props) {
      //
      // S3 Bucket for Logging - Usable by many stacks
      //

      var bucketLogs = new Bucket(this, "logsBucket", new BucketProps() {
        BucketName = "pwrdrvr-logs",
      });

      //
      // CloudFront Distro
      //
      var apiGwyOrigin = new HttpOrigin("appsapis.pwrdrvr.com", new HttpOriginProps() {
        ProtocolPolicy = OriginProtocolPolicy.HTTPS_ONLY,
        OriginSslProtocols = new[] { OriginSslPolicy.TLS_V1_2 },
      });
      var cfdistro = new Distribution(this, "cloudfront", new DistributionProps() {
        DomainNames = new[] { "apps.pwrdrvr.com" },
        Certificate = Certificate.FromCertificateArn(this, "splat.pwrdrvr.com", "arn:aws:acm:us-east-1:***REMOVED***:certificate/e2434943-4295-4514-8f83-eeef556d8d09"),
        HttpVersion = HttpVersion.HTTP2,
        DefaultBehavior = new BehaviorOptions() {
          AllowedMethods = AllowedMethods.ALLOW_ALL,
          CachePolicy = CachePolicy.CACHING_DISABLED,
          Compress = true,
          OriginRequestPolicy = OriginRequestPolicy.ALL_VIEWER,
          Origin = apiGwyOrigin,
          ViewerProtocolPolicy = ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
        EnableIpv6 = true,
        PriceClass = PriceClass.PRICE_CLASS_100,
        EnableLogging = true,
        LogBucket = bucketLogs,
        LogFilePrefix = "com.pwrdrvr.apps/cloudfront-raw/"
      });

      // Create S3 Origin Identity
      var bucketApps = Bucket.FromBucketName(this, "staticbucket", "pwrdrvr-apps");
      this.CloudFrontOAI = new OriginAccessIdentity(this, "staticAccessIdentity", new OriginAccessIdentityProps() {
        Comment = "cloudfront-access"
      });

      // // Explicitly add Bucket Policy 
      // var policyStatement = new PolicyStatement();
      // policyStatement.AddActions("s3:GetBucket*");
      // policyStatement.AddActions("s3:GetObject*");
      // policyStatement.AddActions("s3:List*");
      // // policyStatement.AddActions(bucket.BucketArn);
      // policyStatement.AddResources(string.Format("{0}/*", bucket.BucketArn));
      // policyStatement.AddCanonicalUserPrincipal(OAI.CloudFrontOriginAccessIdentityS3CanonicalUserId);


      // Allow CloudFront to read from the static assets bucket
      var policyStatement = new PolicyStatement(new PolicyStatementProps() {
        Effect = Effect.ALLOW,
        Actions = new[] { "s3:GetObject" },
        Principals = new[] { new CanonicalUserPrincipal(this.CloudFrontOAI.CloudFrontOriginAccessIdentityS3CanonicalUserId) },
        Resources = new[] {
          string.Format("{0}/*", bucketApps.BucketArn)
        }
      });


      if (bucketApps.Policy == null) {
        new BucketPolicy(this, "CFPolicy", new BucketPolicyProps() {
          Bucket = bucketApps
        }).Document.AddStatements(policyStatement);
      } else {
        bucketApps.Policy.Document.AddStatements(policyStatement);
      }

      //
      // Add Origins
      //
      var statics3 = new S3Origin(bucketApps,
        new S3OriginProps() {
          OriginAccessIdentity = this.CloudFrontOAI
        });
      // var statics3 = new S3Origin(new Bucket(this, "pwrdrvr-microapps", new BucketProps() {

      //
      // Add Behaviors
      //
      var apiGwyBehavior = new AddBehaviorOptions() {
        AllowedMethods = AllowedMethods.ALLOW_ALL,
        CachePolicy = CachePolicy.CACHING_DISABLED,
        Compress = true,
        OriginRequestPolicy = OriginRequestPolicy.ALL_VIEWER,
        ViewerProtocolPolicy = ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      };
      var s3Behavior = new AddBehaviorOptions() {
        AllowedMethods = AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        CachePolicy = CachePolicy.CACHING_OPTIMIZED,
        Compress = true,
        OriginRequestPolicy = OriginRequestPolicy.CORS_S3_ORIGIN,
        ViewerProtocolPolicy = ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      };
      var apiGwyVersionRootBehavior = new AddBehaviorOptions() {
        AllowedMethods = AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        CachePolicy = CachePolicy.CACHING_OPTIMIZED,
        Compress = true,
        ViewerProtocolPolicy = ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      };

      //
      // Setup Routes
      // Pull to the API first, then pull to S3 if it contains /static/
      // Pull anything under /appName/x.y.z/ folder with '.' in file name to S3
      // Let everything else fall through to the API Gateway
      //
      cfdistro.AddBehavior("/deployer/*", apiGwyOrigin, apiGwyBehavior);
      cfdistro.AddBehavior("/*/*/api/*", apiGwyOrigin, apiGwyBehavior);
      cfdistro.AddBehavior("/*/*/static/*", statics3, s3Behavior);
      cfdistro.AddBehavior("/*/*/*.*", statics3, s3Behavior);
      cfdistro.AddBehavior("/*/*/", apiGwyOrigin, apiGwyVersionRootBehavior);

      //
      // Route53 - Point apps.pwrdrvr.com at this distro
      //

      var hzonePwrDrvrCom = HostedZone.FromLookup(this, "hzonePwrDrvrCom", new HostedZoneProviderProps() {
        DomainName = "pwrdrvr.com",
      });
      var rrAppsPwrDrvrCom = new RecordSet(this, "appspwrdrvrcom", new RecordSetProps() {
        RecordName = "apps.pwrdrvr.com",
        RecordType = RecordType.A,
        Target = new RecordTarget(null, new CloudFrontTarget(cfdistro)),
        Zone = hzonePwrDrvrCom,
      });
    }

    public OriginAccessIdentity CloudFrontOAI { get; set; }
  }
}
