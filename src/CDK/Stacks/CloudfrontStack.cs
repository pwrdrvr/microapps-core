using Amazon.CDK;
using Amazon.CDK.AWS.CloudFront;
using Amazon.CDK.AWS.CertificateManager;
using Amazon.CDK.AWS.CloudFront.Origins;
using Amazon.CDK.AWS.IAM;
using Amazon.CDK.AWS.S3;
using Amazon.CDK.AWS.Route53;
using Amazon.CDK.AWS.Route53.Targets;

namespace CDK {
  public class CloudfrontStack : Stack {
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
      var cfdistro = new Distribution(this, "cloudfront", new DistributionProps() {
        DomainNames = new[] { "apps.pwrdrvr.com" },
        Certificate = Certificate.FromCertificateArn(this, "splat.pwrdrvr.com", "arn:aws:acm:us-east-1:***REMOVED***:certificate/e2434943-4295-4514-8f83-eeef556d8d09"),
        HttpVersion = HttpVersion.HTTP2,
        DefaultBehavior = new BehaviorOptions() {
          ViewerProtocolPolicy = ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          AllowedMethods = AllowedMethods.ALLOW_ALL,
          CachePolicy = CachePolicy.CACHING_DISABLED,
          OriginRequestPolicy = new OriginRequestPolicy(this, "apiPolicy", new OriginRequestPolicyProps() {
            CookieBehavior = OriginRequestCookieBehavior.All(),
            HeaderBehavior = OriginRequestHeaderBehavior.All(),
            QueryStringBehavior = OriginRequestQueryStringBehavior.All(),
          }),
          Origin = new HttpOrigin("apps-origin.pwrdrvr.com", new HttpOriginProps() {
            ProtocolPolicy = OriginProtocolPolicy.HTTPS_ONLY,
            OriginSslProtocols = new[] { OriginSslPolicy.TLS_V1_2 },
          }),
        },
        EnableIpv6 = true,
        PriceClass = PriceClass.PRICE_CLASS_100,
        EnableLogging = true,
        LogBucket = bucketLogs,
        LogFilePrefix = "com.pwrdrvr.apps/cloudfront-raw/"
      });

      // Create S3 Origin Identity
      var bucket = Bucket.FromBucketName(this, "staticbucket", "pwrdrvr-apps");
      var OAI = new OriginAccessIdentity(this, "staticAccessIdentity", new OriginAccessIdentityProps() {
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

      var policyStatement = new PolicyStatement(new PolicyStatementProps() {
        Effect = Effect.ALLOW,
        Actions = new[] { "s3:GetObject" },
        Principals = new[] { new CanonicalUserPrincipal(OAI.CloudFrontOriginAccessIdentityS3CanonicalUserId) },
        Resources = new[] {
          string.Format("{0}/*", bucket.BucketArn)
        }
      });


      if (bucket.Policy == null) {
        new BucketPolicy(this, "CFPolicy", new BucketPolicyProps() {
          Bucket = bucket
        }).Document.AddStatements(policyStatement);
      } else {
        bucket.Policy.Document.AddStatements(policyStatement);
      }

      //
      // Add Origins
      //
      var statics3 = new S3Origin(bucket,
        new S3OriginProps() {
          OriginAccessIdentity = OAI
        });
      // var statics3 = new S3Origin(new Bucket(this, "pwrdrvr-microapps", new BucketProps() {

      //
      // Add Behaviors
      //
      var s3Behavior = new AddBehaviorOptions() {
        CachePolicy = CachePolicy.CACHING_OPTIMIZED,
        AllowedMethods = AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        ViewerProtocolPolicy = ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        OriginRequestPolicy = OriginRequestPolicy.CORS_S3_ORIGIN,
      };
      cfdistro.AddBehavior("*.*", statics3, s3Behavior);

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
  }
}
