import * as cdk from '@aws-cdk/core';
import * as r53 from '@aws-cdk/aws-route53';
import * as r53targets from '@aws-cdk/aws-route53-targets';
import { IMicroAppsSvcsExports } from './MicroAppsSvcs';
import { IMicroAppsCFExports } from './MicroAppsCF';

interface IMicroAppsR53StackProps extends cdk.StackProps {
  svcsExports: IMicroAppsSvcsExports;
  cfExports: IMicroAppsCFExports;
  local: {
    domainNameEdge: string;
    domainNameOrigin: string;
    zone: r53.IHostedZone;
  };
}

export class MicroAppsR53 extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: IMicroAppsR53StackProps) {
    super(scope, id, props);

    if (props === undefined) {
      throw new Error('props cannot be undefined');
    }
    if (props.env === undefined) {
      throw new Error('props.env cannot be undefined');
    }

    const { dnAppsOrigin } = props.svcsExports;
    const { domainNameOrigin, zone, domainNameEdge } = props.local;
    const { cloudFrontDistro } = props.cfExports;

    //
    // Create the edge name for the CloudFront distro
    //

    const rrAppsEdge = new r53.RecordSet(this, 'microapps-edge-arecord', {
      recordName: domainNameEdge,
      recordType: r53.RecordType.A,
      target: r53.RecordTarget.fromAlias(new r53targets.CloudFrontTarget(cloudFrontDistro)),
      zone,
    });

    //
    // Create the origin name for API Gateway
    //
    const rrAppsOrigin = new r53.ARecord(this, 'microapps-origin-arecord', {
      zone: zone,
      recordName: domainNameOrigin,
      target: r53.RecordTarget.fromAlias(
        new r53targets.ApiGatewayv2DomainProperties(
          dnAppsOrigin.regionalDomainName,
          dnAppsOrigin.regionalHostedZoneId,
        ),
      ),
    });
  }
}
