using Amazon.CDK;
using Amazon.CDK.AWS.CloudFront;
using Amazon.CDK.AWS.CertificateManager;
using Amazon.CDK.AWS.CloudFront.Origins;
using Amazon.CDK.AWS.S3;
using Amazon.CDK.AWS.Route53;
using Amazon.CDK.AWS.Route53.Targets;
using Amazon.JSII.JsonModel.Spec;
using System.Net.Cache;
using System;

namespace Cloudfront
{
  public class CloudfrontStack : Stack
  {
    internal CloudfrontStack(Construct scope, string id, IStackProps props = null) : base(scope, id, props)
    {
      //
      // CloudFront Distro
      //
      var cfdistro = new Distribution(this, "cloudfront", new DistributionProps()
      {
        DomainNames = new[] { "apps.pwrdrvr.com" },
        Certificate = Certificate.FromCertificateArn(this, "splat.pwrdrvr.com", "arn:aws:acm:us-east-1:***REMOVED***:certificate/e2434943-4295-4514-8f83-eeef556d8d09"),
        HttpVersion = HttpVersion.HTTP2,
        DefaultBehavior = new BehaviorOptions()
        {
          ViewerProtocolPolicy = ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          AllowedMethods = AllowedMethods.ALLOW_ALL,
          CachePolicy = CachePolicy.CACHING_DISABLED,
          OriginRequestPolicy = new OriginRequestPolicy(this, "apiPolicy", new OriginRequestPolicyProps()
          {
            CookieBehavior = OriginRequestCookieBehavior.All(),
            HeaderBehavior = OriginRequestHeaderBehavior.All(),
            QueryStringBehavior = OriginRequestQueryStringBehavior.All(),
          }),
          Origin = new HttpOrigin("apps-origin.pwrdrvr.com", new HttpOriginProps()
          {
            ProtocolPolicy = OriginProtocolPolicy.HTTPS_ONLY,
            OriginSslProtocols = new[] { OriginSslPolicy.TLS_V1_2 },
          }),
        },
        EnableIpv6 = true,
        PriceClass = PriceClass.PRICE_CLASS_100,
      });

      //
      // Add Origins
      //
      var statics3 = new S3Origin(Bucket.FromBucketName(this, "staticbucket", "pwrdrvr-apps"));

      //
      // Add Behaviors
      //
      cfdistro.AddBehavior("*.*", statics3, new AddBehaviorOptions()
      {
        CachePolicy = CachePolicy.CACHING_OPTIMIZED,
        AllowedMethods = AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        ViewerProtocolPolicy = ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        OriginRequestPolicy = new OriginRequestPolicy(this, "staticPolicy", new OriginRequestPolicyProps()
        {
          CookieBehavior = OriginRequestCookieBehavior.All(),
          HeaderBehavior = OriginRequestHeaderBehavior.All(),
          QueryStringBehavior = OriginRequestQueryStringBehavior.All(),
        }),
      });

      //
      // Route53 - Point apps.pwrdrvr.com at this distro
      //

      var hzonePwrDrvrCom = HostedZone.FromLookup(this, "hzonePwrDrvrCom", new HostedZoneProviderProps(){
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
