using Amazon.CDK;
using Amazon.CDK.AWS.DynamoDB;
using Amazon.CDK.AWS.Lambda;

namespace CDK {
  public interface IReleaseAppStackProps : IStackProps {
    IReposProps ReposProps { get; set; }
  }

  public class ReleaseAppStackProps : StackProps, IReleaseAppStackProps {
    public ReleaseAppStackProps()
      : base() {
    }

    public IReposProps ReposProps { get; set; }
  }

  public class ReleaseApp : Stack {
    internal ReleaseApp(Construct scope, string id, IReleaseAppStackProps props = null) : base(scope, id, props) {
      var table = Table.FromTableName(this, "table", "MicroApps");

      // Add a tag indicating this app can be managed by the
      // MicroApp Deployer Lambda function
      Tags.SetTag("microapp-managed", "true");

      //
      // Release Lambda Function
      //

      // Create Release Lambda Function
      var releaseFunc = new DockerImageFunction(this, "release-func", new DockerImageFunctionProps() {
        Code = DockerImageCode.FromEcr(props.ReposProps.RepoReleaseApp),
        FunctionName = "microapps-release",
        Timeout = Duration.Seconds(30),
      });
      // Give the ReleaseApp access to DynamoDB table
      table.GrantReadWriteData(releaseFunc);
      table.Grant(releaseFunc, "dynamodb:DescribeTable");

      // Note: The Integration will be created by the Deployer app
    }
  }
}