import { existsSync, writeFileSync } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { posix as posixPath } from 'path';
import * as apigwy from '@aws-cdk/aws-apigatewayv2-alpha';
import { Aws, Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
// import * as apigwycfn from 'aws-cdk-lib/aws-apigatewayv2';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cf from 'aws-cdk-lib/aws-cloudfront';
import * as cforigins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as r53 from 'aws-cdk-lib/aws-route53';
import * as r53targets from 'aws-cdk-lib/aws-route53-targets';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { reverseDomain } from './utils/ReverseDomain';

/**
 * Represents a MicroApps CloudFront
 */
export interface IMicroAppsCF {
  readonly cloudFrontDistro: cf.Distribution;

  readonly edgeToOriginFunction?: lambda.Function | cf.experimental.EdgeFunction;
}

/**
 * Properties to initialize an instance of `MicroAppsCF`.
 */
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

  /**
   * Adds an X-Forwarded-Host-Header when calling API Gateway
   *
   * Can only be trusted if `signingMode` is enabled, which restricts
   * access to API Gateway to only IAM signed requests.
   *
   * Note: if true, creates OriginRequest Lambda @ Edge function for API Gateway Origin
   * @default true
   */
  readonly addXForwardedHostHeader?: boolean;

  /**
   * Replaces Host header (which will be the Edge domain name) with the Origin domain name
   * when enabled.  This is necessary when API Gateway has not been configured
   * with a custom domain name that matches the exact domain name used by the CloudFront
   * Distribution AND when the OriginRequestPolicy.HeadersBehavior is set
   * to pass all headers to the origin.
   *
   * Note: if true, creates OriginRequest Lambda @ Edge function for API Gateway Origin
   * @default true
   */
  readonly replaceHostHeader?: boolean;

  /**
   * Requires IAM auth on the API Gateway origin if not set to 'none'.
   *
   * 'sign' - Uses request headers for auth.
   * 'presign' - Uses query string for auth.
   *
   * If enabled,
   *
   * Note: if 'sign' or 'presign', creates OriginRequest Lambda @ Edge function for API Gateway Origin
   * @default 'sign'
   */
  readonly signingMode?: 'sign' | 'presign' | 'none';

  /**
   * Origin region that API Gateway will be deployed to, used
   * for the config.yml on the Edge function to sign requests for
   * the correct region
   *
   * @default undefined
   */
  readonly originRegion?: string;
}

export interface GenerateEdgeToOriginConfigOptions {
  readonly originRegion: string;
  readonly signingMode: 'sign' | 'presign' | '';
  readonly addXForwardedHostHeader: boolean;
  readonly replaceHostHeader: boolean;
}

/**
 * Options for the `CreateAPIOriginPolicy`
 */
export interface CreateAPIOriginPolicyOptions {
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
   * Edge domain name used by CloudFront - If set a custom
   * OriginRequestPolicy will be created that prevents
   * the Host header from being passed to the origin.
   */
  readonly domainNameEdge?: string;
}

/**
 * Options for `AddRoutes`
 */
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

  /**
   * Edge lambdas to associate with the API Gateway routes
   */
  readonly apigwyEdgeFunctions?: cf.EdgeLambda[];
}

/**
 * Create a new MicroApps CloudFront Distribution.
 */
export class MicroAppsCF extends Construct implements IMicroAppsCF {
  /**
   * Generate the yaml config for the edge lambda
   * @param props
   * @returns
   */
  public static generateEdgeToOriginConfig(props: GenerateEdgeToOriginConfigOptions) {
    return `originRegion: ${props.originRegion}
${props.signingMode === '' ? '' : `signingMode: ${props.signingMode}`}
addXForwardedHostHeader: ${props.addXForwardedHostHeader}
replaceHostHeader: ${props.replaceHostHeader}`;
  }

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
          // TODO: If signing is enabled this should forward all signature headers
          // TODO: If set to "cfront.OriginRequestHeaderBehavior.all()" then
          // `replaceHostHeader` must be set to true to prevent API Gateway from rejecting
          // the request
          // headerBehavior: cf.OriginRequestHeaderBehavior.allowList('user-agent', 'referer'),
          headerBehavior: cf.OriginRequestHeaderBehavior.all(),
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
      edgeLambdas: props.apigwyEdgeFunctions,
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

  private _edgeToOriginFunction?: lambda.Function | cf.experimental.EdgeFunction;
  public get edgeToOriginFunction(): lambda.Function | cf.experimental.EdgeFunction | undefined {
    return this._edgeToOriginFunction;
  }

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
      signingMode = 'sign',
      addXForwardedHostHeader = true,
      replaceHostHeader = true,
      originRegion,
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

    // Create the edge function config file from the construct options
    const edgeToOriginConfigYaml = MicroAppsCF.generateEdgeToOriginConfig({
      originRegion: originRegion || Aws.REGION,
      addXForwardedHostHeader,
      replaceHostHeader,
      signingMode: signingMode === 'none' ? '' : signingMode,
    });

    //
    // Create the Edge to Origin Function
    //
    const edgeToOriginFuncProps: Omit<lambda.FunctionProps, 'handler' | 'code'> = {
      functionName: assetNameRoot ? `${assetNameRoot}-edge-to-origin${assetNameSuffix}` : undefined,
      memorySize: 1769,
      logRetention: logs.RetentionDays.ONE_MONTH,
      runtime: lambda.Runtime.NODEJS_14_X,
      timeout: Duration.seconds(5),
      initialPolicy: [
        // This can't have a reference to the httpApi because it would mean
        // the parent stack (this stack) has to be created before the us-east-1
        // child stack for the Edge Lambda Function.
        // That's why we use a tag-based policy to allow the Edge Function
        // to invoke any API Gateway API that we apply a tag to
        // We allow the edge function to sign for all regions since
        // we may use custom closest region in the future.
        new iam.PolicyStatement({
          actions: ['execute-api:Invoke'],
          resources: [`arn:aws:execute-api:*:${Aws.ACCOUNT_ID}:*/*/*/*`],
          // Unfortunately, API Gateway access cannot be restricted using
          // tags on the target resource
          // https://docs.aws.amazon.com/IAM/latest/UserGuide/access_tags.html
          // https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_aws-services-that-work-with-iam.html#networking_svcs
          // conditions: {
          //   // TODO: Set this to a string unique to each stack
          //   StringEquals: { 'aws:ResourceTag/microapp-managed': 'true' },
          // },
        }),
      ],
    };
    if (
      process.env.NODE_ENV === 'test' ||
      existsSync(path.join(__dirname, '..', '..', 'microapps-edge-to-origin', 'dist', 'index.js'))
    ) {
      // Emit the config file from the construct options
      writeFileSync(
        path.join(__dirname, '..', '..', 'microapps-edge-to-origin', 'dist', 'config.yml'),
        edgeToOriginConfigYaml,
      );
      // copyFileSync(
      //   path.join(__dirname, '..', '..', '..', 'configs', 'microapps-edge-to-origin', 'config.yml'),
      //   path.join(__dirname, '..', '..', 'microapps-edge-to-origin', 'dist', 'config.yml'),
      // );
      // This is for tests run under jest
      // This is also for anytime when the edge function has already been bundled
      this._edgeToOriginFunction = new cf.experimental.EdgeFunction(this, 'edge-to-apigwy-func', {
        code: lambda.Code.fromAsset(
          path.join(__dirname, '..', '..', 'microapps-edge-to-origin', 'dist'),
        ),
        handler: 'index.handler',
        ...edgeToOriginFuncProps,
      });
    } else if (existsSync(path.join(__dirname, 'microapps-edge-to-origin', 'index.js'))) {
      // Emit the config file from the construct options
      writeFileSync(
        path.join(__dirname, 'microapps-edge-to-origin', 'config.yml'),
        edgeToOriginConfigYaml,
      );

      // This is for built apps packaged with the CDK construct
      this._edgeToOriginFunction = new cf.experimental.EdgeFunction(this, 'edge-to-apigwy-func', {
        code: lambda.Code.fromAsset(path.join(__dirname, 'microapps-edge-to-origin')),
        handler: 'index.handler',
        ...edgeToOriginFuncProps,
      });
    } else {
      // Emit the config file from the construct options
      writeFileSync(
        path.join(__dirname, '..', '..', 'microapps-edge-to-origin', 'config.yml'),
        edgeToOriginConfigYaml,
      );

      // This builds the function for distribution with the CDK Construct
      // and will be used during local builds and PR builds of microapps-core
      // if the microapps-edge-to-origin function is not already bundled.
      // This will fail to deploy in any region other than us-east-1
      // We cannot use NodejsFunction because it will not create in us-east-1
      this._edgeToOriginFunction = new lambdaNodejs.NodejsFunction(this, 'edge-to-apigwy-func', {
        entry: path.join(__dirname, '..', '..', 'microapps-edge-to-origin', 'src', 'index.ts'),
        handler: 'handler',
        bundling: {
          minify: true,
          sourceMap: true,
          commandHooks: {
            beforeInstall: () => [],
            beforeBundling: () => [],
            afterBundling: (_inputDir: string, outputDir: string) => {
              return [
                `${os.platform() === 'win32' ? 'copy' : 'cp'} ${path.join(
                  __dirname,
                  '..',
                  '..',
                  '..',
                  'configs',
                  'microapps-edge-to-origin',
                  'config.yml',
                )} ${outputDir}`,
              ];
            },
          },
        },
        ...edgeToOriginFuncProps,
      });

      if (removalPolicy) {
        this._edgeToOriginFunction.applyRemovalPolicy(removalPolicy);
      }
    }

    // const edgeToOriginFuncAlias = this._edgeToOriginFunction.addAlias('CloudfrontVersion');

    //
    // CloudFront Distro
    //
    const apiGwyOrigin = new cforigins.HttpOrigin(httpOriginFQDN, {
      protocolPolicy: cf.OriginProtocolPolicy.HTTPS_ONLY,
      originSslProtocols: [cf.OriginSslPolicy.TLS_V1_2],
    });
    const apiGwyOriginEdgeLambdas = [
      {
        eventType: cf.LambdaEdgeEventType.ORIGIN_REQUEST,
        functionVersion: this._edgeToOriginFunction.currentVersion,
        includeBody: true,
      },
    ];
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
        edgeLambdas: apiGwyOriginEdgeLambdas,
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
      apigwyEdgeFunctions: apiGwyOriginEdgeLambdas,
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
