import * as cdk from '@aws-cdk/core';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as s3 from '@aws-cdk/aws-s3';
import * as cforigins from '@aws-cdk/aws-cloudfront-origins';
import * as cf from '@aws-cdk/aws-cloudfront';
import * as acm from '@aws-cdk/aws-certificatemanager';
import * as r53 from '@aws-cdk/aws-route53';
import * as r53targets from '@aws-cdk/aws-route53-targets';

export interface ICloudFrontExports {
  CloudFrontOAI: cloudfront.OriginAccessIdentity;
  BucketApps: s3.IBucket;
}

export class CloudFront extends cdk.Stack implements ICloudFrontExports {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    //
    // S3 Bucket for Logging - Usable by many stacks
    //

    const bucketLogs = new s3.Bucket(this, 'logsBucket', {
      bucketName: 'pwrdrvr-logs',
    });

    //
    // CloudFront Distro
    //
    const apiGwyOrigin = new cforigins.HttpOrigin('appsapis.pwrdrvr.com', {
      protocolPolicy: cf.OriginProtocolPolicy.HTTPS_ONLY,
      originSslProtocols: [cf.OriginSslPolicy.TLS_V1_2],
    });
    const cfdistro = new cf.Distribution(this, 'cloudfront', {
      domainNames: ['apps.pwrdrvr.com'],
      certificate: acm.Certificate.fromCertificateArn(
        this,
        'splat.pwrdrvr.com',
        'arn:aws:acm:us-east-1:239161478713:certificate/e2434943-4295-4514-8f83-eeef556d8d09',
      ),
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
      logBucket: bucketLogs,
      logFilePrefix: 'com.pwrdrvr.apps/cloudfront-raw/',
    });

    // Create S3 Origin Identity
    this.BucketApps = s3.Bucket.fromBucketName(this, 'staticbucket', 'pwrdrvr-apps');
    this.CloudFrontOAI = new cf.OriginAccessIdentity(this, 'staticAccessIdentity', {
      comment: 'cloudfront-access',
    });

    //
    // Add Origins
    //
    const statics3 = new cforigins.S3Origin(this.BucketApps, {
      originAccessIdentity: this.CloudFrontOAI,
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
    cfdistro.addBehavior('/deployer/*', apiGwyOrigin, apiGwyBehavior);
    cfdistro.addBehavior('/*/*/api/*', apiGwyOrigin, apiGwyBehavior);
    cfdistro.addBehavior('/*/*/static/*', statics3, s3Behavior);
    cfdistro.addBehavior('/*/*/*.*', statics3, s3Behavior);
    cfdistro.addBehavior('/*/*/', apiGwyOrigin, apiGwyVersionRootBehavior);

    //
    // Route53 - Point apps.pwrdrvr.com at this distro
    //

    const hzonePwrDrvrCom = r53.HostedZone.fromLookup(this, 'hzonePwrDrvrCom', {
      domainName: 'pwrdrvr.com',
    });
    const rrAppsPwrDrvrCom = new r53.RecordSet(this, 'appspwrdrvrcom', {
      recordName: 'apps.pwrdrvr.com',
      recordType: r53.RecordType.A,
      target: r53.RecordTarget.fromAlias(new r53targets.CloudFrontTarget(cfdistro)),
      zone: hzonePwrDrvrCom,
    });
  }

  CloudFrontOAI: cloudfront.OriginAccessIdentity;
  BucketApps: s3.IBucket;
}
