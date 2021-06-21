import * as cdk from '@aws-cdk/core';
import * as ecr from '@aws-cdk/aws-ecr';

export interface IMicroAppsReposExports {
  RepoDeployer: ecr.Repository;
  RepoRouter: ecr.Repository;
}

export class MicroAppsRepos extends cdk.Stack implements IMicroAppsReposExports {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.RepoDeployer = new ecr.Repository(this, 'microapps-deployer', {});
    this.RepoRouter = new ecr.Repository(this, 'microapps-router', {});
  }
  RepoDeployer: ecr.Repository;
  RepoRouter: ecr.Repository;
}
