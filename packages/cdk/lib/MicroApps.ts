import * as cdk from '@aws-cdk/core';
import { TimeToLive } from '@cloudcomponents/cdk-temp-stack';
import { MicroApps as MicroAppsCDK } from '@pwrdrvr/microapps-cdk';
import { Imports } from './Imports';
import { SharedProps } from './SharedProps';

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

  readonly domainNameEdge: string;
  readonly domainNameOrigin: string;

  readonly shared: SharedProps;
}

export class MicroAppsStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: MicroAppsStackProps) {
    super(scope, id, props);

    if (props === undefined) {
      throw new Error('props must be set');
    }

    const { ttl, autoDeleteEverything = false, shared } = props;

    // Set stack to delete if this is a PR build
    if (ttl !== undefined) {
      if (autoDeleteEverything === false) {
        throw new Error('autoDeleteEverything must be true when ttl is set');
      }
      new TimeToLive(this, 'TimeToLive', {
        ttl,
      });
    }

    const imports = new Imports(this, 'microapps-imports', {
      shared,
    });

    new MicroAppsCDK(this, 'microapps', {
      account: shared.account,
      region: shared.region,
      appEnv: shared.env,
      assetNameRoot: `${shared.stackName}`,
      assetNameSuffix: `${shared.envSuffix}${shared.prSuffix}`,
      domainNameEdge: props.domainNameEdge,
      domainNameOrigin: props.domainNameOrigin,
      certEdge: imports.certEdge,
      certOrigin: imports.certOrigin,
      domainName: shared.domainName,
      r53ZoneID: shared.r53ZoneID,
      r53ZoneName: shared.r53ZoneName,
      s3PolicyBypassAROAs: shared.s3PolicyBypassAROAs,
      s3PolicyBypassPrincipalARNs: shared.s3PolicyBypassPrincipalARNs,
      s3StrictBucketPolicy: shared.s3StrictBucketPolicy,
      autoDeleteEverything,
    });
  }
}
