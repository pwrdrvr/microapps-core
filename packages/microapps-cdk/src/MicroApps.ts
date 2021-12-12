import * as acm from '@aws-cdk/aws-certificatemanager';
import * as cdk from '@aws-cdk/core';
import { IMicroAppsCF, MicroAppsCF } from './MicroAppsCF';
import { IMicroAppsS3, MicroAppsS3 } from './MicroAppsS3';
import { IMicroAppsSvcs, MicroAppsSvcs } from './MicroAppsSvcs';

/**
 * Props for MicroApps
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
   * Use a strict S3 Bucket Policy that prevents applications
   * from reading/writing/modifying/deleting files in the S3 Bucket
   * outside of the path that is specific to their app/version.
   *
   * This setting should be used when applications are less than
   * fully trusted.
   *
   * @default false
   */
  readonly s3StrictBucketPolicy?: boolean;

  /**
   * Applies when using s3StrictBucketPolicy = true
   *
   * IAM Role or IAM User names to exclude from the DENY rules on the S3 Bucket Policy.
   *
   * Roles that are Assumed must instead have their AROA added to `s3PolicyBypassAROAs`.
   *
   * Typically any admin roles / users that need to view or manage the S3 Bucket
   * would be added to this list.
   *
   * @example ['arn:aws:iam::1234567890123:role/AdminAccess', 'arn:aws:iam::1234567890123:user/MyAdminUser']
   *
   * @see s3PolicyBypassAROAs
   */
  readonly s3PolicyBypassPrincipalARNs?: string[];

  /**
   * Applies when using s3StrictBucketPolicy = true
   *
   * AROAs of the IAM Role to exclude from the DENY rules on the S3 Bucket Policy.
   * This allows sessions that assume the IAM Role to be excluded from the
   * DENY rules on the S3 Bucket Policy.
   *
   * Typically any admin roles / users that need to view or manage the S3 Bucket
   * would be added to this list.
   *
   * Roles / users that are used directly, not assumed, can be added to `s3PolicyBypassRoleNames` instead.
   *
   * Note: This AROA must be specified to prevent this policy from locking
   * out non-root sessions that have assumed the admin role.
   *
   * The notPrincipals will only match the role name exactly and will not match
   * any session that has assumed the role since notPrincipals does not allow
   * wildcard matches and does not do wildcard matches implicitly either.
   *
   * The AROA must be used because there are only 3 Principal variables available:
   *  https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_variables.html#principaltable
   *  aws:username, aws:userid, aws:PrincipalTag
   *
   * For an assumed role, aws:username is blank, aws:userid is:
   *  [unique id AKA AROA for Role]:[session name]
   *
   * Table of unique ID prefixes such as AROA:
   *  https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_identifiers.html#identifiers-prefixes
   *
   * The name of the role is simply not available for an assumed role and, if it was,
   * a complicated comparison would be requierd to prevent exclusion
   * of applying the Deny Rule to roles from other accounts.
   *
   * To get the AROA with the AWS CLI:
   *   aws iam get-role --role-name ROLE-NAME
   *   aws iam get-user -–user-name USER-NAME
   *
   * @example [ 'AROA1234567890123' ]
   *
   * @see s3StrictBucketPolicy
   */
  readonly s3PolicyBypassAROAs?: string[];

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

export interface IMicroApps {
  readonly cf: IMicroAppsCF;
  readonly s3: IMicroAppsS3;
  readonly svcs: IMicroAppsSvcs;
}

/**
 * Application deployment and runtime environment.
 */
export class MicroApps extends cdk.Construct implements IMicroApps {
  // input like 'example.com.' will return as 'com.example'
  private static reverseDomain(domain: string): string {
    let parts = domain.split('.').reverse();
    if (parts[0] === '') {
      parts = parts.slice(1);
    }
    return parts.join('.');
  }

  private _cf: MicroAppsCF;
  public get cf(): IMicroAppsCF {
    return this._cf;
  }

  private _s3: MicroAppsS3;
  public get s3(): IMicroAppsS3 {
    return this._s3;
  }

  private _svcs: MicroAppsSvcs;
  public get svcs(): IMicroAppsSvcs {
    return this._svcs;
  }

  /**
   * MicroApps - Create entire stack of CloudFront, S3, API Gateway, and Lambda Functions.
   *
   * @param scope
   * @param id
   * @param props
   */
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
      s3PolicyBypassAROAs,
      s3PolicyBypassPrincipalARNs,
      s3StrictBucketPolicy,
    } = props;
    const reverseDomainName = MicroApps.reverseDomain(domainName);

    this._s3 = new MicroAppsS3(this, 'microapps-s3', {
      autoDeleteEverything,
      reverseDomainName,
      assetNameRoot,
      assetNameSuffix,
    });
    this._cf = new MicroAppsCF(this, 'microapps-cloudfront', {
      s3Exports: this._s3,
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
    this._svcs = new MicroAppsSvcs(this, 'microapps-svcs', {
      cfStackExports: this._cf,
      s3Exports: this._s3,
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
      s3PolicyBypassAROAs,
      s3PolicyBypassPrincipalARNs,
      s3StrictBucketPolicy,
    });
  }
}
