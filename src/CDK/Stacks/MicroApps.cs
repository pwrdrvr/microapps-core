using Amazon.CDK;
using Amazon.CDK.AWS.DynamoDB;
using Amazon.CDK.AWS.Lambda;
using Amazon.CDK.AWS.S3;
using Amazon.CDK.AWS.APIGatewayv2;
using Amazon.CDK.AWS.APIGatewayv2.Integrations;
using Amazon.CDK.AWS.CertificateManager;

namespace CDK {
  public class MicroApps : Stack {
    internal MicroApps(Construct scope, string id, IStackProps props = null) : base(scope, id, props) {
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
        ApiName = "micro-apps-apis",
      });
      // var tssubsvcintegration = new LambdaProxyIntegration(new LambdaProxyIntegrationProps {
      //   Handler = tssubsvchandler
      // });

      // TODO: Update Default Behavior in CloudFront to point here


      //
      // Deployer Lambda Function
      //

      // Create Deployer Lambda Function
      var deployerImage = DockerImageCode.FromImageAsset("./src/PwrDrvr.MicroApps.Deployer", new AssetImageCodeProps() {
        // Exclude = new[] { "node_modules", "**/node_modules" },
        File = "Dockerfile",
        RepositoryName = "microapps-deployer",
      });
      var deployerFunc = new DockerImageFunction(this, "deployer-func", new DockerImageFunctionProps() {
        Code = deployerImage,
        FunctionName = "micro-apps-deployer-func",
        Timeout = Duration.Seconds(30),
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