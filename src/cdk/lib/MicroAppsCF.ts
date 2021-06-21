import * as cdk from '@aws-cdk/core';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as cforigins from '@aws-cdk/aws-cloudfront-origins';
import * as cf from '@aws-cdk/aws-cloudfront';
import * as acm from '@aws-cdk/aws-certificatemanager';
import { IMicroAppsS3Exports } from './MicroAppsS3';

export interface IMicroAppsCFExports {
  cloudFrontOAI: cloudfront.OriginAccessIdentity;
  cloudFrontDistro: cloudfront.Distribution;
}

interface IMicroAppsCFProps extends cdk.StackProps {
  local: {
    cert: acm.ICertificate;
    domainName: string;
    domainNameOrigin: string;
  };
  s3Exports: IMicroAppsS3Exports;
}

export class MicroAppsCF extends cdk.Stack implements IMicroAppsCFExports {
  private _cloudFrontOAI: cloudfront.OriginAccessIdentity;
  public get cloudFrontOAI(): cloudfront.OriginAccessIdentity {
    return this._cloudFrontOAI;
  }

  private _cloudFrontDistro: cloudfront.Distribution;
  public get cloudFrontDistro(): cloudfront.Distribution {
    return this._cloudFrontDistro;
  }

  constructor(scope: cdk.Construct, id: string, props?: IMicroAppsCFProps) {
    super(scope, id, props);

    if (props === undefined) {
      throw new Error('props must be set');
    }

    //
    // CloudFront Distro
    //
    const apiGwyOrigin = new cforigins.HttpOrigin(props.local.domainNameOrigin, {
      protocolPolicy: cf.OriginProtocolPolicy.HTTPS_ONLY,
      originSslProtocols: [cf.OriginSslPolicy.TLS_V1_2],
    });
    this._cloudFrontDistro = new cf.Distribution(this, 'microapps-cloudfront', {
      domainNames: [props.local.domainName],
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
      logFilePrefix: `${props.local.domainName.split('.').reverse().join('.')}/cloudfront-raw/`,
    });

    // Create S3 Origin Identity
    this._cloudFrontOAI = new cf.OriginAccessIdentity(this, 'microapps-oai', {
      comment: 'cloudfront-access',
    });

    //
    // Add Origins
    //
    const statics3 = new cforigins.S3Origin(props.s3Exports.bucketApps, {
      originAccessIdentity: this.cloudFrontOAI,
    });

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
    this._cloudFrontDistro.addBehavior('/deployer/*', apiGwyOrigin, apiGwyBehavior);
    this._cloudFrontDistro.addBehavior('/*/*/api/*', apiGwyOrigin, apiGwyBehavior);
    this._cloudFrontDistro.addBehavior('/*/*/static/*', statics3, s3Behavior);
    this._cloudFrontDistro.addBehavior('/*/*/*.*', statics3, s3Behavior);
    this._cloudFrontDistro.addBehavior('/*/*/', apiGwyOrigin, apiGwyVersionRootBehavior);
  }
}
