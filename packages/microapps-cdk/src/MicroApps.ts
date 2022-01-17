import * as acm from '@aws-cdk/aws-certificatemanager';
import * as r53 from '@aws-cdk/aws-route53';
import * as cdk from '@aws-cdk/core';
import { IMicroAppsAPIGwy, MicroAppsAPIGwy } from './MicroAppsAPIGwy';
import { IMicroAppsCF, MicroAppsCF } from './MicroAppsCF';
import { IMicroAppsS3, MicroAppsS3 } from './MicroAppsS3';
import { IMicroAppsSvcs, MicroAppsSvcs } from './MicroAppsSvcs';
import { reverseDomain } from './utils/ReverseDomain';

/**
 * Props for MicroApps
 *
 */
export interface MicroAppsProps {
  /**
   * RemovalPolicy override for child resources
   *
   * Note: if set to DESTROY the S3 buckes will have `autoDeleteObjects` set to `true`
   *
   * @default - per resource default
   */
  readonly removalPolicy?: cdk.RemovalPolicy;

  /**
   * Passed to NODE_ENV of Router and Deployer Lambda functions.
   *
   * @default dev
   */
  readonly appEnv: string;

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
   * Route53 zone in which to create optional `domainNameEdge` record
   */
  readonly r53Zone?: r53.IHostedZone;

  /**
   * Certificate in US-East-1 for the CloudFront distribution.
   *
   */
  readonly certEdge?: acm.ICertificate;

  /**
   * Certificate in deployed region for the API Gateway.
   *
   */
  readonly certOrigin?: acm.ICertificate;

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
   * Optional custom domain name for the CloudFront distribution.
   *
   * @example apps.pwrdrvr.com
   * @default auto-assigned
   */
  readonly domainNameEdge?: string;

  /**
   * Optional custom domain name for the API Gateway HTTPv2 API.
   *
   * @example apps-origin.pwrdrvr.com
   * @default auto-assigned
   */
  readonly domainNameOrigin?: string;

  /**
   * Path prefix on the root of the CloudFront distribution
   *
   * @example dev/
   */
  readonly rootPathPrefix?: string;

  /**
   * Create an extra Behavior (Route) for /api/ that allows
   * API routes to have a period in them.
   *
   * When false API routes with a period in the path will get routed to S3.
   *
   * When true API routes that contain /api/ in the path will get routed to API Gateway
   * even if they have a period in the path.
   *
   * @default true
   */
  readonly createAPIPathRoute?: boolean;
}

export interface IMicroApps {
  readonly cf: IMicroAppsCF;
  readonly s3: IMicroAppsS3;
  readonly svcs: IMicroAppsSvcs;
  readonly apigwy: IMicroAppsAPIGwy;
}

/**
 * Application deployment and runtime environment.
 */
export class MicroApps extends cdk.Construct implements IMicroApps {
  private _cf: MicroAppsCF;
  public get cf(): IMicroAppsCF {
    return this._cf;
  }

  private _s3: MicroAppsS3;
  public get s3(): IMicroAppsS3 {
    return this._s3;
  }

  private _apigwy: MicroAppsAPIGwy;
  public get apigwy(): IMicroAppsAPIGwy {
    return this._apigwy;
  }

  private _svcs: MicroAppsSvcs;
  public get svcs(): IMicroAppsSvcs {
    return this._svcs;
  }

  /**
   * MicroApps - Create entire stack of CloudFront, S3, API Gateway, and Lambda Functions.
   * This is the "Easy Button" construct to get started as quickly as possible.
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
      domainNameEdge,
      domainNameOrigin,
      assetNameRoot,
      assetNameSuffix,
      r53Zone,
      certEdge,
      appEnv = 'dev',
      certOrigin,
      removalPolicy,
      s3PolicyBypassAROAs,
      s3PolicyBypassPrincipalARNs,
      s3StrictBucketPolicy,
      rootPathPrefix,
      createAPIPathRoute = true,
    } = props;

    this._s3 = new MicroAppsS3(this, 's3', {
      removalPolicy,
      bucketLogsName: domainNameEdge ? `${reverseDomain(domainNameEdge)}-logs` : undefined,
      bucketAppsName: domainNameEdge ? `${reverseDomain(domainNameEdge)}` : undefined,
      bucketAppsStagingName: domainNameEdge
        ? `${reverseDomain(domainNameEdge)}-staging`
        : undefined,
      assetNameRoot,
      assetNameSuffix,
    });
    this._apigwy = new MicroAppsAPIGwy(this, 'api', {
      removalPolicy,
      assetNameRoot,
      assetNameSuffix,
      domainNameEdge,
      domainNameOrigin,
      r53Zone,
      certOrigin,
      rootPathPrefix,
    });
    this._cf = new MicroAppsCF(this, 'cft', {
      removalPolicy,
      assetNameRoot,
      assetNameSuffix,
      domainNameEdge,
      domainNameOrigin,
      httpApi: this._apigwy.httpApi,
      r53Zone,
      certEdge,
      bucketAppsOrigin: this._s3.bucketAppsOrigin,
      bucketLogs: this._s3.bucketLogs,
      rootPathPrefix,
      createAPIPathRoute,
    });
    this._svcs = new MicroAppsSvcs(this, 'svcs', {
      httpApi: this.apigwy.httpApi,
      removalPolicy,
      bucketApps: this._s3.bucketApps,
      bucketAppsOAI: this._s3.bucketAppsOAI,
      bucketAppsStaging: this._s3.bucketAppsStaging,
      assetNameRoot,
      assetNameSuffix,
      appEnv,
      s3PolicyBypassAROAs,
      s3PolicyBypassPrincipalARNs,
      s3StrictBucketPolicy,
      rootPathPrefix,
    });
  }
}
