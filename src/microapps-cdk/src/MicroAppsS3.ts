import * as cf from '@aws-cdk/aws-cloudfront';
import * as cforigins from '@aws-cdk/aws-cloudfront-origins';
import * as s3 from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';
import { DeletableBucket } from '@cloudcomponents/cdk-deletable-bucket';
import { MicroAppsProps } from './MicroApps';

export interface IMicroAppsS3Exports {
  readonly bucketApps: s3.IBucket;
  readonly bucketAppsName: string;
  readonly bucketAppsOAI: cf.OriginAccessIdentity;
  readonly bucketAppsOrigin: cforigins.S3Origin;
  readonly bucketAppsStaging: s3.IBucket;
  readonly bucketAppsStagingName: string;
  readonly bucketLogs: s3.IBucket;
}

interface MicroAppsS3Props extends cdk.ResourceProps {
  readonly microapps: MicroAppsProps;

  /**
   * Duration before stack is automatically deleted.
   * Requires that autoDeleteEverything be set to true.
   *
   * @default false
   */
  readonly autoDeleteEverything?: boolean;
}

export class MicroAppsS3 extends cdk.Construct implements IMicroAppsS3Exports {
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

  constructor(scope: cdk.Construct, id: string, props?: MicroAppsS3Props) {
    super(scope, id);

    if (props === undefined) {
      throw new Error('props must be set');
    }

    const { microapps } = props;

    // Use Auto-Delete S3Bucket for PRs
    this._bucketAppsName = `${microapps.reverseDomainName}-${microapps.assetNameRoot}${microapps.assetNameSuffix}`;
    this._bucketAppsStagingName = `${microapps.reverseDomainName}-${microapps.assetNameRoot}-staging${microapps.assetNameSuffix}`;

    const s3RemovalPolicy = microapps.autoDeleteEverything
      ? cdk.RemovalPolicy.DESTROY
      : cdk.RemovalPolicy.RETAIN;
    const s3AutoDeleteItems = microapps.autoDeleteEverything;

    //
    // S3 Bucket for Logging - Usable by many stacks
    //
    this._bucketLogs = new DeletableBucket(this, 'microapps-logs', {
      bucketName: `${microapps.reverseDomainName}-${microapps.assetNameRoot}-logs${microapps.assetNameSuffix}`,
      forceDelete: s3AutoDeleteItems,
      removalPolicy: s3RemovalPolicy,
    });

    //
    // S3 Buckets for Apps
    //
    this._bucketApps = new DeletableBucket(this, 'microapps-apps', {
      bucketName: this._bucketAppsName,
      forceDelete: s3AutoDeleteItems,
      removalPolicy: s3RemovalPolicy,
    });
    this._bucketAppsStaging = new DeletableBucket(this, 'microapps-apps-staging', {
      bucketName: this._bucketAppsStagingName,
      forceDelete: s3AutoDeleteItems,
      removalPolicy: s3RemovalPolicy,
    });

    // Create S3 Origin Identity
    this._bucketAppsOAI = new cf.OriginAccessIdentity(this, 'microapps-oai', {
      comment: `${microapps.assetNameRoot}${microapps.assetNameSuffix}`,
    });
    if (microapps.autoDeleteEverything) {
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
