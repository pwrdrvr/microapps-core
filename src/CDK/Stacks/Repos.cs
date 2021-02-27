using Amazon.CDK;
using Amazon.CDK.AWS.ECR;

namespace CDK {
  public interface IReposExports {
    IRepository RepoDeployer { get; set; }
    IRepository RepoRouter { get; set; }
    IRepository RepoReleaseApp { get; set; }
  }

  public class Repos : Stack, IReposExports {
    public IRepository RepoDeployer { get; set; }
    public IRepository RepoRouter { get; set; }
    public IRepository RepoReleaseApp { get; set; }

    public Repos(Construct parent, string id, IStackProps props) : base(parent, id, props) {
      //
      // Create new repositories
      // Note: these are in a distinct stack because they have to be
      // created and push'd to before a Lambda function referencing
      // them can be created.
      //
      RepoDeployer = new Repository(this, "repoDeployer", new RepositoryProps {
        RepositoryName = "microapps-deployer",
      });
      RepoRouter = new Repository(this, "repoRouter", new RepositoryProps {
        RepositoryName = "microapps-router",
      });
      RepoReleaseApp = new Repository(this, "repoRelease", new RepositoryProps {
        RepositoryName = "microapps-release",
      });
    }
  }
}