import { RemovalPolicy } from 'aws-cdk-lib';
import * as cf from 'aws-cdk-lib/aws-cloudfront';
import * as cforigins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

/**
 * Represents a MicroApps S3
 */
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
   * Marked with `x-microapps-origin: app` so the OriginRequest function
   * knows to send the request to the application origin first, if configured
   * for a particular application.
   */
  readonly bucketAppsOriginApp: cforigins.S3Origin;

  /**
   * CloudFront Origin for the deployed applications bucket
   * Marked with `x-microapps-origin: s3` so the OriginRequest function
   * knows to NOT send the request to the application origin and instead
   * let it fall through to the S3 bucket.
   */
  readonly bucketAppsOriginS3: cforigins.S3Origin;

  /**
   * S3 bucket for staged applications (prior to deploy)
   */
  readonly bucketAppsStaging: s3.IBucket;

  /**
   * S3 bucket for CloudFront logs
   */
  readonly bucketLogs: s3.IBucket;
}

/**
 * Properties to initialize an instance of `MicroAppsS3`.
 */
export interface MicroAppsS3Props {
  /**
   * RemovalPolicy override for child resources
   *
   * Note: if set to DESTROY the S3 buckets will have `autoDeleteObjects` set to `true`
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

  /**
   * Optional Origin Shield Region
   *
   * This should be the region where the DynamoDB is located so the
   * EdgeToOrigin calls have the lowest latency (~1 ms).
   *
   * @default - none
   */
  readonly originShieldRegion?: string;
}

/**
 * Create the durable MicroApps S3 Buckets
 *
 * These should be created in a stack that will not be deleted if
 * there are breaking changes to MicroApps in the future.
 */
export class MicroAppsS3 extends Construct implements IMicroAppsS3 {
  private _bucketApps: s3.IBucket;
  public get bucketApps(): s3.IBucket {
    return this._bucketApps;
  }

  private _bucketAppsOAI: cf.OriginAccessIdentity;
  public get bucketAppsOAI(): cf.OriginAccessIdentity {
    return this._bucketAppsOAI;
  }

  private _bucketAppsOriginApp: cforigins.S3Origin;
  public get bucketAppsOriginApp(): cforigins.S3Origin {
    return this._bucketAppsOriginApp;
  }

  private _bucketAppsOriginS3: cforigins.S3Origin;
  public get bucketAppsOriginS3(): cforigins.S3Origin {
    return this._bucketAppsOriginS3;
  }

  private _bucketAppsStaging: s3.IBucket;
  public get bucketAppsStaging(): s3.IBucket {
    return this._bucketAppsStaging;
  }

  private _bucketLogs: s3.IBucket;
  public get bucketLogs(): s3.IBucket {
    return this._bucketLogs;
  }

  constructor(scope: Construct, id: string, props?: MicroAppsS3Props) {
    super(scope, id);

    if (props === undefined) {
      throw new Error('props must be set');
    }

    const { removalPolicy, assetNameRoot, assetNameSuffix, originShieldRegion } = props;

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
    this._bucketAppsOriginS3 = new cforigins.S3Origin(this._bucketApps, {
      originAccessIdentity: this.bucketAppsOAI,
      originShieldRegion,
      customHeaders: {
        'x-microapps-origin': 'primary',
      },
    });

    this._bucketAppsOriginApp = new cforigins.S3Origin(this._bucketApps, {
      originAccessIdentity: this.bucketAppsOAI,
      originShieldRegion,
      customHeaders: {
        'x-microapps-origin': 'fallback',
      },
    });
  }
}
