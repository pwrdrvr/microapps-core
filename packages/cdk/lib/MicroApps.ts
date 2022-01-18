import { Aws, CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as r53 from 'aws-cdk-lib/aws-route53';
import {
  MicroApps as MicroAppsCDK,
  MicroAppsProps as MicroAppsCDKProps,
} from '@pwrdrvr/microapps-cdk';
import { DemoApp } from './DemoApp';
// import { MicroAppsAppRelease } from '@pwrdrvr/microapps-app-release-cdk';
import { Env } from './Types';
// import { MicroAppsAppNextjsDemo } from '@pwrdrvr/microapps-app-nextjs-demo-cdk';

export interface MicroAppsStackProps extends StackProps {
  /**
   * Duration before stack is automatically deleted.
   * Requires that autoDeleteEverything be set to true.
   *
   */
  readonly ttl?: Duration;

  /**
   * Automatically destroy all assets when stack is deleted
   *
   * @default false
   */
  readonly autoDeleteEverything?: boolean;

  /**
   * Optional domain name for CloudFront distribution
   *
   * @default auto-assigned
   */
  readonly domainNameEdge?: string;

  /**
   * Optional domain name for API Gateway
   *
   * @default auto-assigned
   */
  readonly domainNameOrigin?: string;

  /**
   * Optional Route53 zone name for custom names
   */
  readonly r53ZoneName?: string;

  /**
   * Optional Route53 zone id for custom names
   */
  readonly r53ZoneID?: string;

  /**
   * Optional US East 1 ACM cert for custom names
   */
  readonly certARNEdge?: string;

  /**
   * Optional local region cert for custom names
   */
  readonly certARNOrigin?: string;

  /**
   * Principal ARNs (e.g. Users not Assumed Roles) that should
   * bypass the strict S3 Bucket Policy
   */
  readonly s3PolicyBypassPrincipalARNs?: string[];

  /**
   * AROAs (e.g. Role AROAs) that should bypass the strict
   * S3 Bucket Policy
   */
  readonly s3PolicyBypassAROAs?: string[];

  /**
   * Use a strict S3 bucket policy
   *
   * @default false
   */
  readonly s3StrictBucketPolicy?: boolean;

  /**
   * Optional asset name root
   *
   * @example microapps
   * @default - resource names auto assigned
   */
  readonly assetNameRoot?: string;

  /**
   * Optional asset name suffix
   *
   * @example -dev-pr-12
   * @default none
   */
  readonly assetNameSuffix?: string;

  /**
   * Deploy the Release app
   *
   * @default false
   */
  readonly deployReleaseApp?: boolean;

  /**
   * Deploy Serverless Next.js Demo app
   *
   * @default false
   */
  readonly deployNextjsDemoApp?: boolean;

  /**
   * Deploy the Demo app
   *
   * @default false
   */
  readonly deployDemoApp?: boolean;

  /**
   * NODE_ENV to pass to apps
   *
   * @default dev
   */
  readonly nodeEnv?: Env;

  /**
   * Path prefix on the root of the CloudFront distribution
   *
   * @example dev/
   */
  readonly rootPathPrefix?: string;
}

export class MicroAppsStack extends Stack {
  /**
   * Create the MicroApps Construct
   *
   * @param scope
   * @param id
   * @param props
   */
  constructor(scope: Construct, id: string, props?: MicroAppsStackProps) {
    super(scope, id, props);

    if (props === undefined) {
      throw new Error('props must be set');
    }

    const {
      ttl,
      autoDeleteEverything = false,
      domainNameEdge,
      domainNameOrigin,
      s3PolicyBypassPrincipalARNs,
      s3PolicyBypassAROAs,
      s3StrictBucketPolicy = false,
      assetNameRoot,
      assetNameSuffix,
      deployReleaseApp = false,
      deployNextjsDemoApp = false,
      deployDemoApp = false,
      nodeEnv = 'dev',
      r53ZoneID,
      r53ZoneName,
      certARNEdge,
      certARNOrigin,
      rootPathPrefix,
    } = props;

    let removalPolicy: RemovalPolicy | undefined = undefined;
    // Set stack to delete if this is a PR build
    if (ttl !== undefined) {
      if (autoDeleteEverything === false) {
        throw new Error('autoDeleteEverything must be true when ttl is set');
      }
      removalPolicy = RemovalPolicy.DESTROY;
      // TODO: Reinstate when CDK 2 version is available
      // new TimeToLive(this, 'TimeToLive', {
      //   ttl,
      // });
    } else {
      if (autoDeleteEverything) {
        removalPolicy = RemovalPolicy.DESTROY;
      }
    }

    // Validate custom domain options
    if (domainNameEdge !== undefined) {
      if (
        domainNameOrigin === undefined ||
        certARNEdge === undefined ||
        certARNOrigin === undefined ||
        r53ZoneName === undefined ||
        r53ZoneID === undefined
      ) {
        throw new Error(
          'Either all of `domainNameEdge, domainNameOrigin, certARNEdge, certARNOrigin, r53ZoneName, and r53ZoneID`, must be defined or they must all be undefined',
        );
      }
    }

    const optionalCustomDomainOpts: Partial<MicroAppsCDKProps> =
      domainNameEdge !== undefined
        ? {
            domainNameEdge,
            domainNameOrigin,
            // CloudFront certificate
            // Note: Must be in US East 1
            certEdge: acm.Certificate.fromCertificateArn(this, 'cert-edge', certARNEdge as string),

            // Specific cert for API Gateway
            // Note: Must be in region where CDK stack is deployed
            certOrigin: acm.Certificate.fromCertificateArn(
              this,
              'cert-origin',
              certARNOrigin as string,
            ),
            r53Zone: r53.HostedZone.fromHostedZoneAttributes(this, 'microapps-zone', {
              zoneName: r53ZoneName as string,
              hostedZoneId: r53ZoneID as string,
            }),
          }
        : {};

    const optionals3PolicyOpts: Partial<MicroAppsCDKProps> = {
      // Note: these can be undefined, which is ok if s3Strict is false
      s3PolicyBypassAROAs,
      s3PolicyBypassPrincipalARNs,
      s3StrictBucketPolicy,
    };

    const optionalAssetNameOpts: Partial<MicroAppsCDKProps> = {
      assetNameRoot,
      assetNameSuffix,
    };

    const microapps = new MicroAppsCDK(this, 'microapps', {
      removalPolicy,
      appEnv: nodeEnv,
      rootPathPrefix,
      ...optionalAssetNameOpts,
      ...optionals3PolicyOpts,
      ...optionalCustomDomainOpts,
    });

    if (deployDemoApp) {
      const demoApp = new DemoApp(this, 'demo-app', {
        appName: 'demo-app',
        assetNameRoot,
        assetNameSuffix,
        removalPolicy,
      });

      new CfnOutput(this, 'demo-app-func-name', {
        value: `${demoApp.lambdaFunction.functionName}`,
        exportName: `${this.stackName}-demo-app-func-name`,
      });
    }

    let sharpLayer: lambda.ILayerVersion | undefined = undefined;
    if (deployReleaseApp || deployNextjsDemoApp) {
      sharpLayer = lambda.LayerVersion.fromLayerVersionArn(
        this,
        'sharp-lambda-layer',
        `arn:aws:lambda:${Aws.REGION}:${Aws.ACCOUNT_ID}:layer:sharp-heic:1`,
      );
    }

    // if (deployReleaseApp) {
    //   const app = new MicroAppsAppRelease(this, 'release-app', {
    //     functionName: assetNameRoot ? `${assetNameRoot}-app-release${assetNameSuffix}` : undefined,
    //     table: microapps.svcs.table,
    //     staticAssetsS3Bucket: microapps.s3.bucketApps,
    //     nodeEnv,
    //     removalPolicy,
    //     sharpLayer,
    //   });

    //   new CfnOutput(this, 'release-app-func-name', {
    //     value: `${app.lambdaFunction.functionName}`,
    //     exportName: `${this.stackName}-release-app-func-name`,
    //   });
    // }

    // if (deployNextjsDemoApp) {
    //   const app = new MicroAppsAppNextjsDemo(this, 'nextjs-demo-app', {
    //     functionName: assetNameRoot
    //       ? `${assetNameRoot}-app-nextjs-demo${assetNameSuffix}`
    //       : undefined,
    //     table: microapps.svcs.table,
    //     staticAssetsS3Bucket: microapps.s3.bucketApps,
    //     nodeEnv,
    //     removalPolicy,
    //     sharpLayer,
    //   });

    //   new CfnOutput(this, 'nextjs-demo-app-func-name', {
    //     value: `${app.lambdaFunction.functionName}`,
    //     exportName: `${this.stackName}-nextjs-demo-app-func-name`,
    //   });
    // }

    // Exports
    new CfnOutput(this, 'edge-domain-name', {
      value: domainNameEdge ? domainNameEdge : microapps.cf.cloudFrontDistro.domainName,
      exportName: `${this.stackName}-edge-domain-name`,
    });
    new CfnOutput(this, 'dynamodb-table-name', {
      value: `${microapps.svcs.table.tableName}`,
      exportName: `${this.stackName}-dynamodb-table-name`,
    });
    new CfnOutput(this, 'deployer-func-name', {
      value: `${microapps.svcs.deployerFunc.functionName}`,
      exportName: `${this.stackName}-deployer-func-name`,
    });
  }
}
