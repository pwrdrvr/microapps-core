import * as cdk from '@aws-cdk/core';
import * as ecr from '@aws-cdk/aws-ecr';

export interface IMicroAppsReposExports {
  repoDeployer: ecr.Repository;
  repoRouter: ecr.Repository;
}

export class MicroAppsRepos extends cdk.Stack implements IMicroAppsReposExports {
  private _repoDeployer: ecr.Repository;
  public get repoDeployer(): ecr.Repository {
    return this._repoDeployer;
  }
  private _repoRouter: ecr.Repository;
  public get repoRouter(): ecr.Repository {
    return this._repoRouter;
  }

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this._repoDeployer = new ecr.Repository(this, 'microapps-deployer', {});
    this._repoRouter = new ecr.Repository(this, 'microapps-router', {});
  }
}
