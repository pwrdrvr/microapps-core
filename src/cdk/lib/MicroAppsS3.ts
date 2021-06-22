import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import { AutoDeleteBucket } from '@mobileposse/auto-delete-bucket';
import SharedProps from './SharedProps';
import SharedTags from './SharedTags';

export interface IMicroAppsS3Exports {
  bucketApps: s3.IBucket;
  bucketAppsStaging: s3.IBucket;
  bucketLogs: s3.IBucket;
}

interface IMicroAppsS3Props extends cdk.StackProps {
  local: {
    // none yet
  };
  shared: SharedProps;
}

export class MicroAppsS3 extends cdk.Stack implements IMicroAppsS3Exports {
  private _bucketApps: s3.IBucket;
  public get bucketApps(): s3.IBucket {
    return this._bucketApps;
  }

  private _bucketAppsStaging: s3.IBucket;
  public get bucketAppsStaging(): s3.IBucket {
    return this._bucketAppsStaging;
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

    SharedTags.addEnvTag(this, shared.env, shared.isPR);

    // Use Auto-Delete S3Bucket for PRs
    // https://www.scavasoft.com/aws-cdk-s3-auto-delete/
    // https://www.npmjs.com/package/@mobileposse/auto-delete-bucket
    if (!shared.isPR) {
      //
      // S3 Bucket for Logging - Usable by many stacks
      //
      this._bucketLogs = new s3.Bucket(this, 'microapps-logs', {
        bucketName: `${shared.stackName}-logs${shared.envSuffix}${shared.prSuffix}`,
      });

      //
      // S3 Buckets for Apps
      //
      this._bucketApps = new s3.Bucket(this, 'microapps-apps', {
        bucketName: `${shared.stackName}-apps${shared.envSuffix}${shared.prSuffix}`,
      });
      this._bucketAppsStaging = new s3.Bucket(this, 'microapps-apps-staging', {
        bucketName: `${shared.stackName}-apps-staging${shared.envSuffix}${shared.prSuffix}`,
      });
    } else {
      //
      // S3 Bucket for Logging - Usable by many stacks
      //
      this._bucketLogs = new AutoDeleteBucket(this, 'microapps-logs', {
        bucketName: `${shared.stackName}-logs${shared.envSuffix}${shared.prSuffix}`,
      });

      //
      // S3 Buckets for Apps
      //
      this._bucketApps = new AutoDeleteBucket(this, 'microapps-apps', {
        bucketName: `${shared.stackName}-apps${shared.envSuffix}${shared.prSuffix}`,
      });
      this._bucketAppsStaging = new AutoDeleteBucket(this, 'microapps-apps-staging', {
        bucketName: `${shared.stackName}-apps-staging${shared.envSuffix}${shared.prSuffix}`,
      });
    }
  }
}
