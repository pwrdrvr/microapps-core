import { posix as posixPath } from 'path';
import * as apigwy from '@aws-cdk/aws-apigatewayv2-alpha';
import { Aws, RemovalPolicy, Stack } from 'aws-cdk-lib';
// import * as apigwycfn from 'aws-cdk-lib/aws-apigatewayv2';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cf from 'aws-cdk-lib/aws-cloudfront';
import * as cforigins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as r53 from 'aws-cdk-lib/aws-route53';
import * as r53targets from 'aws-cdk-lib/aws-route53-targets';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { reverseDomain } from './utils/ReverseDomain';

export interface IMicroAppsCF {
  readonly cloudFrontDistro: cf.Distribution;
}

export interface MicroAppsCFProps {
  /**
   * RemovalPolicy override for child resources
   *
   * Note: if set to DESTROY the S3 buckes will have `autoDeleteObjects` set to `true`
   *
   * @default - per resource default
   */
  readonly removalPolicy?: RemovalPolicy;

  /**
   * S3 bucket origin for deployed applications
   */
  readonly bucketAppsOrigin: cforigins.S3Origin;

  /**
   * S3 bucket for CloudFront logs
   */
  readonly bucketLogs?: s3.IBucket;

  /**
   * CloudFront Distribution domain name
   *
   * @example apps.pwrdrvr.com
   * @default auto-assigned
   */
  readonly domainNameEdge?: string;

  /**
   * API Gateway custom origin domain name
   *
   * @example apps.pwrdrvr.com
   * @default - retrieved from httpApi, if possible
   */
  readonly domainNameOrigin?: string;

  /**
   * API Gateway v2 HTTP API for apps
   */
  readonly httpApi: apigwy.HttpApi;

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
   * ACM Certificate that covers `domainNameEdge` name
   */
  readonly certEdge?: acm.ICertificate;

  /**
   * Route53 zone in which to create optional `domainNameEdge` record
   */
  readonly r53Zone?: r53.IHostedZone;

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

export interface CreateAPIOriginPolicyOptions {
  readonly assetNameRoot?: string;
  readonly assetNameSuffix?: string;

  /**
   * Edge domain name used by CloudFront - If set a custom
   * OriginRequestPolicy will be created that prevents
   * the Host header from being passed to the origin.
   */
  readonly domainNameEdge?: string;
}

export interface AddRoutesOptions {
  /**
   * API Gateway CloudFront Origin for API calls
   */
  readonly apiGwyOrigin: cf.IOrigin;

  /**
   * S3 Bucket CloudFront Origin for static assets
   */
  readonly bucketAppsOrigin: cforigins.S3Origin;

  /**
   * CloudFront Distribution to add the Behaviors (Routes) to
   */
  readonly distro: cf.Distribution;

  /**
   * Origin Request policy for API Gateway Origin
   */
  readonly apigwyOriginRequestPolicy: cf.IOriginRequestPolicy;

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

export class MicroAppsCF extends Construct implements IMicroAppsCF {
  /**
   * Create or get the origin request policy
   *
   * If a custom domain name is NOT used for the origin then a policy
   * will be created.
   *
   * If a custom domain name IS used for the origin then the ALL_VIEWER
   * policy will be returned.  This policy passes the Host header to the
   * origin, which is fine when using a custom domain name on the origin.
   *
   * @param scope
   * @param props
   */
  public static createAPIOriginPolicy(
    scope: Construct,
    props: CreateAPIOriginPolicyOptions,
  ): cf.IOriginRequestPolicy {
    const { assetNameRoot, assetNameSuffix, domainNameEdge } = props;

    let apigwyOriginRequestPolicy: cf.IOriginRequestPolicy = cf.OriginRequestPolicy.ALL_VIEWER;
    if (domainNameEdge === undefined) {
      // When not using a custom domain name we must limit down the origin policy to
      // prevent it from passing the Host header (distribution_id.cloudfront.net) to
      // apigwy which will then reject it with a 403 because it does not match the
      // execute-api name that apigwy is expecting.
      //
      // 2021-12-28 - There is a bug in the name generation that causes the same asset
      // in different stacks to have the same generated name.  We have to make the id
      // in all cases to ensure the generated name is unique.
      apigwyOriginRequestPolicy = new cf.OriginRequestPolicy(
        scope,
        `apigwy-origin-policy-${Stack.of(scope).stackName}`,
        {
          comment: assetNameRoot ? `${assetNameRoot}-apigwy${assetNameSuffix}` : undefined,

          originRequestPolicyName: assetNameRoot
            ? `${assetNameRoot}-apigwy${assetNameSuffix}`
            : undefined,
          cookieBehavior: cf.OriginRequestCookieBehavior.all(),
          queryStringBehavior: cf.OriginRequestQueryStringBehavior.all(),
          headerBehavior: cf.OriginRequestHeaderBehavior.allowList('user-agent', 'referer'),
        },
      );
    }

    return apigwyOriginRequestPolicy;
  }

  /**
   * Add API Gateway and S3 routes to an existing CloudFront Distribution
   * @param _scope
   * @param props
   */
  public static addRoutes(_scope: Construct, props: AddRoutesOptions) {
    const {
      apiGwyOrigin,
      bucketAppsOrigin,
      distro,
      apigwyOriginRequestPolicy,
      rootPathPrefix = '',
      createAPIPathRoute = true,
    } = props;

    //
    // Add Behaviors
    //
    const s3BehaviorOptions: cf.AddBehaviorOptions = {
      allowedMethods: cf.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      cachePolicy: cf.CachePolicy.CACHING_OPTIMIZED,
      compress: true,
      originRequestPolicy: cf.OriginRequestPolicy.CORS_S3_ORIGIN,
      viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    };
    const apiGwyBehaviorOptions: cf.AddBehaviorOptions = {
      allowedMethods: cf.AllowedMethods.ALLOW_ALL,
      // TODO: Caching needs to be set by the app response
      cachePolicy: cf.CachePolicy.CACHING_DISABLED,
      compress: true,
      originRequestPolicy: apigwyOriginRequestPolicy,
      viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    };

    //
    // If a route specifically has `/api/` in it, send it to API Gateway
    // This is needed to catch routes that have periods in the API path data,
    // such as: /release/0.0.0/api/update/default/release/0.0.0
    //
    if (createAPIPathRoute) {
      distro.addBehavior(
        posixPath.join(rootPathPrefix, '/*/*/api/*'),
        apiGwyOrigin,
        apiGwyBehaviorOptions,
      );
    }

    //
    // All static assets are assumed to have a dot in them
    //
    distro.addBehavior(
      posixPath.join(rootPathPrefix, '/*/*/*.*'),
      bucketAppsOrigin,
      s3BehaviorOptions,
    );

    //
    // Everything that isn't a static asset is going to API Gateway
    // There is no trailing slash because Serverless Next.js wants
    // go load pages at /release/0.0.3 (with no trailing slash).
    //
    distro.addBehavior(posixPath.join(rootPathPrefix, '/*'), apiGwyOrigin, apiGwyBehaviorOptions);
  }

  private _cloudFrontDistro: cf.Distribution;
  public get cloudFrontDistro(): cf.Distribution {
    return this._cloudFrontDistro;
  }

  /**
   * MicroApps - Create just CloudFront resources.
   * @param scope
   * @param id
   * @param props
   */
  constructor(scope: Construct, id: string, props: MicroAppsCFProps) {
    super(scope, id);

    if (props === undefined) {
      throw new Error('props must be set');
    }

    if (
      (props.r53Zone === undefined && props.domainNameEdge !== undefined) ||
      (props.r53Zone !== undefined && props.domainNameEdge === undefined)
    ) {
      throw new Error('If either of r53Zone or domainNameEdge are set then the other must be set');
    }

    const {
      domainNameEdge,
      domainNameOrigin,
      httpApi,
      removalPolicy,
      certEdge,
      assetNameRoot,
      assetNameSuffix,
      r53Zone,
      bucketLogs,
      bucketAppsOrigin,
      rootPathPrefix,
      createAPIPathRoute = true,
    } = props;

    const apigwyOriginRequestPolicy = MicroAppsCF.createAPIOriginPolicy(this, {
      assetNameRoot,
      assetNameSuffix,
      domainNameEdge,
    });

    //
    // Determine URL of the origin FQDN
    //
    let httpOriginFQDN: string = 'invalid.pwrdrvr.com';
    if (domainNameOrigin !== undefined) {
      httpOriginFQDN = domainNameOrigin;
    } else {
      httpOriginFQDN = `${httpApi.apiId}.execute-api.${Aws.REGION}.amazonaws.com`;
    }

    //
    // CloudFront Distro
    //
    const apiGwyOrigin = new cforigins.HttpOrigin(httpOriginFQDN, {
      protocolPolicy: cf.OriginProtocolPolicy.HTTPS_ONLY,
      originSslProtocols: [cf.OriginSslPolicy.TLS_V1_2],
    });
    this._cloudFrontDistro = new cf.Distribution(this, 'cft', {
      comment: assetNameRoot ? `${assetNameRoot}${assetNameSuffix}` : domainNameEdge,
      domainNames: domainNameEdge !== undefined ? [domainNameEdge] : undefined,
      certificate: certEdge,
      httpVersion: cf.HttpVersion.HTTP2,
      defaultBehavior: {
        allowedMethods: cf.AllowedMethods.ALLOW_ALL,
        cachePolicy: cf.CachePolicy.CACHING_DISABLED,
        compress: true,
        originRequestPolicy: apigwyOriginRequestPolicy,
        origin: apiGwyOrigin,
        viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      enableIpv6: true,
      priceClass: cf.PriceClass.PRICE_CLASS_100,
      logBucket: bucketLogs,
      logFilePrefix: props.domainNameEdge
        ? `${reverseDomain(props.domainNameEdge)}/cloudfront-raw/`
        : undefined,
    });
    if (removalPolicy !== undefined) {
      this._cloudFrontDistro.applyRemovalPolicy(removalPolicy);
    }

    // Add routes to the CloudFront Distribution
    MicroAppsCF.addRoutes(scope, {
      apiGwyOrigin,
      bucketAppsOrigin,
      distro: this._cloudFrontDistro,
      apigwyOriginRequestPolicy: apigwyOriginRequestPolicy,
      rootPathPrefix,
      createAPIPathRoute,
    });

    //
    // Create the edge name for the CloudFront distro
    //

    if (r53Zone !== undefined) {
      const rrAppsEdge = new r53.RecordSet(this, 'edge-arecord', {
        recordName: domainNameEdge,
        recordType: r53.RecordType.A,
        target: r53.RecordTarget.fromAlias(new r53targets.CloudFrontTarget(this._cloudFrontDistro)),
        zone: r53Zone,
      });
      if (removalPolicy !== undefined) {
        rrAppsEdge.applyRemovalPolicy(removalPolicy);
      }
    }
  }
}
