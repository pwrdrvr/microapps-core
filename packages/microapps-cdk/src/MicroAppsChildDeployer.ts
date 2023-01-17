import { existsSync } from 'fs';
import * as path from 'path';
import { Aws, Duration, RemovalPolicy } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

/**
 * Properties to initialize an instance of `MicroAppsChildDeployer`.
 */
export interface MicroAppsChildDeployerProps {
  /**
   * ARN of the parent Deployer Lambda Function
   */
  readonly parentDeployerLambdaARN: string;

  /**
   * RemovalPolicy override for child resources
   *
   * Note: if set to DESTROY the S3 buckes will have `autoDeleteObjects` set to `true`
   *
   * @default - per resource default
   */
  readonly removalPolicy?: RemovalPolicy;

  /**
   * Application environment, passed as `NODE_ENV`
   * to the Router and Deployer Lambda functions
   */
  readonly appEnv: string;

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
   * Deployer timeout
   *
   * For larger applications this needs to be set up to 2-5 minutes for the S3 copy
   *
   * @default 2 minutes
   */
  readonly deployerTimeout?: Duration;
}

/**
 * Represents a MicroApps Child Deployer
 */
export interface IMicroAppsChildDeployer {
  /**
   * Lambda function for the Deployer
   */
  readonly deployerFunc: lambda.IFunction;
}

/**
 * Create a new MicroApps Child Deployer construct.
 */
export class MicroAppsChildDeployer extends Construct implements IMicroAppsChildDeployer {
  private _deployerFunc: lambda.Function;
  public get deployerFunc(): lambda.IFunction {
    return this._deployerFunc;
  }

  constructor(scope: Construct, id: string, props?: MicroAppsChildDeployerProps) {
    super(scope, id);

    if (props === undefined) {
      throw new Error('props cannot be undefined');
    }

    const {
      appEnv,
      deployerTimeout = Duration.minutes(2),
      assetNameRoot,
      assetNameSuffix,
      removalPolicy,
      parentDeployerLambdaARN,
    } = props;

    //
    // Deployer Lambda Function
    //

    // Create Deployer Lambda Function
    const deployerFuncName = assetNameRoot
      ? `${assetNameRoot}-deployer${assetNameSuffix}`
      : undefined;
    const deployerFuncProps: Omit<lambda.FunctionProps, 'handler' | 'code'> = {
      functionName: deployerFuncName,
      memorySize: 1769,
      logRetention: logs.RetentionDays.ONE_MONTH,
      runtime: lambda.Runtime.NODEJS_16_X,
      timeout: deployerTimeout,
      environment: {
        NODE_ENV: appEnv,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        PARENT_DEPLOYER_LAMBDA_ARN: parentDeployerLambdaARN,
      },
    };
    if (
      process.env.NODE_ENV === 'test' &&
      existsSync(path.join(__dirname, '..', '..', 'microapps-deployer', 'dist', 'index.js'))
    ) {
      // This is for local dev
      this._deployerFunc = new lambda.Function(this, 'deployer-func', {
        code: lambda.Code.fromAsset(path.join(__dirname, '..', '..', 'microapps-deployer', 'dist')),
        handler: 'index.handler',
        ...deployerFuncProps,
      });
    } else if (existsSync(path.join(__dirname, 'microapps-deployer', 'index.js'))) {
      // This is for built apps packaged with the CDK construct
      this._deployerFunc = new lambda.Function(this, 'deployer-func', {
        code: lambda.Code.fromAsset(path.join(__dirname, 'microapps-deployer')),
        handler: 'index.handler',
        ...deployerFuncProps,
      });
    } else {
      this._deployerFunc = new lambdaNodejs.NodejsFunction(this, 'deployer-func', {
        entry: path.join(__dirname, '..', '..', 'microapps-deployer', 'src', 'index.ts'),
        handler: 'handler',
        bundling: {
          minify: true,
          sourceMap: true,
        },
        ...deployerFuncProps,
      });
    }
    if (removalPolicy !== undefined) {
      this._deployerFunc.applyRemovalPolicy(removalPolicy);
    }

    // Grant full control over lambdas that indicate they are microapps
    const policyAPIManageLambdas = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['lambda:*'],
      resources: [
        `arn:aws:lambda:${Aws.REGION}:${Aws.ACCOUNT_ID}:function:*`,
        `arn:aws:lambda:${Aws.REGION}:${Aws.ACCOUNT_ID}:function:*:*`,
      ],
      conditions: {
        StringEqualsIfExists: { 'aws:ResourceTag/microapp-managed': 'true' },
      },
    });
    this._deployerFunc.addToRolePolicy(policyAPIManageLambdas);
  }
}
