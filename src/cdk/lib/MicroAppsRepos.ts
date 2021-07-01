import * as cdk from '@aws-cdk/core';
import * as ecr from '@aws-cdk/aws-ecr';
import SharedProps from './SharedProps';
import SharedTags from './SharedTags';
import { RemovalPolicy } from '@aws-cdk/core';
import { ImageRepository } from '@cloudcomponents/cdk-container-registry';

interface IMicroAppsReposProps extends cdk.StackProps {
  local: {
    // None yet
  };
  shared: SharedProps;
}

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

  constructor(scope: cdk.Construct, id: string, props?: IMicroAppsReposProps) {
    super(scope, id, props);

    if (props === undefined) {
      throw new Error('props must be set');
    }

    const { shared } = props;

    SharedTags.addEnvTag(this, shared.env, shared.isPR);
    if (!shared.isPR) {
      this._repoDeployer = new ecr.Repository(this, 'microapps-deployer', {
        repositoryName: `${shared.stackName}-deployer${shared.envSuffix}${shared.prSuffix}`,
      });
      this._repoDeployer.applyRemovalPolicy(RemovalPolicy.DESTROY);
      this._repoRouter = new ecr.Repository(this, 'microapps-router', {
        repositoryName: `${shared.stackName}-router${shared.envSuffix}${shared.prSuffix}`,
      });
      this._repoRouter.applyRemovalPolicy(RemovalPolicy.DESTROY);
    } else {
      // PRs - Delete the repos and images in them on stack destroy
      this._repoDeployer = new ImageRepository(this, 'microapps-deployer', {
        repositoryName: `${shared.stackName}-deployer${shared.envSuffix}${shared.prSuffix}`,
        removalPolicy: RemovalPolicy.DESTROY,
        forceDelete: true,
      });
      this._repoRouter = new ImageRepository(this, 'microapps-router', {
        repositoryName: `${shared.stackName}-router${shared.envSuffix}${shared.prSuffix}`,
        removalPolicy: RemovalPolicy.DESTROY,
        forceDelete: true,
      });
    }
  }
}
