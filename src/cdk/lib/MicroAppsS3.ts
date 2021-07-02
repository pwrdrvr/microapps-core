import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as cf from '@aws-cdk/aws-cloudfront';
import * as cforigins from '@aws-cdk/aws-cloudfront-origins';
import { TimeToLive } from '@cloudcomponents/cdk-temp-stack';
import { DeletableBucket } from '@cloudcomponents/cdk-deletable-bucket';
import SharedProps from './SharedProps';
import SharedTags from './SharedTags';

export interface IMicroAppsS3Exports {
  bucketApps: s3.IBucket;
  bucketAppsName: string;
  bucketAppsOAI: cf.OriginAccessIdentity;
  bucketAppsOrigin: cforigins.S3Origin;
  bucketAppsStaging: s3.IBucket;
  bucketAppsStagingName: string;
  bucketLogs: s3.IBucket;
}

interface IMicroAppsS3Props extends cdk.ResourceProps {
  local: {
    ttl: cdk.Duration;
  };
  shared: SharedProps;
}

export class MicroAppsS3 extends cdk.Resource implements IMicroAppsS3Exports {
  private _bucketApps: s3.IBucket;
  public get bucketApps(): s3.IBucket {
    return this._bucketApps;
  }

  private _bucketAppsName: string;
  public get bucketAppsName(): string {
    return this._bucketAppsName;
  }

  private _bucketAppsOAI: cf.OriginAccessIdentity;
  public get bucketAppsOAI(): cf.OriginAccessIdentity {
    return this._bucketAppsOAI;
  }

  private _bucketAppsOrigin: cforigins.S3Origin;
  public get bucketAppsOrigin(): cforigins.S3Origin {
    return this._bucketAppsOrigin;
  }

  private _bucketAppsStaging: s3.IBucket;
  public get bucketAppsStaging(): s3.IBucket {
    return this._bucketAppsStaging;
  }

  private _bucketAppsStagingName: string;
  public get bucketAppsStagingName(): string {
    return this._bucketAppsStagingName;
  }

  private _bucketLogs: s3.IBucket;
  public get bucketLogs(): s3.IBucket {
    return this._bucketLogs;
  }

  constructor(scope: cdk.Construct, id: string, props?: IMicroAppsS3Props) {
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

    // Use Auto-Delete S3Bucket for PRs
    this._bucketAppsName = `${shared.reverseDomainName}-${shared.stackName}${shared.envSuffix}${shared.prSuffix}`;
    this._bucketAppsStagingName = `${shared.reverseDomainName}-${shared.stackName}-staging${shared.envSuffix}${shared.prSuffix}`;
    if (!shared.isPR) {
      //
      // S3 Bucket for Logging - Usable by many stacks
      //
      this._bucketLogs = new s3.Bucket(this, 'microapps-logs', {
        bucketName: `${shared.reverseDomainName}-${shared.stackName}-logs${shared.envSuffix}${shared.prSuffix}`,
      });

      //
      // S3 Buckets for Apps
      //
      this._bucketApps = new s3.Bucket(this, 'microapps-apps', {
        bucketName: this._bucketAppsName,
      });
      this._bucketAppsStaging = new s3.Bucket(this, 'microapps-apps-staging', {
        bucketName: this._bucketAppsStagingName,
      });
    } else {
      //
      // PR - S3 Bucket for Logging - Usable by many stacks
      //
      this._bucketLogs = new DeletableBucket(this, 'microapps-logs', {
        bucketName: `${shared.reverseDomainName}-${shared.stackName}-logs${shared.envSuffix}${shared.prSuffix}`,
        autoDeleteObjects: true,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });

      //
      // PR - S3 Buckets for Apps
      //
      this._bucketApps = new DeletableBucket(this, 'microapps-apps', {
        bucketName: this._bucketAppsName,
        autoDeleteObjects: true,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });
      this._bucketAppsStaging = new DeletableBucket(this, 'microapps-apps-staging', {
        bucketName: this._bucketAppsStagingName,
        autoDeleteObjects: true,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });
    }

    // Create S3 Origin Identity
    this._bucketAppsOAI = new cf.OriginAccessIdentity(this, 'microapps-oai', {
      comment: `${shared.stackName}${shared.envSuffix}${shared.prSuffix}`,
    });
    if (shared.isPR) {
      this._bucketAppsOAI.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    }

    //
    // Add Origins
    //
    this._bucketAppsOrigin = new cforigins.S3Origin(this._bucketApps, {
      originAccessIdentity: this.bucketAppsOAI,
    });
  }
}
