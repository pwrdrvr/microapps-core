import { Construct } from 'constructs';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';

/**
 * Properties to initialize an instance of `DemoApp`.
 */
export interface DemoAppProps {
  /**
   * Removal policy
   *
   * @default - per resource defaults
   */
  readonly removalPolicy?: RemovalPolicy;

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

/**
 * Represents a `DemoApp`
 */
export interface IDemoApp {
  lambdaFunction: lambda.IFunction;
}

/**
 * DemoApp with Lambda function.
 *
 * @remarks
 * Used to confirm correct functioning of a `MicroApps` construct
 * after deploy.
 */
export class DemoApp extends Construct implements IDemoApp {
  private _lambdaFunction: lambda.Function;
  public get lambdaFunction(): lambda.IFunction {
    return this._lambdaFunction;
  }

  constructor(scope: Construct, id: string, props: DemoAppProps) {
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
      timeout: Duration.seconds(3),
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
