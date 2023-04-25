/* eslint-disable @typescript-eslint/indent */
import * as crypto from 'crypto';
import { copyFileSync, existsSync, writeFileSync } from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  Aws,
  CfnOutput,
  Duration,
  PhysicalName,
  RemovalPolicy,
  Stack,
  StackProps,
  Tags,
} from 'aws-cdk-lib';
import * as cf from 'aws-cdk-lib/aws-cloudfront';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
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

  /**
   * The IAM Role for the edge to origin function
   */
  readonly edgeToOriginRole: iam.Role;
}

/**
 * Properties to initialize an instance of `MicroAppsEdgeToOrigin`.
 */
export interface MicroAppsEdgeToOriginProps {
  /**
   * RemovalPolicy override for child resources
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
   * Path prefix on the root of the API Gateway Stage
   *
   * @example dev/
   * @default none
   */
  readonly rootPathPrefix?: string;

  /**
   * List of allowed locale prefixes for pages
   *
   * @example: ['en', 'fr', 'es']
   * @default none
   */
  readonly allowedLocalePrefixes?: string[];

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
   * Note that Lambda FunctionURLs get the region from the Lambda ARN
   * and do not need this to be configured.
   *
   * @default undefined
   */
  readonly originRegion?: string;

  /**
   * DynamoDB Table Name for apps/versions/rules.
   *
   * Must be a full ARN as this can be cross region.
   *
   * Implies that 2nd generation routing is enabled.
   */
  readonly tableRulesArn?: string;

  /**
   * Enable invoking API Gateway from the Edge Lambda
   *
   * @default false
   */
  readonly setupApiGatewayPermissions?: boolean;

  /**
   * Account IDs allowed for cross-account Function URL invocations
   *
   * @default []
   */
  readonly allowedFunctionUrlAccounts?: string[];
}

export interface GenerateEdgeToOriginConfigOptions {
  readonly originRegion: string;
  readonly signingMode: 'sign' | 'presign' | '';
  readonly addXForwardedHostHeader: boolean;
  readonly replaceHostHeader: boolean;
  readonly tableName?: string;
  readonly rootPathPrefix?: string;
  readonly locales?: string[];
}

interface IMicroAppsEdgeToOriginRoleStackProps extends StackProps {
  assetNameRoot?: string;
  assetNameSuffix?: string;
  setupApiGatewayPermissions?: boolean;

  /**
   * Account IDs allowed for cross-account Function URL invocations
   *
   * @default []
   */
  readonly allowedFunctionUrlAccounts?: string[];
}

class MicroAppsEdgeToOriginRoleStack extends Stack {
  private _role: iam.Role;
  public get role(): iam.Role {
    return this._role;
  }

  constructor(scope: Construct, id: string, props: IMicroAppsEdgeToOriginRoleStackProps) {
    super(scope, id, props);

    const {
      assetNameRoot,
      assetNameSuffix,
      setupApiGatewayPermissions,
      allowedFunctionUrlAccounts,
    } = props;

    // Create IAM Role for the Edge Function
    this._role = new iam.Role(this, 'edge-role', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      roleName: assetNameRoot
        ? `${assetNameRoot}-edge-role${assetNameSuffix}`
        : PhysicalName.GENERATE_IF_NEEDED,
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
      inlinePolicies: {
        edgeToOriginPolicy: new iam.PolicyDocument({
          statements: [
            // This can't have a reference to the httpApi because it would mean
            // the parent stack (this stack) has to be created before the us-east-1
            // child stack for the Edge Lambda Function.
            // That's why we use a tag-based policy to allow the Edge Function
            // to invoke any API Gateway API that we apply a tag to
            // We allow the edge function to sign for all regions since
            // we may use custom closest region in the future.
            ...(setupApiGatewayPermissions
              ? [
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
                ]
              : []),
            //
            // Grant permission to invoke tagged Function URLs (in same account)
            //
            new iam.PolicyStatement({
              actions: ['lambda:InvokeFunctionUrl'],
              resources: [`arn:aws:lambda:*:${Aws.ACCOUNT_ID}:*`],
              conditions: {
                StringEquals: { 'aws:ResourceTag/microapp-managed': 'true' },
              },
            }),
            //
            // Grant permission to invoke Function URLs in listed accounts
            //
            ...(allowedFunctionUrlAccounts && allowedFunctionUrlAccounts.length > 0
              ? [
                  new iam.PolicyStatement({
                    actions: ['lambda:InvokeFunctionUrl'],
                    resources: allowedFunctionUrlAccounts.map(
                      (accountId) => `arn:aws:lambda:*:${accountId}:*`,
                    ),
                  }),
                ]
              : []),
          ],
        }),
      },
    });
    this._role.assumeRolePolicy?.addStatements(
      new iam.PolicyStatement({
        principals: [
          new iam.ServicePrincipal('edgelambda.amazonaws.com'),
          new iam.ServicePrincipal('lambda.amazonaws.com'),
        ],
        actions: ['sts:AssumeRole'],
        effect: iam.Effect.ALLOW,
      }),
    );

    new CfnOutput(this, 'edge-to-origin-role-arn', {
      value: `${this.role.roleArn}`,
      exportName: `${this.stackName}-role-arn`,
    });
  }
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
replaceHostHeader: ${props.replaceHostHeader}
${props.tableName ? `tableName: '${props.tableName}'` : ''}
${props.rootPathPrefix ? `rootPathPrefix: '${props.rootPathPrefix}'` : ''}
${
  props.locales && props.locales.length > 0
    ? `locales: [${props.locales.map((locale) => `'${locale}'`).join(', ')}]`
    : ''
}`;
  }

  private _edgeToOriginFunction: lambda.Function | cf.experimental.EdgeFunction;
  public get edgeToOriginFunction(): lambda.Function | cf.experimental.EdgeFunction {
    return this._edgeToOriginFunction;
  }

  private _edgeToOriginLambdas: cf.EdgeLambda[];
  public get edgeToOriginLambdas(): cf.EdgeLambda[] {
    return this._edgeToOriginLambdas;
  }

  private _edgeToOriginRole: iam.Role;
  public get edgeToOriginRole(): iam.Role {
    return this._edgeToOriginRole;
  }

  constructor(scope: Construct, id: string, props: MicroAppsEdgeToOriginProps) {
    super(scope, id);

    if (props === undefined) {
      throw new Error('props must be set');
    }

    const {
      addXForwardedHostHeader = true,
      allowedFunctionUrlAccounts = [],
      assetNameRoot,
      assetNameSuffix,
      originRegion,
      setupApiGatewayPermissions = false,
      signingMode = 'sign',
      removalPolicy,
      rootPathPrefix,
      replaceHostHeader = true,
      tableRulesArn,
    } = props;

    // Create the edge function config file from the construct options
    const edgeToOriginConfigYaml = MicroAppsEdgeToOrigin.generateEdgeToOriginConfig({
      originRegion: originRegion || Aws.REGION,
      addXForwardedHostHeader,
      replaceHostHeader,
      signingMode: signingMode === 'none' ? '' : signingMode,
      rootPathPrefix,
      locales: props.allowedLocalePrefixes,
      ...(tableRulesArn
        ? {
            tableName: tableRulesArn,
          }
        : {}),
    });

    const roleStack = new MicroAppsEdgeToOriginRoleStack(this, 'role-stack', {
      stackName: `${Stack.of(this).stackName}-edge-role`,
      assetNameRoot,
      assetNameSuffix,
      allowedFunctionUrlAccounts,
      setupApiGatewayPermissions,
      env: {
        region: Stack.of(this).region,
        account: Stack.of(this).account,
      },
    });
    Stack.of(this).addDependency(roleStack);
    this._edgeToOriginRole = roleStack.role;

    new CfnOutput(this, 'role-stack-name', {
      value: `${roleStack.stackName}`,
      exportName: `${Stack.of(this).stackName}-role-stack`,
    });

    //
    // Create the Edge to Origin Function
    //
    const edgeToOriginFuncProps: Omit<lambda.FunctionProps, 'handler' | 'code'> = {
      functionName: assetNameRoot ? `${assetNameRoot}-edge-to-origin${assetNameSuffix}` : undefined,
      role: this._edgeToOriginRole,
      memorySize: 1769,
      logRetention: logs.RetentionDays.ONE_MONTH,
      runtime: lambda.Runtime.NODEJS_16_X,
      timeout: Duration.seconds(5),
      ...(removalPolicy ? { removalPolicy } : {}),
    };
    const rootDistPath = path.join(__dirname, '..', '..', 'microapps-edge-to-origin', 'dist');
    const rootDistExists = existsSync(path.join(rootDistPath, 'index.js'));
    const localDistPath = path.join(__dirname, 'microapps-edge-to-origin');
    const localDistExists = existsSync(path.join(localDistPath, 'index.js'));
    if (process.env.NODE_ENV === 'test' && rootDistExists) {
      // This is for tests run under jest - Prefer root dist bundle
      // This is also for anytime when the edge function has already been bundled
      this._edgeToOriginFunction = this.createEdgeFunction(
        rootDistPath,
        edgeToOriginConfigYaml,
        edgeToOriginFuncProps,
      );
    } else if (localDistExists) {
      // Prefer local dist above root dist if both exist (when building for distribution)
      this._edgeToOriginFunction = this.createEdgeFunction(
        localDistPath,
        edgeToOriginConfigYaml,
        edgeToOriginFuncProps,
      );
    } else if (rootDistExists) {
      // Use local dist if it exists (when deploying from CDK in this repo)
      this._edgeToOriginFunction = this.createEdgeFunction(
        rootDistPath,
        edgeToOriginConfigYaml,
        edgeToOriginFuncProps,
      );
    } else {
      // This is used when bundling the app and building the CDK module
      // for distribution.
      writeFileSync(
        path.join(__dirname, '..', '..', 'microapps-edge-to-origin', 'config.yml'),
        edgeToOriginConfigYaml,
      );

      // Copy the appFrame.html to the place where the bundling will find it
      copyFileSync(
        path.join(__dirname, '..', '..', 'microapps-router', 'appFrame.html'),
        path.join(__dirname, '..', '..', 'microapps-edge-to-origin', 'appFrame.html'),
      );

      // This builds the function for distribution with the CDK Construct
      // and will be used during local builds and PR builds of microapps-core
      // if the microapps-edge-to-origin function is not already bundled.
      // This will fail to deploy in any region other than us-east-1
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
              // 2022-10-02 - Note that this is ignoring the generated config
              // file above and including the default template config file
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
                `${os.platform() === 'win32' ? 'copy' : 'cp'} ${path.join(
                  __dirname,
                  '..',
                  '..',
                  'microapps-router',
                  'appFrame.html',
                )} ${outputDir}`,
              ];
            },
          },
        },
        ...edgeToOriginFuncProps,
      });
    }

    this._edgeToOriginLambdas = [
      {
        eventType: cf.LambdaEdgeEventType.ORIGIN_REQUEST,
        functionVersion: this._edgeToOriginFunction.currentVersion,
        includeBody: true,
      },
    ];

    // Grant access to the rules table
    if (tableRulesArn) {
      const tableRules = dynamodb.Table.fromTableName(this, 'tableRules', tableRulesArn);
      tableRules.grantReadData(this._edgeToOriginFunction);
    }

    (this._edgeToOriginFunction as cf.experimental.EdgeFunction).stack.stackName;

    new CfnOutput(this, 'edge-stack-name', {
      value: `${(this._edgeToOriginFunction as cf.experimental.EdgeFunction).stack.stackName}`,
      exportName: `${Stack.of(this).stackName}-edge-stack`,
    });
  }

  /**
   * Hash the stack name to make the EdgeFunction parameter name unique
   *
   * @param stack
   * @returns
   */
  private hashStackName(): string {
    return crypto.createHash('sha1').update(Stack.of(this).stackName).digest('hex').substring(0, 8);
  }

  private createEdgeFunction(
    distPath: string,
    edgeToOriginConfigYaml: string,
    edgeToOriginFuncProps: Omit<lambda.FunctionProps, 'handler' | 'code'>,
  ) {
    writeFileSync(path.join(distPath, 'config.yml'), edgeToOriginConfigYaml);

    // Skip the copy of appFrame.html on deployed modules
    if (!__dirname.includes('node_modules')) {
      copyFileSync(
        path.join(__dirname, '..', '..', 'microapps-router', 'appFrame.html'),
        path.join(distPath, 'appFrame.html'),
      );
    }

    // The exclude varying per stack name is a kludge to get the asset bundled
    // with the stack-specifc config.yml file, otherwise they all get the file
    // generated for the first instance of the construct within any stack
    // in the app.
    const code = lambda.Code.fromAsset(distPath, { exclude: [`**/${Stack.of(this)}`] });

    const stackHash = this.hashStackName() ?? '';

    // EdgeFunction has a bug where it will generate the same parameter
    // name across multiple stacks in the same region if the id param is constant
    const edge = new cf.experimental.EdgeFunction(this, `edge-to-apigwy-func-${stackHash}`, {
      stackId: `microapps-edge-to-origin-${stackHash}`,
      code,
      functionName: `microapps-edge-to-origin-${stackHash}`,
      handler: 'index.handler',
      ...edgeToOriginFuncProps,
    });
    Tags.of(edge).add('Name', Stack.of(this).stackName);

    return edge;
  }
}
