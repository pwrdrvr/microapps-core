import * as acm from '@aws-cdk/aws-certificatemanager';
import * as cdk from '@aws-cdk/core';
import { MicroAppsCF } from './MicroAppsCF';
import { MicroAppsS3 } from './MicroAppsS3';
import { MicroAppsSvcs } from './MicroAppsSvcs';

/**
 * Props for MicroApps.
 *
 */
export interface MicroAppsProps {
  /**
   * Automatically destroy all assets when stack is deleted
   *
   * @default false
   */
  readonly autoDeleteEverything?: boolean;

  /**
   * Passed to NODE_ENV of Router and Deployer Lambda functions.
   *
   * @default dev
   */
  readonly appEnv: string;

  /**
   * Start of asset names.
   *
   * @default microapps
   */
  readonly assetNameRoot: string;

  /**
   * Suffix to add to asset names, such as -[env]-pr-[prNum]
   *
   * @default - none
   */
  readonly assetNameSuffix?: string;

  /**
   * Domain name of the zone for the edge host.
   * Example: 'pwrdrvr.com' for apps.pwrdrvr.com
   *
   */
  readonly domainName: string;

  /**
   * Name of the zone in R53 to add records to.
   *
   * @example pwrdrvr.com.
   *
   */
  readonly r53ZoneName: string;

  /**
   * ID of the zone in R53 to add records to.
   *
   */
  readonly r53ZoneID: string;

  /**
   * Certificate in US-East-1 for the CloudFront distribution.
   *
   */
  readonly certEdge: acm.ICertificate;

  /**
   * Certificate in deployed region for the API Gateway.
   *
   */
  readonly certOrigin: acm.ICertificate;

  /**
   * IAM Role name to exclude from the DENY rules on the S3 Bucket Policy.
   *
   * @default AdminAccess
   */
  readonly s3PolicyBypassRoleName: string;

  /**
   * AROA of the IAM Role to exclude from the DENY rules on the S3 Bucket Policy.
   * This allows sessions that assume the IAM Role to be excluded from the
   * DENY rules on the S3 Bucket Policy.
   *
   * @example AROA1234567890123
   */
  readonly s3PolicyBypassAROA: string;

  /**
   * AWS Account ID that the stack is being deployed to, this is
   * required for importing the R53 Zone.
   *
   * @example 012345678901234
   */
  readonly account: string;

  /**
   * AWS Region that the stack is being deployed to, this is
   * required for importing the R53 Zone.
   *
   * @example us-east-2
   */
  readonly region: string;

  /**
   * CNAME for the CloudFront distribution.
   *
   * @example apps.pwrdrvr.com
   */
  readonly domainNameEdge: string;

  /**
   * CNAME for the API Gateway HTTPv2 API.
   *
   * @example apps-origin.pwrdrvr.com
   */
  readonly domainNameOrigin: string;
}

/**
 * MicroApps applicatoin deployment and runtime environment.
 */
export class MicroApps extends cdk.Construct {
  // input like 'example.com.' will return as 'com.example'
  private static reverseDomain(domain: string): string {
    let parts = domain.split('.').reverse();
    if (parts[0] === '') {
      parts = parts.slice(1);
    }
    return parts.join('.');
  }

  constructor(scope: cdk.Construct, id: string, props?: MicroAppsProps) {
    super(scope, id);

    if (props === undefined) {
      throw new Error('props must be set');
    }

    const {
      domainName,
      domainNameEdge,
      domainNameOrigin,
      assetNameRoot = 'microapps',
      assetNameSuffix = '',
      autoDeleteEverything = false,
      r53ZoneID,
      r53ZoneName,
      certEdge,
      account,
      region,
      appEnv = 'dev',
      certOrigin,
      s3PolicyBypassAROA,
      s3PolicyBypassRoleName = 'AdminAccess',
    } = props;
    const reverseDomainName = MicroApps.reverseDomain(domainName);

    const s3 = new MicroAppsS3(this, 'microapps-s3', {
      autoDeleteEverything,
      reverseDomainName,
      assetNameRoot,
      assetNameSuffix,
    });
    const cf = new MicroAppsCF(this, 'microapps-cloudfront', {
      s3Exports: s3,
      assetNameRoot,
      assetNameSuffix,
      domainName,
      reverseDomainName,
      domainNameEdge,
      domainNameOrigin,
      autoDeleteEverything,
      r53ZoneID,
      r53ZoneName,
      certEdge,
    });
    new MicroAppsSvcs(this, 'microapps-svcs', {
      cfStackExports: cf,
      s3Exports: s3,
      assetNameRoot,
      assetNameSuffix,
      domainName,
      reverseDomainName,
      domainNameEdge,
      domainNameOrigin,
      autoDeleteEverything,
      r53ZoneID,
      r53ZoneName,
      account,
      region,
      appEnv,
      certOrigin,
      s3PolicyBypassAROA,
      s3PolicyBypassRoleName,
    });
  }
}
