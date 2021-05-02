import * as cdk from '@aws-cdk/core';
import * as ecr from '@aws-cdk/aws-ecr';

export interface IReposExports {
  RepoDeployer: ecr.Repository;
  RepoRouter: ecr.Repository;
}

export class Repos extends cdk.Stack implements IReposExports {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    this.RepoDeployer = new ecr.Repository(this, 'repoDeployer', {
      repositoryName: 'microapps-deployer',
    });
    this.RepoRouter = new ecr.Repository(this, 'repoRouter', {
      repositoryName: 'microapps-router',
    });
  }
  RepoDeployer: ecr.Repository;
  RepoRouter: ecr.Repository;
}
