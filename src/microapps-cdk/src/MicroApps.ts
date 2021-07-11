import * as acm from '@aws-cdk/aws-certificatemanager';
import * as cdk from '@aws-cdk/core';
import { MicroAppsCF } from './MicroAppsCF';
import { MicroAppsS3 } from './MicroAppsS3';
import { MicroAppsSvcs } from './MicroAppsSvcs';

export interface MicroAppsProps {
  /**
   * Automatically destroy all assets when stack is deleted
   *
   * @default false
   */
  readonly autoDeleteEverything?: boolean;

  readonly appEnv: string;

  readonly assetNameRoot: string;
  readonly assetNameSuffix?: string;

  readonly domainName: string;

  readonly r53ZoneName: string;

  readonly r53ZoneID: string;

  readonly certEdge: acm.ICertificate;

  readonly certOrigin: acm.ICertificate;

  readonly s3PolicyBypassRoleName: string;

  readonly s3PolicyBypassAROA: string;

  readonly account: string;

  readonly region: string;

  readonly domainNameEdge: string;

  readonly domainNameOrigin: string;
}

export class MicroApps extends cdk.Construct {
  // input like 'example.com.' will return as 'com.example'
  private static reverseDomain(domain: string): string {
    let parts = domain.split('.').reverse();
    if (parts[0] === '') {
      parts = parts.slice(1);
    }
    return parts.join('.');
  }

  constructor(scope: cdk.Construct, id: string, props?: MicroAppsProps) {
    super(scope, id);

    if (props === undefined) {
      throw new Error('props must be set');
    }

    const {
      domainName,
      domainNameEdge,
      domainNameOrigin,
      assetNameRoot,
      assetNameSuffix = '',
      autoDeleteEverything = false,
      r53ZoneID,
      r53ZoneName,
      certEdge,
      account,
      region,
      appEnv,
      certOrigin,
      s3PolicyBypassAROA,
      s3PolicyBypassRoleName,
    } = props;
    const reverseDomainName = MicroApps.reverseDomain(domainName);

    const s3 = new MicroAppsS3(this, 'microapps-s3', {
      reverseDomainName,
      assetNameRoot,
      assetNameSuffix,
    });
    const cf = new MicroAppsCF(this, 'microapps-cloudfront', {
      s3Exports: s3,
      assetNameRoot,
      assetNameSuffix,
      domainName,
      reverseDomainName,
      domainNameEdge,
      domainNameOrigin,
      autoDeleteEverything,
      r53ZoneID,
      r53ZoneName,
      certEdge,
    });
    new MicroAppsSvcs(this, 'microapps-svcs', {
      cfStackExports: cf,
      s3Exports: s3,
      assetNameRoot,
      assetNameSuffix,
      domainName,
      reverseDomainName,
      domainNameEdge,
      domainNameOrigin,
      autoDeleteEverything,
      r53ZoneID,
      r53ZoneName,
      account,
      region,
      appEnv,
      certOrigin,
      s3PolicyBypassAROA,
      s3PolicyBypassRoleName,
    });
  }
}
