using Amazon.CDK;
using Amazon.CDK.AWS.DynamoDB;
using Amazon.CDK.AWS.Lambda;
using Amazon.CDK.AWS.Route53;
using Amazon.CDK.AWS.Route53.Targets;
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
      // APIGateway for apps-apis.pwrdrvr.com
      //

      // Create Custom Domain for apps-apis.pwrdrvr.com
      var certArn = "arn:aws:acm:us-east-2:***REMOVED***:certificate/533cdfa2-0528-484f-bd53-0a0d0dc6159c";
      var dn = new DomainName(this, "micro-apps-http-api-dn", new DomainNameProps {
        DomainName = "apps-apis.pwrdrvr.com",
        Certificate = Certificate.FromCertificateArn(this, "cert", certArn)
      });

      // Create APIGateway for apps-apis.pwrdrvr.com
      var httpApi = new HttpApi(this, "micro-apps-http-api", new HttpApiProps {
        // DefaultIntegration = subsvcintegration,
        DefaultDomainMapping = new DefaultDomainMappingOptions {
          DomainName = dn,
        },
        ApiName = "microapps-apis",
      });


      //
      // Create the api.pwrdrvr.com name
      //
      var zone = HostedZone.FromHostedZoneAttributes(this, "zone", new HostedZoneAttributes {
        ZoneName = "pwrdrvr.com",
        HostedZoneId = "ZHYNI9F572BBD"
      });

      var arecord = new ARecord(this, "ARecord", new ARecordProps {
        Zone = zone,
        RecordName = "apps-apis",
        Target = RecordTarget.FromAlias(new ApiGatewayv2Domain(dn))
      });


      //
      // Deployer Lambda Function
      //

      // Create Deployer Lambda Function
      var deployerFunc = new DockerImageFunction(this, "deployer-func", new DockerImageFunctionProps() {
        Code = DockerImageCode.FromEcr(props.ReposProps.RepoDeployer),
        FunctionName = "microapps-deployer",
        Timeout = Duration.Seconds(30),
      });
      var intDeployer = new LambdaProxyIntegration(new LambdaProxyIntegrationProps {
        Handler = deployerFunc,
      });
      httpApi.AddRoutes(new AddRoutesOptions {
        Path = "/deployer/{proxy+}",
        Methods = new[] { HttpMethod.ANY },
        Integration = intDeployer,
      });
      // Give the Deployer access to DynamoDB table
      table.GrantReadWriteData(deployerFunc);
      table.Grant(deployerFunc, "dynamodb:DescribeTable");


      //
      // Router Lambda Function
      //

      // TODO: Create Router Lambda Function

      // TODO: Add Last Route for /*/{proxy+}
      // Note: That might not work, may need a Behavior in CloudFront
      //       or a Lambda @ Edge function that detecgts these and routes
      //       to origin Lambda Router function.

      // TODO: Give the Router access to DynamoDB table
    }
  }
}