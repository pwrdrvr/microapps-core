import * as cdk from '@aws-cdk/core';
import { TimeToLive } from '@cloudcomponents/cdk-temp-stack';
import { MicroApps } from '@pwrdrvr/microapps-cdk';
import { Imports } from './Imports';

export interface MicroAppsStackProps extends cdk.StackProps {
  /**
   * Duration before stack is automatically deleted.
   * Requires that autoDeleteEverything be set to true.
   *
   */
  readonly ttl?: cdk.Duration;

  /**
   * Automatically destroy all assets when stack is deleted
   *
   * @default false
   */
  readonly autoDeleteEverything?: boolean;

  // readonly env: string;

  readonly assetRootName?: string;

  readonly reverseDomainName: string;

  readonly domainName: string;

  readonly r53ZoneName: string;

  readonly r53ZoneID: string;

  readonly certARNEdge: string;

  readonly certARNOrigin: string;

  readonly s3PolicyBypassRoleName: string;

  readonly s3PolicyBypassAROA: string;

  readonly account: string;

  readonly region: string;
}

export class MicroAppsStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: MicroAppsStackProps) {
    super(scope, id, props);

    if (props === undefined) {
      throw new Error('props must be set');
    }

    const { ttl, autoDeleteEverything = false } = props;

    // Set stack to delete if this is a PR build
    if (ttl !== undefined) {
      if (autoDeleteEverything === false) {
        throw new Error('autoDeleteEverything must be true when ttl is set');
      }
      new TimeToLive(this, 'TimeToLive', {
        ttl,
      });
    }

    const domainNameEdge = `apps${shared.envDomainSuffix}${shared.prSuffix}.${shared.domainName}`;
    const domainNameOrigin = `apps-origin${shared.envDomainSuffix}${shared.prSuffix}.${shared.domainName}`;

    const imports = new Imports(this, `microapps-imports${shared.envSuffix}${shared.prSuffix}`, {
      microapps: props,
    });
    const s3 = new MicroAppsS3(this, `microapps-s3${shared.envSuffix}${shared.prSuffix}`, {
      microapps: props,
    });
    const cf = new MicroAppsCF(this, `microapps-cloudfront${shared.envSuffix}${shared.prSuffix}`, {
      microapps: props,
      local: {
        cert: imports.certEdge,
        domainNameEdge,
        domainNameOrigin,
      },
      s3Exports: s3,
    });
    const svcs = new MicroAppsSvcs(this, `microapps-svcs${shared.envSuffix}${shared.prSuffix}`, {
      microapps: props,
      cfStackExports: cf,
      s3Exports: s3,
      autoDeleteEverything,
      local: {
        domainNameEdge,
        domainNameOrigin,
        cert: imports.certOrigin,
      },
    });
  }
}
