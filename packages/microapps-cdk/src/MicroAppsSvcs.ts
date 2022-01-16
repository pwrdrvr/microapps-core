import { existsSync } from 'fs';
import * as path from 'path';
import * as apigwy from '@aws-cdk/aws-apigatewayv2';
import * as apigwyint from '@aws-cdk/aws-apigatewayv2-integrations';
import * as cf from '@aws-cdk/aws-cloudfront';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import * as logs from '@aws-cdk/aws-logs';
import * as s3 from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';

export interface MicroAppsSvcsProps {
  /**
   * RemovalPolicy override for child resources
   *
   * Note: if set to DESTROY the S3 buckes will have `autoDeleteObjects` set to `true`
   *
   * @default - per resource default
   */
  readonly removalPolicy?: cdk.RemovalPolicy;

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
   * API Gateway v2 HTTP for Router and app
   */
  readonly httpApi: apigwy.HttpApi;

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

  readonly s3StrictBucketPolicy?: boolean;
  readonly s3PolicyBypassAROAs?: string[];
  readonly s3PolicyBypassPrincipalARNs?: string[];

  /**
   * Path prefix on the root of the deployment
   *
   * @example dev/
   * @default none
   */
  readonly rootPathPrefix?: string;
}

export interface IMicroAppsSvcs {
  /**
   * DynamoDB table used by Router, Deployer, and Release console app
   */
  readonly table: dynamodb.ITable;

  /**
   * Lambda function for the Deployer
   */
  readonly deployerFunc: lambda.IFunction;
}

export class MicroAppsSvcs extends cdk.Construct implements IMicroAppsSvcs {
  private _table: dynamodb.Table;
  public get table(): dynamodb.ITable {
    return this._table;
  }

  private _deployerFunc: lambda.Function;
  public get deployerFunc(): lambda.IFunction {
    return this._deployerFunc;
  }

  /**
   * MicroApps - Create Lambda resources, DynamoDB, and grant S3 privs
   * @param scope
   * @param id
   * @param props
   */
  constructor(scope: cdk.Construct, id: string, props?: MicroAppsSvcsProps) {
    super(scope, id);

    if (props === undefined) {
      throw new Error('props cannot be undefined');
    }

    const {
      bucketApps,
      bucketAppsOAI,
      bucketAppsStaging,
      s3PolicyBypassAROAs = [],
      s3PolicyBypassPrincipalARNs = [],
      s3StrictBucketPolicy = false,
      appEnv,
      httpApi,
      removalPolicy,
      assetNameRoot,
      assetNameSuffix,
      rootPathPrefix = '',
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
    this._table = new dynamodb.Table(this, 'table', {
      tableName: assetNameRoot ? `${assetNameRoot}${assetNameSuffix}` : undefined,
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

    //
    // Router Lambda Function
    //

    // Create Router Lambda Function
    let routerFunc: lambda.Function;
    const routerFuncProps: Omit<lambda.FunctionProps, 'handler' | 'code'> = {
      functionName: assetNameRoot ? `${assetNameRoot}-router${assetNameSuffix}` : undefined,
      memorySize: 1769,
      logRetention: logs.RetentionDays.ONE_MONTH,
      runtime: lambda.Runtime.NODEJS_14_X,
      timeout: cdk.Duration.seconds(15),
      environment: {
        NODE_ENV: appEnv,
        DATABASE_TABLE_NAME: this._table.tableName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        ROOT_PATH_PREFIX: rootPathPrefix,
      },
    };
    if (
      process.env.NODE_ENV === 'test' &&
      existsSync(path.join(__dirname, '..', '..', 'microapps-router', 'dist', 'index.js'))
    ) {
      // This is for local dev
      routerFunc = new lambda.Function(this, 'router-func', {
        code: lambda.Code.fromAsset(path.join(__dirname, '..', '..', 'microapps-router', 'dist')),
        handler: 'index.handler',
        ...routerFuncProps,
      });
    } else if (existsSync(path.join(__dirname, 'microapps-router', 'index.js'))) {
      // This is for built apps packaged with the CDK construct
      routerFunc = new lambda.Function(this, 'router-func', {
        code: lambda.Code.fromAsset(path.join(__dirname, 'microapps-router')),
        handler: 'index.handler',
        ...routerFuncProps,
      });
    } else {
      // Create Router Lambda Layer
      const routerDataFiles = new lambda.LayerVersion(this, 'router-templates', {
        code: lambda.Code.fromAsset(
          path.join(__dirname, '..', '..', 'microapps-router', 'templates'),
        ),
        removalPolicy,
      });

      routerFunc = new lambdaNodejs.NodejsFunction(this, 'router-func', {
        entry: path.join(__dirname, '..', '..', 'microapps-router', 'src', 'index.ts'),
        handler: 'handler',
        bundling: {
          minify: true,
          sourceMap: true,
        },
        layers: [routerDataFiles],
        ...routerFuncProps,
      });
    }
    if (removalPolicy !== undefined) {
      routerFunc.applyRemovalPolicy(removalPolicy);
    }
    const policyReadTarget = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['s3:GetObject'],
      resources: [`${bucketApps.bucketArn}/*`],
    });
    for (const router of [routerFunc]) {
      router.addToRolePolicy(policyReadTarget);
      // Give the Router access to DynamoDB table
      this._table.grantReadData(router);
      this._table.grant(router, 'dynamodb:DescribeTable');
    }

    //
    // Deployer Lambda Function
    //

    // Create Deployer Lambda Function
    const iamRoleUploadName = assetNameRoot
      ? `${assetNameRoot}-deployer-upload${assetNameSuffix}`
      : undefined;
    const deployerFuncName = assetNameRoot
      ? `${assetNameRoot}-deployer${assetNameSuffix}`
      : undefined;
    const deployerFuncProps: Omit<lambda.FunctionProps, 'handler' | 'code'> = {
      functionName: deployerFuncName,
      memorySize: 1769,
      logRetention: logs.RetentionDays.ONE_MONTH,
      runtime: lambda.Runtime.NODEJS_14_X,
      timeout: cdk.Duration.seconds(15),
      environment: {
        NODE_ENV: appEnv,
        APIGWY_ID: httpApi.httpApiId,
        DATABASE_TABLE_NAME: this._table.tableName,
        FILESTORE_STAGING_BUCKET: bucketAppsStaging.bucketName,
        FILESTORE_DEST_BUCKET: bucketApps.bucketName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        ROOT_PATH_PREFIX: rootPathPrefix,
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

    //
    // Deloyer upload temp role
    // Deployer assumes this role with a limited policy to generate
    // an STS temp token to return to microapps-publish for the upload.
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
        { 'aws:PrincipalTag/application': `${cdk.Stack.of(this).stackName}-core*` },
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
          `arn:aws:sts::${cdk.Aws.ACCOUNT_ID}:assumed-role/${this._deployerFunc.role?.roleName}/${this._deployerFunc.functionName}`,
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
        //   aws iam get-user -–user-name USER-NAME
        StringNotLike: { 'aws:userid': [cdk.Aws.ACCOUNT_ID, ...s3PolicyBypassAROAMatches] },
      },
    });
    if (removalPolicy !== undefined) {
      policyDenyMissingTag.addCondition(
        // Allows the DeletableBucket Lambda to delete items in the buckets
        'StringNotLike',
        { 'aws:PrincipalTag/application': `${cdk.Stack.of(this).stackName}-core*` },
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
      resources: [`arn:aws:apigateway:${cdk.Aws.REGION}::/apis`],
    });
    this._deployerFunc.addToRolePolicy(policyAPIList);
    // Grant full control over the API we created
    const policyAPIManage = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['apigateway:*'],
      resources: [
        `arn:aws:apigateway:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:${httpApi.httpApiId}/*`,
        `arn:aws:apigateway:${cdk.Aws.REGION}::/apis/${httpApi.httpApiId}/integrations/*`,
        `arn:aws:apigateway:${cdk.Aws.REGION}::/apis/${httpApi.httpApiId}/integrations`,
        `arn:aws:apigateway:${cdk.Aws.REGION}::/apis/${httpApi.httpApiId}/routes`,
        `arn:aws:apigateway:${cdk.Aws.REGION}::/apis/${httpApi.httpApiId}/routes/*`,
      ],
    });
    this._deployerFunc.addToRolePolicy(policyAPIManage);
    // Grant full control over lambdas that indicate they are microapps
    const policyAPIManageLambdas = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['lambda:*'],
      resources: [
        `arn:aws:lambda:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:function:*`,
        `arn:aws:lambda:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:function:*:*`,
      ],
      conditions: {
        StringEqualsIfExists: { 'aws:ResourceTag/microapp-managed': 'true' },
      },
    });
    this._deployerFunc.addToRolePolicy(policyAPIManageLambdas);

    // Create an integration for the Router
    // All traffic without another route goes to the Router
    const intRouter = new apigwyint.HttpLambdaIntegration('router-integration', routerFunc);
    new apigwy.HttpRoute(this, 'route-default', {
      httpApi,
      routeKey: apigwy.HttpRouteKey.DEFAULT,
      integration: intRouter,
    });
  }
}
