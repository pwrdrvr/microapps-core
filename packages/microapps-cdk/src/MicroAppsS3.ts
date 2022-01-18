import { RemovalPolicy } from 'aws-cdk-lib';
import * as cf from 'aws-cdk-lib/aws-cloudfront';
import * as cforigins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface IMicroAppsS3 {
  /**
   * S3 bucket for deployed applications
   */
  readonly bucketApps: s3.IBucket;

  /**
   * CloudFront Origin Access Identity for the deployed applications bucket
   */
  readonly bucketAppsOAI: cf.OriginAccessIdentity;

  /**
   * CloudFront Origin for the deployed applications bucket
   */
  readonly bucketAppsOrigin: cforigins.S3Origin;

  /**
   * S3 bucket for staged applications (prior to deploy)
   */
  readonly bucketAppsStaging: s3.IBucket;

  /**
   * S3 bucket for CloudFront logs
   */
  readonly bucketLogs: s3.IBucket;
}

export interface MicroAppsS3Props {
  /**
   * RemovalPolicy override for child resources
   *
   * Note: if set to DESTROY the S3 buckes will have `autoDeleteObjects` set to `true`
   *
   * @default - per resource default
   */
  readonly removalPolicy?: RemovalPolicy;

  /**
   * S3 deployed apps bucket name
   *
   * @default auto-assigned
   */
  readonly bucketAppsName?: string;

  /**
   * S3 staging apps bucket name
   *
   * @default auto-assigned
   */
  readonly bucketAppsStagingName?: string;

  /**
   * S3 logs bucket name
   *
   * @default auto-assigned
   */
  readonly bucketLogsName?: string;

  /**
   * Optional asset name root
   *
   * @example microapps
   * @default - resource names auto assigned
   */
  readonly assetNameRoot?: string;

  /**
   * Optional asset name suffix
   *
   * @example -dev-pr-12
   * @default none
   */
  readonly assetNameSuffix?: string;
}

export class MicroAppsS3 extends Construct implements IMicroAppsS3 {
  private _bucketApps: s3.IBucket;
  public get bucketApps(): s3.IBucket {
    return this._bucketApps;
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

  private _bucketLogs: s3.IBucket;
  public get bucketLogs(): s3.IBucket {
    return this._bucketLogs;
  }

  /**
   * MicroApps - Create just S3 resources.
   * @param scope
   * @param id
   * @param props
   */
  constructor(scope: Construct, id: string, props?: MicroAppsS3Props) {
    super(scope, id);

    if (props === undefined) {
      throw new Error('props must be set');
    }

    const { removalPolicy, assetNameRoot, assetNameSuffix } = props;

    // Use Auto-Delete S3Bucket if removal policy is DESTROY
    const s3AutoDeleteItems = removalPolicy === RemovalPolicy.DESTROY;

    //
    // S3 Bucket for Logging - Usable by many stacks
    //
    this._bucketLogs = new s3.Bucket(this, 'logs', {
      bucketName: props.bucketLogsName,
      autoDeleteObjects: s3AutoDeleteItems,
      removalPolicy,
    });

    //
    // S3 Buckets for Apps
    //
    this._bucketApps = new s3.Bucket(this, 'apps', {
      bucketName: props.bucketAppsName,
      autoDeleteObjects: s3AutoDeleteItems,
      removalPolicy,
    });
    this._bucketAppsStaging = new s3.Bucket(this, 'staging', {
      bucketName: props.bucketAppsStagingName,
      autoDeleteObjects: s3AutoDeleteItems,
      removalPolicy,
    });

    // Create S3 Origin Identity
    this._bucketAppsOAI = new cf.OriginAccessIdentity(this, 'oai', {
      comment: assetNameRoot !== undefined ? `${assetNameRoot}${assetNameSuffix}` : undefined,
    });
    if (removalPolicy !== undefined) {
      this._bucketAppsOAI.applyRemovalPolicy(removalPolicy);
    }

    // Add Origin for CloudFront
    this._bucketAppsOrigin = new cforigins.S3Origin(this._bucketApps, {
      originAccessIdentity: this.bucketAppsOAI,
    });
  }
}
