import * as acm from '@aws-cdk/aws-certificatemanager';
import * as cdk from '@aws-cdk/core';
import { MicroAppsCF } from './MicroAppsCF';
import { MicroAppsS3 } from './MicroAppsS3';
import { MicroAppsSvcs } from './MicroAppsSvcs';

export interface MicroAppsProps extends cdk.StackProps {
  /**
   * Automatically destroy all assets when stack is deleted
   *
   * @default false
   */
  readonly autoDeleteEverything?: boolean;

  readonly appEnv: string;

  readonly assetNameRoot: string;
  readonly assetNameSuffix?: string;

  readonly reverseDomainName: string;

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

export class MicroApps extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: MicroAppsProps) {
    super(scope, id, props);

    if (props === undefined) {
      throw new Error('props must be set');
    }

    const s3 = new MicroAppsS3(this, 'microapps-s3', {
      microapps: props,
    });
    const cf = new MicroAppsCF(this, 'microapps-cloudfront', {
      microapps: props,
      s3Exports: s3,
    });
    new MicroAppsSvcs(this, 'microapps-svcs', {
      microapps: props,
      cfStackExports: cf,
      s3Exports: s3,
    });
  }
}
