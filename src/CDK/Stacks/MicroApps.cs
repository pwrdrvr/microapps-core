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
      // 
      //
    }
  }
}