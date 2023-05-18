import { CfnOutput, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { MicroAppsChildDeployer, MicroAppsChildDeployerProps } from '@pwrdrvr/microapps-cdk';
import { DemoApp } from './DemoApp';
import { Env } from './Types';
import { SharedTags } from './SharedTags';

/**
 * Properties to initialize an instance of `MicroAppsChildStack`.
 */
export interface MicroAppsChildStackProps extends StackProps {
  /**
   * Parent deployer Lambda ARN
   */
  readonly parentDeployerLambdaARN: string;

  /**
   * ARN of the IAM Role for the Edge to Origin Lambda Function
   *
   * For child accounts this can be blank as it is retrieved from the parent Deployer
   */
  readonly edgeToOriginRoleARN?: string;

  /**
   * Automatically destroy all assets when stack is deleted
   *
   * @default false
   */
  readonly autoDeleteEverything?: boolean;

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

export class MicroAppsChildStack extends Stack {
  constructor(scope: Construct, id: string, props?: MicroAppsChildStackProps) {
    super(scope, id, props);

    if (props === undefined) {
      throw new Error('props must be set');
    }

    SharedTags.addSharedTags(this);

    const {
      autoDeleteEverything = false,
      assetNameRoot,
      assetNameSuffix,
      nodeEnv = 'dev',
      parentDeployerLambdaARN,
      edgeToOriginRoleARN,
    } = props;

    let removalPolicy: RemovalPolicy | undefined = undefined;
    if (autoDeleteEverything) {
      removalPolicy = RemovalPolicy.DESTROY;
    }

    const optionalAssetNameOpts: Partial<MicroAppsChildDeployerProps> = {
      assetNameRoot,
      assetNameSuffix,
    };

    const microapps = new MicroAppsChildDeployer(this, 'microapps-deployer', {
      parentDeployerLambdaARN,
      edgeToOriginRoleARN,
      removalPolicy,
      appEnv: nodeEnv,
      ...optionalAssetNameOpts,
    });

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

    new CfnOutput(this, 'deployer-func-name', {
      value: `${microapps.deployerFunc.functionName}`,
      exportName: `${this.stackName}-deployer-func-name`,
    });

    new CfnOutput(this, 'deployer-func-arn', {
      value: `${microapps.deployerFunc.functionArn}`,
      exportName: `${this.stackName}-deployer-func-arn`,
    });
  }
}
