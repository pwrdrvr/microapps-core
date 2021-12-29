import * as apigwy from '@aws-cdk/aws-apigatewayv2';
import * as acm from '@aws-cdk/aws-certificatemanager';
import * as iam from '@aws-cdk/aws-iam';
import * as logs from '@aws-cdk/aws-logs';
import * as r53 from '@aws-cdk/aws-route53';
import * as r53targets from '@aws-cdk/aws-route53-targets';
import * as cdk from '@aws-cdk/core';

export interface MicroAppsAPIGwyProps {
  /**
   * RemovalPolicy override for child resources
   *
   * Note: if set to DESTROY the S3 buckes will have `autoDeleteObjects` set to `true`
   *
   * @default - per resource default
   */
  readonly removalPolicy?: cdk.RemovalPolicy;

  /**
   * CloudFront edge domain name
   *
   * @example apps.pwrdrvr.com
   * @default auto-assigned
   */
  readonly domainNameEdge?: string;

  /**
   * API Gateway origin domain name
   *
   * @example apps-origin.pwrdrvr.com
   * @default auto-assigned
   */
  readonly domainNameOrigin?: string;

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
   * Optional local region ACM certificate to use for API Gateway
   * Note: required when using a custom domain
   *
   * @default none
   */
  readonly certOrigin?: acm.ICertificate;

  /**
   * Route53 zone in which to create optional `domainNameEdge` record
   */
  readonly r53Zone?: r53.IHostedZone;

  /**
   * Path prefix on the root of the API Gateway Stage
   *
   * @example dev/
   * @default none
   */
  readonly rootPathPrefix?: string;
}

export interface IMicroAppsAPIGwy {
  /**
   * Domain Name applied to API Gateway origin
   */
  readonly dnAppsOrigin?: apigwy.IDomainName;

  /**
   * API Gateway
   */
  readonly httpApi: apigwy.HttpApi;
}

export class MicroAppsAPIGwy extends cdk.Construct implements IMicroAppsAPIGwy {
  private _dnAppsOrigin: apigwy.DomainName | undefined;
  public get dnAppsOrigin(): apigwy.IDomainName | undefined {
    return this._dnAppsOrigin;
  }

  private _httpApi: apigwy.HttpApi;
  public get httpApi(): apigwy.HttpApi {
    return this._httpApi;
  }

  /**
   * MicroApps - Create just API Gateway
   * @param scope
   * @param id
   * @param props
   */
  constructor(scope: cdk.Construct, id: string, props?: MicroAppsAPIGwyProps) {
    super(scope, id);

    if (props === undefined) {
      throw new Error('props cannot be undefined');
    }

    if (
      (props.r53Zone === undefined && props.domainNameEdge !== undefined) ||
      (props.r53Zone !== undefined && props.domainNameEdge === undefined)
    ) {
      throw new Error('If either of r53Zone or domainNameEdge are set then the other must be set');
    }

    if (
      (props.domainNameOrigin === undefined && props.certOrigin !== undefined) ||
      (props.domainNameOrigin !== undefined && props.certOrigin === undefined)
    ) {
      throw new Error(
        'If either of domainNameOrigin or certOrigin are set then the other must be set',
      );
    }

    if (
      (props.domainNameEdge === undefined && props.certOrigin !== undefined) ||
      (props.domainNameEdge !== undefined && props.certOrigin === undefined)
    ) {
      throw new Error(
        'If either of domainNameOrigin or certOrigin are set then the other must be set',
      );
    }

    const {
      r53Zone,
      domainNameEdge,
      domainNameOrigin,
      certOrigin,
      removalPolicy,
      assetNameRoot,
      assetNameSuffix,
      rootPathPrefix,
    } = props;

    // API Gateway uses the `id` string as the gateway name without
    // any randomization... we have to make sure the name is unique-ish
    const apigatewayName = assetNameRoot
      ? `${assetNameRoot}${assetNameSuffix}`
      : `${cdk.Stack.of(this).stackName}-microapps`;

    //
    // APIGateway domain names for CloudFront and origin
    //
    this._httpApi = new apigwy.HttpApi(this, 'gwy', {
      apiName: apigatewayName,
      createDefaultStage: false,
    });
    if (removalPolicy !== undefined) {
      this._httpApi.applyRemovalPolicy(removalPolicy);
    }

    // Create the stage
    const stage = new apigwy.HttpStage(this, 'stage', {
      httpApi: this._httpApi,
      autoDeploy: true,
      // If rootPathPrefix is not defined this will be the $default stage
      stageName: rootPathPrefix,
    });

    if (domainNameEdge !== undefined && certOrigin !== undefined) {
      // Create Custom Domains for API Gateway
      const dnAppsEdge = new apigwy.DomainName(this, 'microapps-apps-edge-dn', {
        domainName: domainNameEdge,
        certificate: certOrigin,
      });
      if (removalPolicy !== undefined) {
        dnAppsEdge.applyRemovalPolicy(removalPolicy);
      }

      // Create the edge domain name mapping for the API
      new apigwy.ApiMapping(this, 'mapping', {
        api: this._httpApi,
        domainName: dnAppsEdge,
        stage,
      });
    }

    if (domainNameOrigin !== undefined && certOrigin !== undefined) {
      this._dnAppsOrigin = new apigwy.DomainName(this, 'origin-dn', {
        domainName: domainNameOrigin,
        certificate: certOrigin,
      });
      if (removalPolicy !== undefined) {
        this._dnAppsOrigin.applyRemovalPolicy(removalPolicy);
      }
    }

    // Enable access logs on API Gateway
    const apiAccessLogs = new logs.LogGroup(this, 'logs', {
      logGroupName: apigatewayName
        ? `/aws/apigwy/${apigatewayName}`
        : `/aws/apigwy/${this.httpApi.httpApiName}`,
      retention: logs.RetentionDays.TWO_WEEKS,
    });
    if (removalPolicy !== undefined) {
      apiAccessLogs.applyRemovalPolicy(removalPolicy);
    }
    // const stage = this._httpApi.defaultStage?.node.defaultChild as apigwy.CfnStage;
    (stage as unknown as apigwy.CfnStage).accessLogSettings = {
      destinationArn: apiAccessLogs.logGroupArn,
      format: JSON.stringify({
        requestId: '$context.requestId',
        userAgent: '$context.identity.userAgent',
        sourceIp: '$context.identity.sourceIp',
        requestTime: '$context.requestTime',
        requestTimeEpoch: '$context.requestTimeEpoch',
        httpMethod: '$context.httpMethod',
        path: '$context.path',
        status: '$context.status',
        protocol: '$context.protocol',
        responseLength: '$context.responseLength',
        domainName: '$context.domainName',
      }),
    };

    // Create a logging role
    // Tips: https://github.com/aws/aws-cdk/issues/11100
    const apiGwyLogRole = new iam.Role(this, 'logs-role', {
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AmazonAPIGatewayPushToCloudWatchLogs',
        ),
      ],
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
    });
    apiAccessLogs.grantWrite(apiGwyLogRole);

    //
    // Let API Gateway accept requests using domainNameOrigin
    // That is the origin URI that CloudFront uses for this gateway.
    // The gateway will refuse the traffic if it doesn't have the
    // domain name registered.
    //
    if (this._dnAppsOrigin !== undefined) {
      const mappingAppsApis = new apigwy.ApiMapping(this, 'api-map-origin', {
        api: this._httpApi,
        domainName: this._dnAppsOrigin,
        stage,
      });
      // 2021-12-12 - This should not be needed
      mappingAppsApis.node.addDependency(this._dnAppsOrigin);
      if (removalPolicy !== undefined) {
        mappingAppsApis.applyRemovalPolicy(removalPolicy);
      }
    }

    //
    // Create the origin name for API Gateway
    //
    if (r53Zone !== undefined && this._dnAppsOrigin) {
      const rrAppsOrigin = new r53.ARecord(this, 'origin-arecord', {
        zone: r53Zone,
        recordName: domainNameOrigin,
        target: r53.RecordTarget.fromAlias(
          new r53targets.ApiGatewayv2DomainProperties(
            this._dnAppsOrigin.regionalDomainName,
            this._dnAppsOrigin.regionalHostedZoneId,
          ),
        ),
      });
      if (removalPolicy !== undefined) {
        rrAppsOrigin.applyRemovalPolicy(removalPolicy);
      }
    }
  }
}
