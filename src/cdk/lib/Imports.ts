import * as cdk from '@aws-cdk/core';
import * as acm from '@aws-cdk/aws-certificatemanager';
import * as r53 from '@aws-cdk/aws-route53';

export interface IImportsExports {
  certEdge: acm.ICertificate;
  certOrigin: acm.ICertificate;
  zone: r53.IHostedZone;
}

export class Imports extends cdk.Stack implements IImportsExports {
  private _certEdge: acm.ICertificate;
  public get certEdge(): acm.ICertificate {
    return this._certEdge;
  }
  private _certOrigin: acm.ICertificate;
  public get certOrigin(): acm.ICertificate {
    return this._certOrigin;
  }
  private _zone: r53.IHostedZone;
  public get zone(): r53.IHostedZone {
    return this._zone;
  }

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    if (props === undefined) {
      throw new Error('props must be set');
    }

    // CloudFront certificate
    // Note: Must be in US East 1
    this._certEdge = acm.Certificate.fromCertificateArn(
      this,
      'microapps-cloudfront-cert',
      'arn:aws:acm:us-east-1:***REMOVED***:certificate/e2434943-4295-4514-8f83-eeef556d8d09',
    );

    // Specific cert for API Gateway
    // Note: Must be in region where CDK stack is deployed
    const apiGwyCertArn =
      'arn:aws:acm:us-east-2:***REMOVED***:certificate/533cdfa2-0528-484f-bd53-0a0d0dc6159c';
    this._certOrigin = acm.Certificate.fromCertificateArn(
      this,
      'microapps-apigwy-cert',
      apiGwyCertArn,
    );

    this._zone = r53.HostedZone.fromHostedZoneAttributes(this, 'microapps-zone', {
      zoneName: 'pwrdrvr.com', // FIXME: domainNameOrigin (zone only)
      hostedZoneId: 'ZHYNI9F572BBD',
    });
  }
}
