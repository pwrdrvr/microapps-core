#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { TimeToLive } from '@cloudcomponents/cdk-temp-stack';
import { MicroAppsCF } from '../lib/MicroAppsCF';
import { MicroAppsSvcs } from '../lib/MicroAppsSvcs';
import { MicroAppsS3 } from '../lib/MicroAppsS3';
import SharedTags from '../lib/SharedTags';
import { Imports } from '../lib/Imports';
import SharedProps from '../lib/SharedProps';

interface IMicroAppsProps extends cdk.StackProps {
  readonly local: {
    /**
     * Duration before stack is automatically deleted.
     * Requires that autoDeleteEverything be set to true.
     *
     */
    readonly ttl?: cdk.Duration;

    /**
     * Duration before stack is automatically deleted.
     * Requires that autoDeleteEverything be set to true.
     *
     * @default false
     */
    readonly autoDeleteEverything?: boolean;
  };
  readonly shared: SharedProps;
}

export class MicroApps extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: IMicroAppsProps) {
    super(scope, id, props);

    if (props === undefined) {
      throw new Error('props must be set');
    }

    const { shared, local } = props;
    const { ttl, autoDeleteEverything: autoDeleteItems = false } = local;

    // Set stack to delete if this is a PR build
    if (ttl !== undefined) {
      if (autoDeleteItems === false) {
        throw new Error('autoDeleteItems must be true when ttl is set');
      }
      new TimeToLive(this, 'TimeToLive', {
        ttl,
      });
    }

    SharedTags.addSharedTags(this);

    const domainNameEdge = `apps${shared.envDomainSuffix}${shared.prSuffix}.${shared.domainName}`;
    const domainNameOrigin = `apps-origin${shared.envDomainSuffix}${shared.prSuffix}.${shared.domainName}`;

    const imports = new Imports(this, `microapps-imports${shared.envSuffix}${shared.prSuffix}`, {
      shared,
      local: {},
    });
    const s3 = new MicroAppsS3(this, `microapps-s3${shared.envSuffix}${shared.prSuffix}`, {
      autoDeleteEverything: autoDeleteItems,
      shared,
    });
    const cf = new MicroAppsCF(this, `microapps-cloudfront${shared.envSuffix}${shared.prSuffix}`, {
      shared,
      autoDeleteEverything: autoDeleteItems,
      local: {
        cert: imports.certEdge,
        domainNameEdge,
        domainNameOrigin,
      },
      s3Exports: s3,
    });
    const svcs = new MicroAppsSvcs(this, `microapps-svcs${shared.envSuffix}${shared.prSuffix}`, {
      cfStackExports: cf,
      s3Exports: s3,
      autoDeleteEverything: autoDeleteItems,
      local: {
        domainNameEdge,
        domainNameOrigin,
        cert: imports.certOrigin,
      },
      shared,
    });
  }
}
