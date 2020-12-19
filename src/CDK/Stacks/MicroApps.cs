using Amazon.CDK;
using Amazon.CDK.AWS.DynamoDB;
using Amazon.CDK.AWS.Lambda;
using Amazon.CDK.AWS.Route53;
using Amazon.CDK.AWS.Route53.Targets;
using Amazon.CDK.AWS.IAM;
using Amazon.CDK.AWS.S3;
using Amazon.CDK.AWS.APIGatewayv2;
using Amazon.CDK.AWS.APIGatewayv2.Integrations;
using Amazon.CDK.AWS.CertificateManager;

namespace CDK {
  public interface IMicroAppsStackProps : IStackProps {
    IReposProps ReposProps { get; set; }
  }

  public class MicroAppsStackProps : StackProps, IMicroAppsStackProps {
    public MicroAppsStackProps()
      : base() {
    }

    public IReposProps ReposProps { get; set; }
  }

  public class MicroApps : Stack {
    internal MicroApps(Construct scope, string id, IMicroAppsStackProps props = null) : base(scope, id, props) {
      //
      // DynamoDB Table
      //
      var table = new Table(this, "table", new TableProps {
        TableName = "MicroApps",
        BillingMode = BillingMode.PAY_PER_REQUEST,
        PartitionKey = new Attribute {
          Name = "PK",
          Type = AttributeType.STRING
        },
        SortKey = new Attribute {
          Name = "SK",
          Type = AttributeType.STRING
        }
      });


      //
      // Import S3 Buckets
      //
      var bucket = Bucket.FromBucketName(this, "bucket", "pwrdrvr-apps");
      var bucketStaging = Bucket.FromBucketName(this, "bucketStaging", "pwrdrvr-apps-staging");





      //
      // Deployer Lambda Function
      //

      // Create Deployer Lambda Function
      var deployerFunc = new DockerImageFunction(this, "deployer-func", new DockerImageFunctionProps() {
        Code = DockerImageCode.FromEcr(props.ReposProps.RepoDeployer),
        FunctionName = "microapps-deployer",
        Timeout = Duration.Seconds(30),
      });
      // Give the Deployer access to DynamoDB table
      table.GrantReadWriteData(deployerFunc);
      table.Grant(deployerFunc, "dynamodb:DescribeTable");

      // Allow the Lambda to read from the staging bucket
      var policyReadListStaging = new PolicyStatement(new PolicyStatementProps() {
        Effect = Effect.ALLOW,
        Actions = new[] { "s3:GetObject", "s3:ListBucket" },
        // Principals = new[] { deployerFunc.GrantPrincipal },
        Resources = new[] {
          string.Format("{0}/*", bucketStaging.BucketArn),
          bucketStaging.BucketArn
        }
      });
      deployerFunc.AddToRolePolicy(policyReadListStaging);

      // Allow the Lambda to write to the target bucket
      var policyReadWriteListTarget = new PolicyStatement(new PolicyStatementProps() {
        Effect = Effect.ALLOW,
        Actions = new[] { "s3:GetObject", "s3:PutObject", "s3:ListBucket" },
        // Principals = new[] { deployerFunc.GrantPrincipal },
        Resources = new[] {
          string.Format("{0}/*", bucket.BucketArn),
          bucket.BucketArn
        }
      });
      deployerFunc.AddToRolePolicy(policyReadWriteListTarget);

      //
      // Router Lambda Function
      //

      // Create Router Lambda Function
      var routerFunc = new DockerImageFunction(this, "router-func", new DockerImageFunctionProps() {
        Code = DockerImageCode.FromEcr(props.ReposProps.RepoRouter),
        FunctionName = "microapps-router",
        Timeout = Duration.Seconds(30),
      });
      var policyReadTarget = new PolicyStatement(new PolicyStatementProps() {
        Effect = Effect.ALLOW,
        Actions = new[] { "s3:GetObject" },
        Resources = new[] {
          string.Format("{0}/*", bucket.BucketArn)
        }
      });
      routerFunc.AddToRolePolicy(policyReadTarget);
      // Give the Router access to DynamoDB table
      table.GrantReadData(routerFunc);
      table.Grant(routerFunc, "dynamodb:DescribeTable");

      // TODO: Add Last Route for /*/{proxy+}
      // Note: That might not work, may need a Behavior in CloudFront
      //       or a Lambda @ Edge function that detecgts these and routes
      //       to origin Lambda Router function.



      //
      // APIGateway for apps-apis.pwrdrvr.com
      //

      // Import certificate
      var certArn = "arn:aws:acm:us-east-2:***REMOVED***:certificate/533cdfa2-0528-484f-bd53-0a0d0dc6159c";
      var cert = Certificate.FromCertificateArn(this, "cert", certArn);

      // Create Custom Domains for API Gateway
      var dnApps = new DomainName(this, "micro-apps-http-api-dn", new DomainNameProps {
        DomainName = "apps.pwrdrvr.com",
        Certificate = cert,
      });
      var dnAppsApis = new DomainName(this, "micro-apps-http-apps-api-dn", new DomainNameProps {
        DomainName = "appsapis.pwrdrvr.com",
        Certificate = cert,
      });

      // Create an integration for the Router
      // Do this here since it's the default route
      var intRouter = new LambdaProxyIntegration(new LambdaProxyIntegrationProps {
        Handler = routerFunc,
      });

      // Create APIGateway for apps-apis.pwrdrvr.com
      var httpApiDomainMapping = new DefaultDomainMappingOptions {
        DomainName = dnApps,
      };
      var httpApi = new HttpApi(this, "micro-apps-http-api", new HttpApiProps {
        DefaultDomainMapping = httpApiDomainMapping,
        DefaultIntegration = intRouter,
        ApiName = "microapps-apis",
      });


      //
      // Add a route to the Deployer function
      //
      var intDeployer = new LambdaProxyIntegration(new LambdaProxyIntegrationProps {
        Handler = deployerFunc,
      });
      httpApi.AddRoutes(new AddRoutesOptions {
        Path = "/deployer/{proxy+}",
        Methods = new[] { HttpMethod.ANY },
        Integration = intDeployer,
      });


      //
      // Let API Gateway accept request at apps-apis.pwrdrvr.com
      // That is the origin URI that CloudFront uses for this gateway.
      // The gateway will refuse the traffic if it doesn't have the
      // domain name registered.
      //
      var mappingAppsApis = new HttpApiMapping(this, "apps-apis-mapping", new HttpApiMappingProps() {
        Api = httpApi,
        DomainName = dnAppsApis,
      });
      mappingAppsApis.Node.AddDependency(dnAppsApis);


      //
      // Create the apps-apis.pwrdrvr.com name
      //
      var zone = HostedZone.FromHostedZoneAttributes(this, "zone", new HostedZoneAttributes {
        ZoneName = "pwrdrvr.com",
        HostedZoneId = "ZHYNI9F572BBD"
      });

      var arecord = new ARecord(this, "ARecord", new ARecordProps {
        Zone = zone,
        RecordName = "appsapis",
        Target = RecordTarget.FromAlias(new ApiGatewayv2Domain(dnAppsApis))
      });
    }
  }
}