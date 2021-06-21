import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';

export interface IMicroAppsS3Exports {
  bucketApps: s3.IBucket;
  bucketAppsStaging: s3.IBucket;
  bucketLogs: s3.IBucket;
}

interface IMicroAppsS3Props extends cdk.StackProps {
  local: {
    // none yet
  };
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

    //
    // S3 Bucket for Logging - Usable by many stacks
    //

    this._bucketLogs = new s3.Bucket(this, 'microapps-logs', {});

    //
    // S3 Buckets for Apps
    //
    this._bucketApps = new s3.Bucket(this, 'microapps-apps', {});
    this._bucketAppsStaging = new s3.Bucket(this, 'microapps-apps-staging', {});
  }
}
