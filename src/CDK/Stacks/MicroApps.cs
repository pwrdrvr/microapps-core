using Amazon.CDK;
using Amazon.CDK.AWS.DynamoDB;

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
      // APIGateway for apps-apis.pwrdrvr.com
      //

      // TODO: Create APIGateway for apps-apis.pwrdrvr.com

      // TODO: Create Custom Domain for apps-apis.pwrdrvr.com

      // TODO: Update Default Behavior in CloudFront to point here


      //
      // Deployer Lambda Function
      //

      // TODO: Create Deployer Lambda Function

      // TODO: Give the Deployer access to DynamoDB table


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