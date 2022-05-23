import { existsSync, writeFileSync } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Aws, Duration, RemovalPolicy } from 'aws-cdk-lib';
import * as cf from 'aws-cdk-lib/aws-cloudfront';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

/**
 * Represents a MicroApps Edge to Origin Function
 */
export interface IMicroAppsEdgeToOrigin {
  /**
   * The edge to origin function for API Gateway Request Origin Edge Lambda
   *
   * The generated `config.yml` is included in the Lambda's code.
   */
  readonly edgeToOriginFunction: lambda.Function | cf.experimental.EdgeFunction;

  /**
   * Configuration of the edge to origin lambda functions
   */
  readonly edgeToOriginLambdas: cf.EdgeLambda[];
}

/**
 * Properties to initialize an instance of `MicroAppsCF`.
 */
export interface MicroAppsEdgeToOriginProps {
  /**
   * RemovalPolicy override for child resources
   *
   * Note: if set to DESTROY the S3 buckes will have `autoDeleteObjects` set to `true`
   *
   * @default - per resource default
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
   * Adds an X-Forwarded-Host-Header when calling API Gateway
   *
   * Can only be trusted if `signingMode` is enabled, which restricts
   * access to API Gateway to only IAM signed requests.
   *
   * Note: if true, creates OriginRequest Lambda @ Edge function for API Gateway Origin
   * @default true
   */
  readonly addXForwardedHostHeader?: boolean;

  /**
   * Replaces Host header (which will be the Edge domain name) with the Origin domain name
   * when enabled.  This is necessary when API Gateway has not been configured
   * with a custom domain name that matches the exact domain name used by the CloudFront
   * Distribution AND when the OriginRequestPolicy.HeadersBehavior is set
   * to pass all headers to the origin.
   *
   * Note: if true, creates OriginRequest Lambda @ Edge function for API Gateway Origin
   * @default true
   */
  readonly replaceHostHeader?: boolean;

  /**
   * Requires IAM auth on the API Gateway origin if not set to 'none'.
   *
   * 'sign' - Uses request headers for auth.
   * 'presign' - Uses query string for auth.
   *
   * If enabled,
   *
   * Note: if 'sign' or 'presign', creates OriginRequest Lambda @ Edge function for API Gateway Origin
   * @default 'sign'
   */
  readonly signingMode?: 'sign' | 'presign' | 'none';

  /**
   * Origin region that API Gateway will be deployed to, used
   * for the config.yml on the Edge function to sign requests for
   * the correct region
   *
   * @default undefined
   */
  readonly originRegion?: string;
}

export interface GenerateEdgeToOriginConfigOptions {
  readonly originRegion: string;
  readonly signingMode: 'sign' | 'presign' | '';
  readonly addXForwardedHostHeader: boolean;
  readonly replaceHostHeader: boolean;
}

/**
 * Create a new MicroApps Edge to Origin Function w/ `config.yml`
 */
export class MicroAppsEdgeToOrigin extends Construct implements IMicroAppsEdgeToOrigin {
  /**
   * Generate the yaml config for the edge lambda
   * @param props
   * @returns
   */
  public static generateEdgeToOriginConfig(props: GenerateEdgeToOriginConfigOptions) {
    return `originRegion: ${props.originRegion}
${props.signingMode === '' ? '' : `signingMode: ${props.signingMode}`}
addXForwardedHostHeader: ${props.addXForwardedHostHeader}
replaceHostHeader: ${props.replaceHostHeader}`;
  }

  private _edgeToOriginFunction: lambda.Function | cf.experimental.EdgeFunction;
  public get edgeToOriginFunction(): lambda.Function | cf.experimental.EdgeFunction {
    return this._edgeToOriginFunction;
  }

  private _edgeToOriginLambdas: cf.EdgeLambda[];
  public get edgeToOriginLambdas(): cf.EdgeLambda[] {
    return this._edgeToOriginLambdas;
  }

  constructor(scope: Construct, id: string, props: MicroAppsEdgeToOriginProps) {
    super(scope, id);

    if (props === undefined) {
      throw new Error('props must be set');
    }

    const {
      removalPolicy,
      assetNameRoot,
      assetNameSuffix,
      signingMode = 'sign',
      addXForwardedHostHeader = true,
      replaceHostHeader = true,
      originRegion,
    } = props;

    // Create the edge function config file from the construct options
    const edgeToOriginConfigYaml = MicroAppsEdgeToOrigin.generateEdgeToOriginConfig({
      originRegion: originRegion || Aws.REGION,
      addXForwardedHostHeader,
      replaceHostHeader,
      signingMode: signingMode === 'none' ? '' : signingMode,
    });

    //
    // Create the Edge to Origin Function
    //
    const edgeToOriginFuncProps: Omit<lambda.FunctionProps, 'handler' | 'code'> = {
      functionName: assetNameRoot ? `${assetNameRoot}-edge-to-origin${assetNameSuffix}` : undefined,
      memorySize: 1769,
      logRetention: logs.RetentionDays.ONE_MONTH,
      runtime: lambda.Runtime.NODEJS_14_X,
      timeout: Duration.seconds(5),
      initialPolicy: [
        // This can't have a reference to the httpApi because it would mean
        // the parent stack (this stack) has to be created before the us-east-1
        // child stack for the Edge Lambda Function.
        // That's why we use a tag-based policy to allow the Edge Function
        // to invoke any API Gateway API that we apply a tag to
        // We allow the edge function to sign for all regions since
        // we may use custom closest region in the future.
        new iam.PolicyStatement({
          actions: ['execute-api:Invoke'],
          resources: [`arn:aws:execute-api:*:${Aws.ACCOUNT_ID}:*/*/*/*`],
          // Unfortunately, API Gateway access cannot be restricted using
          // tags on the target resource
          // https://docs.aws.amazon.com/IAM/latest/UserGuide/access_tags.html
          // https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_aws-services-that-work-with-iam.html#networking_svcs
          // conditions: {
          //   // TODO: Set this to a string unique to each stack
          //   StringEquals: { 'aws:ResourceTag/microapp-managed': 'true' },
          // },
        }),
      ],
    };
    if (
      process.env.NODE_ENV === 'test' ||
      existsSync(path.join(__dirname, '..', '..', 'microapps-edge-to-origin', 'dist', 'index.js'))
    ) {
      // Emit the config file from the construct options
      writeFileSync(
        path.join(__dirname, '..', '..', 'microapps-edge-to-origin', 'dist', 'config.yml'),
        edgeToOriginConfigYaml,
      );
      // copyFileSync(
      //   path.join(__dirname, '..', '..', '..', 'configs', 'microapps-edge-to-origin', 'config.yml'),
      //   path.join(__dirname, '..', '..', 'microapps-edge-to-origin', 'dist', 'config.yml'),
      // );
      // This is for tests run under jest
      // This is also for anytime when the edge function has already been bundled
      this._edgeToOriginFunction = new cf.experimental.EdgeFunction(this, 'edge-to-apigwy-func', {
        code: lambda.Code.fromAsset(
          path.join(__dirname, '..', '..', 'microapps-edge-to-origin', 'dist'),
        ),
        handler: 'index.handler',
        ...edgeToOriginFuncProps,
      });
    } else if (existsSync(path.join(__dirname, 'microapps-edge-to-origin', 'index.js'))) {
      // Emit the config file from the construct options
      writeFileSync(
        path.join(__dirname, 'microapps-edge-to-origin', 'config.yml'),
        edgeToOriginConfigYaml,
      );

      // This is for built apps packaged with the CDK construct
      this._edgeToOriginFunction = new cf.experimental.EdgeFunction(this, 'edge-to-apigwy-func', {
        code: lambda.Code.fromAsset(path.join(__dirname, 'microapps-edge-to-origin')),
        handler: 'index.handler',
        ...edgeToOriginFuncProps,
      });
    } else {
      // Emit the config file from the construct options
      writeFileSync(
        path.join(__dirname, '..', '..', 'microapps-edge-to-origin', 'config.yml'),
        edgeToOriginConfigYaml,
      );

      // This builds the function for distribution with the CDK Construct
      // and will be used during local builds and PR builds of microapps-core
      // if the microapps-edge-to-origin function is not already bundled.
      // This will fail to deploy in any region other than us-east-1
      // We cannot use NodejsFunction because it will not create in us-east-1
      this._edgeToOriginFunction = new lambdaNodejs.NodejsFunction(this, 'edge-to-apigwy-func', {
        entry: path.join(__dirname, '..', '..', 'microapps-edge-to-origin', 'src', 'index.ts'),
        handler: 'handler',
        bundling: {
          minify: true,
          sourceMap: true,
          commandHooks: {
            beforeInstall: () => [],
            beforeBundling: () => [],
            afterBundling: (_inputDir: string, outputDir: string) => {
              return [
                `${os.platform() === 'win32' ? 'copy' : 'cp'} ${path.join(
                  __dirname,
                  '..',
                  '..',
                  '..',
                  'configs',
                  'microapps-edge-to-origin',
                  'config.yml',
                )} ${outputDir}`,
              ];
            },
          },
        },
        ...edgeToOriginFuncProps,
      });

      if (removalPolicy) {
        this._edgeToOriginFunction.applyRemovalPolicy(removalPolicy);
      }
    }

    this._edgeToOriginLambdas = [
      {
        eventType: cf.LambdaEdgeEventType.ORIGIN_REQUEST,
        functionVersion: this._edgeToOriginFunction.currentVersion,
        includeBody: true,
      },
    ];
  }
}
