import * as cdk from '@aws-cdk/core';
import * as acm from '@aws-cdk/aws-certificatemanager';
import SharedProps from './SharedProps';

interface IImportsStackProps extends cdk.StackProps {
  local: {
    // None yet
  };
  shared: SharedProps;
}
export interface IImportsExports {
  certEdge: acm.ICertificate;
  certOrigin: acm.ICertificate;
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

  constructor(scope: cdk.Construct, id: string, props?: IImportsStackProps) {
    super(scope, id, props);

    if (props === undefined) {
      throw new Error('props must be set');
    }

    const { certARNEdge, certARNOrigin } = props.shared;

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
  }
}
