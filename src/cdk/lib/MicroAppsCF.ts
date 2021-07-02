import * as cdk from '@aws-cdk/core';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as cforigins from '@aws-cdk/aws-cloudfront-origins';
import * as cf from '@aws-cdk/aws-cloudfront';
import * as r53 from '@aws-cdk/aws-route53';
import * as r53targets from '@aws-cdk/aws-route53-targets';
import * as acm from '@aws-cdk/aws-certificatemanager';
import { TimeToLive } from '@cloudcomponents/cdk-temp-stack';
import { IMicroAppsS3Exports } from './MicroAppsS3';
import SharedProps from './SharedProps';
import SharedTags from './SharedTags';

export interface IMicroAppsCFExports {
  cloudFrontDistro: cloudfront.Distribution;
}

interface IMicroAppsCFProps extends cdk.StackProps {
  local: {
    cert: acm.ICertificate;
    domainNameEdge: string;
    domainNameOrigin: string;
    ttl: cdk.Duration;
  };
  shared: SharedProps;
  s3Exports: IMicroAppsS3Exports;
}

export class MicroAppsCF extends cdk.Stack implements IMicroAppsCFExports {
  private _cloudFrontDistro: cloudfront.Distribution;
  public get cloudFrontDistro(): cloudfront.Distribution {
    return this._cloudFrontDistro;
  }

  constructor(scope: cdk.Construct, id: string, props?: IMicroAppsCFProps) {
    super(scope, id, props);

    if (props === undefined) {
      throw new Error('props must be set');
    }

    const { shared, s3Exports } = props;
    const { domainNameEdge, ttl } = props.local;
    const { r53ZoneID, r53ZoneName } = shared;

    // Set stack to delete if this is a PR build
    if (shared.isPR) {
      new TimeToLive(this, 'TimeToLive', {
        ttl,
      });
    }

    SharedTags.addEnvTag(this, shared.env, shared.isPR);

    //
    // CloudFront Distro
    //
    const apiGwyOrigin = new cforigins.HttpOrigin(props.local.domainNameOrigin, {
      protocolPolicy: cf.OriginProtocolPolicy.HTTPS_ONLY,
      originSslProtocols: [cf.OriginSslPolicy.TLS_V1_2],
    });
    this._cloudFrontDistro = new cf.Distribution(this, 'microapps-cloudfront', {
      comment: `${shared.stackName}${shared.envSuffix}${shared.prSuffix}`,
      domainNames: [props.local.domainNameEdge],
      certificate: props.local.cert,
      httpVersion: cf.HttpVersion.HTTP2,
      defaultBehavior: {
        allowedMethods: cf.AllowedMethods.ALLOW_ALL,
        cachePolicy: cf.CachePolicy.CACHING_DISABLED,
        compress: true,
        originRequestPolicy: cf.OriginRequestPolicy.ALL_VIEWER,
        origin: apiGwyOrigin,
        viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      enableIpv6: true,
      priceClass: cf.PriceClass.PRICE_CLASS_100,
      enableLogging: true,
      logBucket: props.s3Exports.bucketLogs,
      logFilePrefix: `${props.local.domainNameEdge.split('.').reverse().join('.')}/cloudfront-raw/`,
    });
    if (shared.isPR) {
      this._cloudFrontDistro.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    }

    //
    // Add Behaviors
    //
    const apiGwyBehavior: cf.AddBehaviorOptions = {
      allowedMethods: cf.AllowedMethods.ALLOW_ALL,
      cachePolicy: cf.CachePolicy.CACHING_DISABLED,
      compress: true,
      originRequestPolicy: cf.OriginRequestPolicy.ALL_VIEWER,
      viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    };
    const s3Behavior: cf.AddBehaviorOptions = {
      allowedMethods: cf.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      cachePolicy: cf.CachePolicy.CACHING_OPTIMIZED,
      compress: true,
      originRequestPolicy: cf.OriginRequestPolicy.CORS_S3_ORIGIN,
      viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    };
    const apiGwyVersionRootBehavior: cf.AddBehaviorOptions = {
      allowedMethods: cf.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      cachePolicy: cf.CachePolicy.CACHING_OPTIMIZED,
      compress: true,
      viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    };

    //
    // Setup Routes
    // Pull to the API first, then pull to S3 if it contains /static/
    // Pull anything under /appName/x.y.z/ folder with '.' in file name to S3
    // Let everything else fall through to the API Gateway
    //
    this._cloudFrontDistro.addBehavior('/*/*/api/*', apiGwyOrigin, apiGwyBehavior);
    this._cloudFrontDistro.addBehavior('/*/*/static/*', s3Exports.bucketAppsOrigin, s3Behavior);
    this._cloudFrontDistro.addBehavior('/*/*/*.*', s3Exports.bucketAppsOrigin, s3Behavior);
    this._cloudFrontDistro.addBehavior('/*/*/', apiGwyOrigin, apiGwyVersionRootBehavior);

    //
    // Create the edge name for the CloudFront distro
    //

    const zone = r53.HostedZone.fromHostedZoneAttributes(this, 'microapps-zone', {
      zoneName: r53ZoneName,
      hostedZoneId: r53ZoneID,
    });

    const rrAppsEdge = new r53.RecordSet(this, 'microapps-edge-arecord', {
      recordName: domainNameEdge,
      recordType: r53.RecordType.A,
      target: r53.RecordTarget.fromAlias(new r53targets.CloudFrontTarget(this._cloudFrontDistro)),
      zone,
    });
    if (shared.isPR) {
      rrAppsEdge.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    }
  }
}
