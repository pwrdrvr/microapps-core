import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import * as logs from '@aws-cdk/aws-logs';

export interface DemoAppProps {
  /**
   * Removal policy
   *
   * @default - per resource defaults
   */
  readonly removalPolicy?: cdk.RemovalPolicy;

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
   * Name of the application in microapps
   *
   * @default 'demo-app'
   */
  readonly appName?: string;
}

export interface IDemoApp {
  lambdaFunction: lambda.IFunction;
}

export class DemoApp extends cdk.Construct implements IDemoApp {
  private _lambdaFunction: lambda.Function;
  public get lambdaFunction(): lambda.IFunction {
    return this._lambdaFunction;
  }

  constructor(scope: cdk.Construct, id: string, props: DemoAppProps) {
    super(scope, id);

    const { appName = 'demo-app', assetNameRoot, assetNameSuffix, removalPolicy } = props;

    //
    // Lambda Function
    //
    this._lambdaFunction = new lambdaNodejs.NodejsFunction(this, 'app-lambda', {
      entry: './packages/demo-app/src/index.ts',
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'handler',
      functionName: assetNameRoot ? `${assetNameRoot}-app-${appName}${assetNameSuffix}` : undefined,
      logRetention: logs.RetentionDays.ONE_WEEK,
      memorySize: 512,
      timeout: cdk.Duration.seconds(3),
      bundling: {
        minify: true,
        sourceMap: true,
      },
    });
    if (removalPolicy !== undefined) {
      this._lambdaFunction.applyRemovalPolicy(removalPolicy);
    }
  }
}
