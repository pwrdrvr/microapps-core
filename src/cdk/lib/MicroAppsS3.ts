import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import { TimeToLive } from '@cloudcomponents/cdk-temp-stack';
import { DeletableBucket } from '@cloudcomponents/cdk-deletable-bucket';
import SharedProps from './SharedProps';
import SharedTags from './SharedTags';

export interface IMicroAppsS3Exports {
  bucketApps: s3.IBucket;
  bucketAppsName: string;
  bucketAppsStaging: s3.IBucket;
  bucketAppsStagingName: string;
  bucketLogs: s3.IBucket;
}

interface IMicroAppsS3Props extends cdk.StackProps {
  local: {
    ttl: cdk.Duration;
  };
  shared: SharedProps;
}

export class MicroAppsS3 extends cdk.Stack implements IMicroAppsS3Exports {
  private _bucketApps: s3.IBucket;
  public get bucketApps(): s3.IBucket {
    return this._bucketApps;
  }

  private _bucketAppsName: string;
  public get bucketAppsName(): string {
    return this._bucketAppsName;
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
    // https://www.scavasoft.com/aws-cdk-s3-auto-delete/
    // https://www.npmjs.com/package/@mobileposse/auto-delete-bucket
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
  }
}
