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
using System.Collections.Generic;

namespace CDK {
  public interface IMicroAppsStackProps : IStackProps {
    IReposExports ReposExports { get; set; }
    ICloudfrontStackExports CFStackExports { get; set; }
  }

  public class MicroAppsStackProps : StackProps, IMicroAppsStackProps {
    public MicroAppsStackProps()
      : base() {
    }

    public IReposExports ReposExports { get; set; }
    public ICloudfrontStackExports CFStackExports { get; set; }
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
      var bucketApps = Bucket.FromBucketName(this, "bucket", "pwrdrvr-apps");
      var bucketStaging = Bucket.FromBucketName(this, "bucketStaging", "pwrdrvr-apps-staging");

      // Deny apps from reading:
      // - If they are missing the microapp-name tag
      // - Anything outside of the folder that matches their microapp-name tag
      var policyDenyPrefixOutsideTag = new PolicyStatement(new PolicyStatementProps() {
        Sid = "deny-prefix-outside-microapp-name-tag",
        Effect = Effect.DENY,
        Actions = new[] { "s3:*" },
        NotPrincipals = new IPrincipal[] {
          new CanonicalUserPrincipal(props.CFStackExports.CloudFrontOAI.CloudFrontOriginAccessIdentityS3CanonicalUserId),
          new AccountRootPrincipal(),
          new ArnPrincipal(string.Format("arn:aws:iam::{0}:role/AdminAccess", props.Env.Account))
          },
        NotResources = new[] {
          string.Format("{0}/${{aws:PrincipalTag/microapp-name}}/*",bucketApps.BucketArn),
          bucketApps.BucketArn,
        },
        Conditions = new Dictionary<string, object>() {
          {
            "Null", new Dictionary<string, string>() {
              { "aws:PrincipalTag/microapp-name", "false" },
            }
          }
        }
      });
      var policyDenyMissingTag = new PolicyStatement(new PolicyStatementProps() {
        Sid = "deny-missing-microapp-name-tag",
        Effect = Effect.DENY,
        Actions = new[] { "s3:*" },
        NotPrincipals = new IPrincipal[] {
          new CanonicalUserPrincipal(props.CFStackExports.CloudFrontOAI.CloudFrontOriginAccessIdentityS3CanonicalUserId),
          new AccountRootPrincipal(),
          new ArnPrincipal(string.Format("arn:aws:iam::{0}:role/AdminAccess", props.Env.Account))
          },
        Resources = new[] {
          string.Format("{0}/*",bucketApps.BucketArn),
          bucketApps.BucketArn,
        },
        Conditions = new Dictionary<string, object>() {
          {
            "Null", new Dictionary<string, string>() {
              { "aws:PrincipalTag/microapp-name", "true" },
            }
          }
        }
      });

      if (bucketApps.Policy == null) {
        var bpolicy = new BucketPolicy(this, "CFPolicy", new BucketPolicyProps() {
          Bucket = bucketApps
        });
        bpolicy.Document.AddStatements(policyDenyPrefixOutsideTag);
        bpolicy.Document.AddStatements(policyDenyMissingTag);
      } else {
        bucketApps.Policy.Document.AddStatements(policyDenyPrefixOutsideTag);
        bucketApps.Policy.Document.AddStatements(policyDenyMissingTag);
      }


      //
      // Deployer Lambda Function
      //

      // Create Deployer Lambda Function
      var deployerFunc = new DockerImageFunction(this, "deployer-func", new DockerImageFunctionProps() {
        Code = DockerImageCode.FromEcr(props.ReposExports.RepoDeployer),
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
          string.Format("{0}/*", bucketApps.BucketArn),
          bucketApps.BucketArn
        }
      });
      deployerFunc.AddToRolePolicy(policyReadWriteListTarget);


      //
      // Router Lambda Function
      //

      // Create Router Lambda Function
      var routerFunc = new DockerImageFunction(this, "router-func", new DockerImageFunctionProps() {
        Code = DockerImageCode.FromEcr(props.ReposExports.RepoRouter),
        FunctionName = "microapps-router",
        Timeout = Duration.Seconds(30),
      });
      var policyReadTarget = new PolicyStatement(new PolicyStatementProps() {
        Effect = Effect.ALLOW,
        Actions = new[] { "s3:GetObject" },
        Resources = new[] {
          string.Format("{0}/*", bucketApps.BucketArn)
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
      // APIGateway for appsapis.pwrdrvr.com
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
      // Create the appsapis.pwrdrvr.com name
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


      //
      // Give Deployer permissions to create routes and integrations
      // on the API Gateway API.
      //

      // Grant the ability to List all APIs (we have to find it)
      var policyAPIList = new PolicyStatement(new PolicyStatementProps() {
        Effect = Effect.ALLOW,
        Actions = new[] { "apigateway:GET" },
        Resources = new[] {
          string.Format("arn:aws:apigateway:{0}::/apis", this.Region),
        }
      });
      deployerFunc.AddToRolePolicy(policyAPIList);
      // Grant full control over the API we created
      var policyAPIManage = new PolicyStatement(new PolicyStatementProps() {
        Effect = Effect.ALLOW,
        Actions = new[] { "apigateway:*" },
        Resources = new[] {
          string.Format("arn:aws:apigateway:{0}:{1}:{2}/*", this.Region, this.Account, httpApi.HttpApiId),
          string.Format("arn:aws:apigateway:{0}::/apis/{1}/integrations", this.Region, httpApi.HttpApiId),
          string.Format("arn:aws:apigateway:{0}::/apis/{1}/routes", this.Region, httpApi.HttpApiId),
        }
      });
      deployerFunc.AddToRolePolicy(policyAPIManage);
      // Grant full control over lambdas that indicate they are microapps
      var policyAPIManageLambdas = new PolicyStatement(new PolicyStatementProps() {
        Effect = Effect.ALLOW,
        Actions = new[] { "lambda:*" },
        Resources = new[] {
          string.Format("arn:aws:lambda:{0}:{1}:function:*", this.Region, this.Account),
          string.Format("arn:aws:lambda:{0}:{1}:function:*:*", this.Region, this.Account),
        },
        Conditions = new Dictionary<string, object>() {
          {
            "StringEqualsIfExists", new Dictionary<string, string>() {
              { "aws:ResourceTag/microapp-managed", "true" },
            }
          }
        }
      });
      deployerFunc.AddToRolePolicy(policyAPIManageLambdas);
    }
  }
}