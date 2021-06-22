import * as cdk from '@aws-cdk/core';
import * as acm from '@aws-cdk/aws-certificatemanager';
import * as r53 from '@aws-cdk/aws-route53';

interface IImportsStackProps extends cdk.StackProps {
  local: {
    certARNEdge: string;
    certARNOrigin: string;
    r53ZoneName: string;
    r53ZoneID: string;
  };
}
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

  constructor(scope: cdk.Construct, id: string, props?: IImportsStackProps) {
    super(scope, id, props);

    if (props === undefined) {
      throw new Error('props must be set');
    }

    const { certARNEdge, certARNOrigin, r53ZoneID, r53ZoneName } = props.local;

    // CloudFront certificate
    // Note: Must be in US East 1
    this._certEdge = acm.Certificate.fromCertificateArn(this, 'microapps-cert-edge', certARNEdge);

    // Specific cert for API Gateway
    // Note: Must be in region where CDK stack is deployed
    this._certOrigin = acm.Certificate.fromCertificateArn(
      this,
      'microapps-cert-origin',
      certARNOrigin,
    );

    this._zone = r53.HostedZone.fromHostedZoneAttributes(this, 'microapps-zone', {
      zoneName: r53ZoneName,
      hostedZoneId: r53ZoneID,
    });
  }
}
