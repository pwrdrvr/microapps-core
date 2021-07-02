import * as cdk from '@aws-cdk/core';
import * as ecr from '@aws-cdk/aws-ecr';
import { TimeToLive } from '@cloudcomponents/cdk-temp-stack';
import { ImageRepository } from '@cloudcomponents/cdk-container-registry';
import SharedProps from './SharedProps';
import SharedTags from './SharedTags';

interface IMicroAppsReposProps extends cdk.StackProps {
  local: {
    ttl: cdk.Duration;
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
    const { ttl } = props.local;

    // Set stack to delete if this is a PR build
    if (shared.isPR) {
      new TimeToLive(this, 'TimeToLive', {
        ttl,
      });
    }

    SharedTags.addEnvTag(this, shared.env, shared.isPR);
    if (!shared.isPR) {
      this._repoDeployer = new ecr.Repository(this, 'microapps-deployer', {
        repositoryName: `${shared.stackName}-deployer${shared.envSuffix}${shared.prSuffix}`,
      });
      this._repoDeployer.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
      this._repoRouter = new ecr.Repository(this, 'microapps-router', {
        repositoryName: `${shared.stackName}-router${shared.envSuffix}${shared.prSuffix}`,
      });
      this._repoRouter.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    } else {
      // PRs - Delete the repos and images in them on stack destroy
      this._repoDeployer = new ImageRepository(this, 'microapps-deployer', {
        repositoryName: `${shared.stackName}-deployer${shared.envSuffix}${shared.prSuffix}`,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        forceDelete: true,
      });
      this._repoRouter = new ImageRepository(this, 'microapps-router', {
        repositoryName: `${shared.stackName}-router${shared.envSuffix}${shared.prSuffix}`,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        forceDelete: true,
      });
    }
  }
}
