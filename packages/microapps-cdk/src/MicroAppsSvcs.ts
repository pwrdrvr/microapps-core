import { existsSync } from 'fs';
import * as path from 'path';
import { Aws, Duration, PhysicalName, RemovalPolicy, Stack, Tags } from 'aws-cdk-lib';
import * as cf from 'aws-cdk-lib/aws-cloudfront';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

/**
 * Properties to initialize an instance of `MicroAppsSvcs`.
 */
export interface MicroAppsSvcsProps {
  /**
   * RemovalPolicy override for child resources
   *
   * Note: if set to DESTROY the S3 buckes will have `autoDeleteObjects` set to `true`
   *
   * @default - per resource default
   */
  readonly removalPolicy?: RemovalPolicy;

  /**
   * S3 bucket for deployed applications
   */
  readonly bucketApps: s3.IBucket;

  /**
   * CloudFront Origin Access Identity for the deployed applications bucket
   */
  readonly bucketAppsOAI: cf.OriginAccessIdentity;

  /**
   * S3 bucket for staged applications (prior to deploy)
   */
  readonly bucketAppsStaging: s3.IBucket;

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
   * Use a strict S3 Bucket Policy that prevents applications
   * from reading/writing/modifying/deleting files in the S3 Bucket
   * outside of the path that is specific to their app/version.
   *
   * This setting should be used when applications are less than
   * fully trusted.
   *
   * @default false
   */
  readonly s3StrictBucketPolicy?: boolean;

  /**
   * Applies when using s3StrictBucketPolicy = true
   *
   * IAM Role or IAM User names to exclude from the DENY rules on the S3 Bucket Policy.
   *
   * Roles that are Assumed must instead have their AROA added to `s3PolicyBypassAROAs`.
   *
   * Typically any admin roles / users that need to view or manage the S3 Bucket
   * would be added to this list.
   *
   * @example ['arn:aws:iam::1234567890123:role/AdminAccess', 'arn:aws:iam::1234567890123:user/MyAdminUser']
   *
   * @see s3PolicyBypassAROAs
   */
  readonly s3PolicyBypassPrincipalARNs?: string[];

  /**
   * Applies when using s3StrictBucketPolicy = true
   *
   * AROAs of the IAM Role to exclude from the DENY rules on the S3 Bucket Policy.
   * This allows sessions that assume the IAM Role to be excluded from the
   * DENY rules on the S3 Bucket Policy.
   *
   * Typically any admin roles / users that need to view or manage the S3 Bucket
   * would be added to this list.
   *
   * Roles / users that are used directly, not assumed, can be added to `s3PolicyBypassRoleNames` instead.
   *
   * Note: This AROA must be specified to prevent this policy from locking
   * out non-root sessions that have assumed the admin role.
   *
   * The notPrincipals will only match the role name exactly and will not match
   * any session that has assumed the role since notPrincipals does not allow
   * wildcard matches and does not do wildcard matches implicitly either.
   *
   * The AROA must be used because there are only 3 Principal variables available:
   *  https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_variables.html#principaltable
   *  aws:username, aws:userid, aws:PrincipalTag
   *
   * For an assumed role, aws:username is blank, aws:userid is:
   *  [unique id AKA AROA for Role]:[session name]
   *
   * Table of unique ID prefixes such as AROA:
   *  https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_identifiers.html#identifiers-prefixes
   *
   * The name of the role is simply not available for an assumed role and, if it was,
   * a complicated comparison would be requierd to prevent exclusion
   * of applying the Deny Rule to roles from other accounts.
   *
   * To get the AROA with the AWS CLI:
   *   aws iam get-role --role-name ROLE-NAME
   *   aws iam get-user --user-name USER-NAME
   *
   * @example [ 'AROA1234567890123' ]
   *
   * @see s3StrictBucketPolicy
   */
  readonly s3PolicyBypassAROAs?: string[];

  /**
   * Path prefix on the root of the deployment
   *
   * @example dev/
   * @default none
   */
  readonly rootPathPrefix?: string;

  /**
   * Require IAM auth on API Gateway and Lambda Function URLs
   *
   * @default true
   */
  readonly requireIAMAuthorization?: boolean;

  /**
   * Existing table for apps/versions/rules
   *
   * @warning - It is *strongly* suggested that production stacks create
   * their own DynamoDB Table and pass it into this construct, for protection
   * against data loss due to logical ID changes, the ability to configure
   * Provisioned capacity with Auto Scaling, the ability to add additional indices, etc.
   *
   * Requirements:
   * - Hash Key: `PK`
   * - Sort Key: `SK`
   *
   * @default created by construct
   */
  readonly table?: dynamodb.ITable;

  /**
   * Deployer timeout
   *
   * For larger applications this needs to be set up to 2-5 minutes for the S3 copy
   *
   * @default 2 minutes
   */
  readonly deployerTimeout?: Duration;

  /**
   * ARN of the IAM Role for the Edge to Origin Lambda Function
   */
  readonly edgeToOriginRoleARN?: string[];
}

/**
 * Represents a MicroApps Services
 */
export interface IMicroAppsSvcs {
  /**
   * DynamoDB table used by Router, Deployer, and Release console app
   */
  readonly table: dynamodb.ITable;

  /**
   * Lambda function for the Deployer
   */
  readonly deployerFunc: lambda.Function;

  /**
   * Lambda function for the Router
   */
  readonly routerFunc?: lambda.Function;
}

/**
 * Create a new MicroApps Services construct, including the Deployer
 * and Router Lambda Functions, and the DynamoDB Table used by both.
 */
export class MicroAppsSvcs extends Construct implements IMicroAppsSvcs {
  private _ownedTable?: dynamodb.Table;
  private _table: dynamodb.ITable;
  public get table(): dynamodb.ITable {
    return this._table;
  }

  private _deployerFunc: lambda.Function;
  public get deployerFunc(): lambda.Function {
    return this._deployerFunc;
  }

  private _routerFunc?: lambda.Function;
  public get routerFunc(): lambda.Function | undefined {
    return this._routerFunc;
  }

  constructor(scope: Construct, id: string, props?: MicroAppsSvcsProps) {
    super(scope, id);

    if (props === undefined) {
      throw new Error('props cannot be undefined');
    }

    const {
      bucketApps,
      bucketAppsOAI,
      bucketAppsStaging,
      deployerTimeout = Duration.minutes(2),
      s3PolicyBypassAROAs = [],
      s3PolicyBypassPrincipalARNs = [],
      s3StrictBucketPolicy = false,
      appEnv,
      removalPolicy,
      assetNameRoot,
      assetNameSuffix,
      rootPathPrefix = '',
      requireIAMAuthorization = true,
      edgeToOriginRoleARN,
    } = props;

    if (s3StrictBucketPolicy === true) {
      if (s3PolicyBypassAROAs.length === 0 && s3PolicyBypassPrincipalARNs.length === 0) {
        throw new Error(
          's3StrictBucketPolicy cannot be true without specifying at least one s3PolicyBypassAROAs or s3PolicyBypassPrincipalARNs',
        );
      }
    }

    //
    // DynamoDB Table
    //
    if (props.table === undefined) {
      // Create able if none passed
      this._ownedTable = new dynamodb.Table(this, 'table', {
        tableName: assetNameRoot
          ? `${assetNameRoot}${assetNameSuffix}`
          : PhysicalName.GENERATE_IF_NEEDED,
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        partitionKey: {
          name: 'PK',
          type: dynamodb.AttributeType.STRING,
        },
        sortKey: {
          name: 'SK',
          type: dynamodb.AttributeType.STRING,
        },
        removalPolicy,
      });
      this._table = this._ownedTable;
    } else {
      this._table = props.table;
    }

    //
    // Deployer Lambda Function
    //

    // Create Deployer Lambda Function
    const iamRoleUploadName = assetNameRoot
      ? `${assetNameRoot}-deployer-upload${assetNameSuffix}`
      : undefined;
    const iamRoleDeployerName = assetNameRoot
      ? `${assetNameRoot}-deployer${assetNameSuffix}`
      : undefined;
    const iamRoleDeployer = new iam.Role(this, 'deployer-role', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      roleName: iamRoleDeployerName,
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });
    const deployerFuncName = assetNameRoot
      ? `${assetNameRoot}-deployer${assetNameSuffix}`
      : undefined;
    const deployerFuncProps: Omit<lambda.FunctionProps, 'handler' | 'code'> = {
      functionName: deployerFuncName,
      role: iamRoleDeployer,
      memorySize: 1769,
      logRetention: logs.RetentionDays.ONE_MONTH,
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: deployerTimeout,
      environment: {
        NODE_ENV: appEnv,
        DATABASE_TABLE_NAME: this._table.tableName,
        FILESTORE_STAGING_BUCKET: bucketAppsStaging.bucketName,
        FILESTORE_DEST_BUCKET: bucketApps.bucketName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        ROOT_PATH_PREFIX: rootPathPrefix,
        REQUIRE_IAM_AUTHORIZATION: requireIAMAuthorization ? 'true' : 'false',
        ...(edgeToOriginRoleARN ? { EDGE_TO_ORIGIN_ROLE_ARN: edgeToOriginRoleARN.join(',') } : {}),
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
    // Give the Deployer access to DynamoDB table
    this._table.grantReadWriteData(this._deployerFunc);
    this._table.grant(this._deployerFunc, 'dynamodb:DescribeTable');

    // Add Tags to Deployer
    Tags.of(this._deployerFunc).add('microapps-deployer', 'true');

    //
    // Deployer upload temp role
    // Deployer assumes this role with a limited policy to generate
    // an STS temp token to return to the `pwrdrvr` CLI for the upload.
    //
    const iamRoleUpload = new iam.Role(this, 'deployer-upload-role', {
      roleName: iamRoleUploadName,
      inlinePolicies: {
        uploadPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ['s3:ListBucket'],
              resources: [bucketAppsStaging.bucketArn],
            }),
            new iam.PolicyStatement({
              actions: ['s3:PutObject', 's3:GetObject', 's3:AbortMultipartUpload'],
              resources: [`${bucketAppsStaging.bucketArn}/*`],
            }),
          ],
        }),
      },
      assumedBy: this._deployerFunc.grantPrincipal,
    });
    this._deployerFunc.addEnvironment('UPLOAD_ROLE_NAME', iamRoleUpload.roleName);

    //
    // Update S3 permissions
    //
    // Create PrincipalARN List
    const s3PolicyBypassArnPrincipals: iam.ArnPrincipal[] = [];
    for (const arnPrincipal of s3PolicyBypassPrincipalARNs) {
      s3PolicyBypassArnPrincipals.push(new iam.ArnPrincipal(arnPrincipal));
    }
    // Create AROA List that matches assumed sessions
    const s3PolicyBypassAROAMatches: string[] = [];
    for (const aroa of s3PolicyBypassAROAs) {
      s3PolicyBypassAROAMatches.push(`${aroa}:*`);
    }
    // Deny apps from reading:
    // - If they are missing the microapp-name tag
    // - Anything outside of the folder that matches their microapp-name tag
    const policyDenyPrefixOutsideTag = new iam.PolicyStatement({
      sid: 'deny-prefix-outside-microapp-name-tag',
      effect: iam.Effect.DENY,
      actions: ['s3:*'],
      notPrincipals: [
        new iam.CanonicalUserPrincipal(
          bucketAppsOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId,
        ),
        new iam.AccountRootPrincipal(),
        ...s3PolicyBypassArnPrincipals,
        this._deployerFunc.grantPrincipal,
      ],
      notResources: [
        `${bucketApps.bucketArn}/\${aws:PrincipalTag/microapp-name}/*`,
        bucketApps.bucketArn,
      ],
      conditions: {
        Null: { 'aws:PrincipalTag/microapp-name': 'false' },
        // StringNotLike: {'aws:'}
      },
    });
    if (removalPolicy !== undefined) {
      policyDenyPrefixOutsideTag.addCondition(
        // Allows the DeletableBucket Lambda to delete items in the buckets
        'StringNotLike',
        { 'aws:PrincipalTag/application': `${Stack.of(this).stackName}-core*` },
      );
    }
    const policyDenyMissingTag = new iam.PolicyStatement({
      sid: 'deny-missing-microapp-name-tag',
      effect: iam.Effect.DENY,
      actions: ['s3:*'],
      notPrincipals: [
        new iam.CanonicalUserPrincipal(
          bucketAppsOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId,
        ),
        new iam.AccountRootPrincipal(),
        // Exclude the Deployer Function directly
        this._deployerFunc.grantPrincipal,
        // 2021-12-04 - Not 100% sure that this is actually needed...
        // Let's test this and remove if actually not necessary
        new iam.ArnPrincipal(
          `arn:aws:sts::${Aws.ACCOUNT_ID}:assumed-role/${this._deployerFunc.role?.roleName}/${this._deployerFunc.functionName}`,
        ),
        ...s3PolicyBypassArnPrincipals,
      ],
      resources: [`${bucketApps.bucketArn}/*`, bucketApps.bucketArn],
      conditions: {
        Null: { 'aws:PrincipalTag/microapp-name': 'true' },
        // Note: This AROA must be specified to prevent this policy from locking
        // out non-root sessions that have assumed the admin role.
        // The notPrincipals will only match the role name exactly and will not match
        // any session that has assumed the role since notPrincipals does not allow
        // wildcard matches and does not do them implicitly either.
        // The AROA must be used because there are only 3 Principal variables:
        //  https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_variables.html#principaltable
        //  aws:username, aws:userid, aws:PrincipalTag
        // For an assumed role, aws:username is blank, aws:userid is:
        //  [unique id AKA AROA for Role]:[session name]
        // Table of unique ID prefixes such as AROA:
        //  https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_identifiers.html#identifiers-prefixes
        // The name of the role is simply not available and if it was
        // we'd need to write a complicated comparison to make sure
        // that we didn't exclude the Deny tag from roles in other accounts.
        //
        // To get the AROA with the AWS CLI:
        //   aws iam get-role --role-name ROLE-NAME
        //   aws iam get-user --user-name USER-NAME
        StringNotLike: { 'aws:userid': [Aws.ACCOUNT_ID, ...s3PolicyBypassAROAMatches] },
      },
    });
    if (removalPolicy !== undefined) {
      policyDenyMissingTag.addCondition(
        // Allows the DeletableBucket Lambda to delete items in the buckets
        'StringNotLike',
        { 'aws:PrincipalTag/application': `${Stack.of(this).stackName}-core*` },
      );
    }
    const policyCloudFrontAccess = new iam.PolicyStatement({
      sid: 'cloudfront-oai-access',
      effect: iam.Effect.ALLOW,
      actions: ['s3:GetObject', 's3:ListBucket'],
      principals: [
        new iam.CanonicalUserPrincipal(
          bucketAppsOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId,
        ),
      ],
      resources: [`${bucketApps.bucketArn}/*`, bucketApps.bucketArn],
    });

    if (bucketApps.policy === undefined) {
      const document = new s3.BucketPolicy(this, 's3-policy', {
        bucket: bucketApps,
      }).document;
      document.addStatements(policyCloudFrontAccess);

      if (s3StrictBucketPolicy) {
        document.addStatements(policyDenyPrefixOutsideTag);
        document.addStatements(policyDenyMissingTag);
      }
    } else {
      bucketApps.policy.document.addStatements(policyCloudFrontAccess);

      if (s3StrictBucketPolicy) {
        bucketApps.policy.document.addStatements(policyDenyPrefixOutsideTag);
        bucketApps.policy.document.addStatements(policyDenyMissingTag);
      }
    }

    // Allow the Lambda to read from the staging bucket
    const policyReadListStaging = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      // FIXME: Allow Deployer to delete from Staging bucket
      actions: ['s3:DeleteObject', 's3:GetObject', 's3:ListBucket'],
      resources: [`${bucketAppsStaging.bucketArn}/*`, bucketAppsStaging.bucketArn],
    });
    this._deployerFunc.addToRolePolicy(policyReadListStaging);

    // Allow the Lambda to write to the target bucket and delete
    const policyReadWriteListTarget = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['s3:DeleteObject', 's3:GetObject', 's3:PutObject', 's3:ListBucket'],
      resources: [`${bucketApps.bucketArn}/*`, bucketApps.bucketArn],
    });
    this._deployerFunc.addToRolePolicy(policyReadWriteListTarget);

    // Allow the deployer to get a temporary STS token
    const policyGetSTSToken = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['sts:GetFederationToken'],
      resources: ['*'],
    });
    this._deployerFunc.addToRolePolicy(policyGetSTSToken);

    // Allow the deployer to assume the upload role
    const policyAssumeUpload = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['sts:AssumeRole'],
      resources: [iamRoleUpload.roleArn],
    });
    this._deployerFunc.addToRolePolicy(policyAssumeUpload);

    //
    // Give Deployer permissions to create routes and integrations
    // on the API Gateway API.
    //

    // Grant the ability to List all APIs (we have to find it)
    const policyAPIList = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['apigateway:GET'],
      resources: [`arn:aws:apigateway:${Aws.REGION}::/apis`],
    });
    this._deployerFunc.addToRolePolicy(policyAPIList);

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
    this._deployerFunc.addToRolePolicy(policyAPIManageLambdas);
    const policyReadonlyLambdas = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['lambda:GetFunction', 'lambda:GetAlias'],
      resources: [
        `arn:aws:lambda:${Aws.REGION}:${Aws.ACCOUNT_ID}:function:*`,
        `arn:aws:lambda:${Aws.REGION}:${Aws.ACCOUNT_ID}:function:*:*`,
      ],
    });
    this._deployerFunc.addToRolePolicy(policyReadonlyLambdas);
  }
}
