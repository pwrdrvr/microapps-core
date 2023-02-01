import { CfnOutput, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as r53 from 'aws-cdk-lib/aws-route53';
import { MicroApps, MicroAppsProps, MicroAppsTable } from '@pwrdrvr/microapps-cdk';
import { DemoApp } from './DemoApp';
import { Env } from './Types';
import { MicroAppsAppRelease } from '@pwrdrvr/microapps-app-release-cdk';
import { MicroAppsAppNextjsDemo } from '@pwrdrvr/microapps-app-nextjs-demo-cdk';
import { SharedTags } from './SharedTags';

/**
 * Properties to initialize an instance of `MicroAppsStack`.
 */
export interface MicroAppsStackProps extends StackProps {
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

  /** { @inheritdoc MicroAppsProps.s3StrictBucketPolicy } */
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

  /**
   * Origin region that API Gateway will be deployed to, used
   * for the config.yml on the Edge function to sign requests for
   * the correct region
   *
   * @default undefined
   */
  readonly originRegion?: string;

  /**
   * DynamoDB Table name - Needed for Edge routing
   */
  readonly tableName?: string;

  /**
   * Account IDs allowed for cross-account Function URL invocations
   *
   * @example ['123456789012']
   * @default []
   */
  readonly allowedFunctionUrlAccounts?: string[];
}

export class MicroAppsStack extends Stack {
  constructor(scope: Construct, id: string, props?: MicroAppsStackProps) {
    super(scope, id, props);

    if (props === undefined) {
      throw new Error('props must be set');
    }

    SharedTags.addSharedTags(this);

    const {
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
      originRegion,
      tableName,
      allowedFunctionUrlAccounts = [],
    } = props;

    let removalPolicy: RemovalPolicy | undefined = undefined;
    if (autoDeleteEverything) {
      removalPolicy = RemovalPolicy.DESTROY;
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

    const optionalCustomDomainOpts: Partial<MicroAppsProps> =
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

    const optionals3PolicyOpts: Partial<MicroAppsProps> = {
      // Note: these can be undefined, which is ok if s3Strict is false
      s3PolicyBypassAROAs,
      s3PolicyBypassPrincipalARNs,
      s3StrictBucketPolicy,
    };

    const optionalAssetNameOpts: Partial<MicroAppsProps> = {
      assetNameRoot,
      assetNameSuffix,
    };

    // The table has to be created with a defined name for
    // the 2nd generation routing that needs the table name
    // in the edge lambda function
    const table = new MicroAppsTable(this, 'microapps-table', {
      removalPolicy,
      ...(tableName ? { assetNameRoot: tableName } : optionalAssetNameOpts),
    });

    const microapps = new MicroApps(this, 'microapps', {
      removalPolicy,
      appEnv: nodeEnv,
      rootPathPrefix,
      originRegion,
      table: table.table,
      tableNameForEdgeToOrigin: tableName ? tableName : `${assetNameRoot}${assetNameSuffix}`,
      allowedFunctionUrlAccounts,
      ...optionalAssetNameOpts,
      ...optionals3PolicyOpts,
      ...optionalCustomDomainOpts,
    });

    // Give the current version an alias
    new lambda.Alias(this, 'deployer-alias', {
      aliasName: 'currentVersion',
      version: microapps.svcs.deployerFunc.currentVersion,
    });

    if (deployDemoApp) {
      const demoApp = new DemoApp(this, 'demo-app', {
        appName: 'demo-app',
        assetNameRoot,
        assetNameSuffix,
        removalPolicy,
      });

      const appVersion = (demoApp.lambdaFunction as lambda.Function).currentVersion;
      appVersion.applyRemovalPolicy(RemovalPolicy.RETAIN);

      new CfnOutput(this, 'demo-app-func-name', {
        value: `${demoApp.lambdaFunction.functionName}`,
        exportName: `${this.stackName}-demo-app-func-name`,
      });

      new CfnOutput(this, 'demo-app-vers-arn', {
        value: `${appVersion.functionArn}`,
        exportName: `${this.stackName}-demo-app-vers-arn`,
      });
    }

    if (deployReleaseApp) {
      const app = new MicroAppsAppRelease(this, 'release-app', {
        functionName: assetNameRoot ? `${assetNameRoot}-app-release${assetNameSuffix}` : undefined,
        table: microapps.svcs.table,
        nodeEnv,
        removalPolicy,
      });

      const appVersion = (app.lambdaFunction as lambda.Function).currentVersion;
      appVersion.applyRemovalPolicy(RemovalPolicy.RETAIN);

      new CfnOutput(this, 'release-app-func-name', {
        value: `${app.lambdaFunction.functionName}`,
        exportName: `${this.stackName}-release-app-func-name`,
      });

      new CfnOutput(this, 'release-app-vers-arn', {
        value: `${appVersion.functionArn}`,
        exportName: `${this.stackName}-release-app-vers-arn`,
      });
    }

    if (deployNextjsDemoApp) {
      const app = new MicroAppsAppNextjsDemo(this, 'nextjs-demo-app', {
        functionName: assetNameRoot
          ? `${assetNameRoot}-app-nextjs-demo${assetNameSuffix}`
          : undefined,
        nodeEnv,
        removalPolicy,
      });

      const appVersion = (app.lambdaFunction as lambda.Function).currentVersion;
      appVersion.applyRemovalPolicy(RemovalPolicy.RETAIN);

      new CfnOutput(this, 'nextjs-demo-app-func-name', {
        value: `${app.lambdaFunction.functionName}`,
        exportName: `${this.stackName}-nextjs-demo-app-func-name`,
      });

      new CfnOutput(this, 'nextjs-demo-app-vers-arn', {
        value: `${appVersion.functionArn}`,
        exportName: `${this.stackName}-nextjs-demo-app-vers-arn`,
      });
    }

    // Exports
    new CfnOutput(this, 'edge-domain-name', {
      value: domainNameEdge ? domainNameEdge : microapps.cf.cloudFrontDistro.domainName,
      exportName: `${this.stackName}-edge-domain-name`,
    });
    new CfnOutput(this, 'dynamodb-table-name', {
      value: `${tableName ? tableName : microapps.svcs.table.tableName}`,
      exportName: `${this.stackName}-dynamodb-table-name`,
    });
    new CfnOutput(this, 'deployer-func-name', {
      value: `${microapps.svcs.deployerFunc.functionName}`,
      exportName: `${this.stackName}-deployer-func-name`,
    });
    new CfnOutput(this, 'deployer-func-arn', {
      value: `${microapps.svcs.deployerFunc.functionArn}`,
      exportName: `${this.stackName}-deployer-func-arn`,
    });
  }
}
