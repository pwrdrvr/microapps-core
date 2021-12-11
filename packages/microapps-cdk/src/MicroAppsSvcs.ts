import { existsSync } from 'fs';
import * as path from 'path';
import * as apigwy from '@aws-cdk/aws-apigatewayv2';
import * as apigwyint from '@aws-cdk/aws-apigatewayv2-integrations';
import * as acm from '@aws-cdk/aws-certificatemanager';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import * as logs from '@aws-cdk/aws-logs';
import * as r53 from '@aws-cdk/aws-route53';
import * as r53targets from '@aws-cdk/aws-route53-targets';
import * as s3 from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';
import { IMicroAppsCFExports } from './MicroAppsCF';
import { IMicroAppsS3Exports } from './MicroAppsS3';

interface MicroAppsSvcsStackProps {
  readonly cfStackExports: IMicroAppsCFExports;
  readonly s3Exports: IMicroAppsS3Exports;

  readonly appEnv: string;
  readonly autoDeleteEverything: boolean;
  readonly reverseDomainName: string;
  readonly domainName: string;
  readonly domainNameEdge: string;
  readonly domainNameOrigin: string;

  readonly assetNameRoot: string;
  readonly assetNameSuffix: string;

  readonly certOrigin: acm.ICertificate;

  readonly r53ZoneName: string;
  readonly r53ZoneID: string;

  readonly s3StrictBucketPolicy?: boolean;
  readonly s3PolicyBypassAROAs?: string[];
  readonly s3PolicyBypassPrincipalARNs?: string[];

  readonly account: string;
  readonly region: string;
}

export interface IMicroAppsSvcsExports {
  readonly dnAppsOrigin: apigwy.DomainName;
}

export class MicroAppsSvcs extends cdk.Construct implements IMicroAppsSvcsExports {
  private _dnAppsOrigin: apigwy.DomainName;
  public get dnAppsOrigin(): apigwy.DomainName {
    return this._dnAppsOrigin;
  }

  constructor(scope: cdk.Construct, id: string, props?: MicroAppsSvcsStackProps) {
    super(scope, id);

    if (props === undefined) {
      throw new Error('props cannot be undefined');
    }

    const { bucketApps, bucketAppsName, bucketAppsOAI, bucketAppsStaging, bucketAppsStagingName } =
      props.s3Exports;
    const {
      r53ZoneID,
      r53ZoneName,
      s3PolicyBypassAROAs = [],
      s3PolicyBypassPrincipalARNs = [],
      s3StrictBucketPolicy = false,
      autoDeleteEverything,
      appEnv,
      domainNameEdge,
      domainNameOrigin,
      certOrigin,
      account,
      region,
      assetNameRoot,
      assetNameSuffix,
    } = props;

    const apigatewayName = `${assetNameRoot}${assetNameSuffix}`;

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
    const table = new dynamodb.Table(this, 'microapps-router-table', {
      tableName: `${assetNameRoot}${assetNameSuffix}`,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING,
      },
    });
    if (autoDeleteEverything) {
      table.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    }

    //
    // Router Lambda Function
    //

    // Create Router Lambda Function
    let routerFunc: lambda.Function;
    const routerFuncProps: Omit<lambda.FunctionProps, 'handler' | 'code'> = {
      functionName: `${assetNameRoot}-router${assetNameSuffix}`,
      memorySize: 1769,
      logRetention: logs.RetentionDays.ONE_MONTH,
      runtime: lambda.Runtime.NODEJS_14_X,
      timeout: cdk.Duration.seconds(15),
      environment: {
        NODE_ENV: appEnv,
        DATABASE_TABLE_NAME: table.tableName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },
    };
    if (existsSync(`${path.resolve(__dirname)}/../dist/microapps-router/index.js`)) {
      // This is for local dev
      routerFunc = new lambda.Function(this, 'microapps-router-func', {
        code: lambda.Code.fromAsset(`${path.resolve(__dirname)}/../dist/microapps-router/`),
        handler: 'index.handler',
        ...routerFuncProps,
      });
    } else if (existsSync(`${path.resolve(__dirname)}/microapps-router/index.js`)) {
      // This is for built apps packaged with the CDK construct
      routerFunc = new lambda.Function(this, 'microapps-router-func', {
        code: lambda.Code.fromAsset(`${path.resolve(__dirname)}/microapps-router/`),
        handler: 'index.handler',
        ...routerFuncProps,
      });
    } else {
      // Create Router Lambda Layer
      const routerDataFiles = new lambda.LayerVersion(this, 'microapps-router-layer', {
        code: lambda.Code.fromAsset('./packages/microapps-router/templates/'),
      });
      if (autoDeleteEverything) {
        routerDataFiles.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
      }

      routerFunc = new lambdaNodejs.NodejsFunction(this, 'microapps-router-func', {
        entry: './packages/microapps-router/src/index.ts',
        handler: 'handler',
        bundling: {
          minify: true,
          sourceMap: true,
        },
        layers: [routerDataFiles],
        ...routerFuncProps,
      });
    }
    if (autoDeleteEverything) {
      routerFunc.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    }
    const policyReadTarget = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['s3:GetObject'],
      resources: [`${bucketApps.bucketArn}/*`],
    });
    for (const router of [routerFunc]) {
      router.addToRolePolicy(policyReadTarget);
      // Give the Router access to DynamoDB table
      table.grantReadData(router);
      table.grant(router, 'dynamodb:DescribeTable');
    }

    // TODO: Add Last Route for /*/{proxy+}
    // Note: That might not work, may need a Behavior in CloudFront
    //       or a Lambda @ Edge function that detects these and routes
    //       to origin Lambda Router function.

    //
    // APIGateway domain names for CloudFront and origin
    //

    // Create Custom Domains for API Gateway
    const dnAppsEdge = new apigwy.DomainName(this, 'microapps-apps-edge-dn', {
      domainName: domainNameEdge,
      certificate: certOrigin,
    });
    if (autoDeleteEverything) {
      dnAppsEdge.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    }
    this._dnAppsOrigin = new apigwy.DomainName(this, 'microapps-apps-origin-dn', {
      domainName: domainNameOrigin,
      certificate: certOrigin,
    });
    if (autoDeleteEverything) {
      this._dnAppsOrigin.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    }

    // Create an integration for the Router
    // Do this here since it's the default route
    const intRouter = new apigwyint.LambdaProxyIntegration({
      handler: routerFunc,
    });

    // Create APIGateway for the Edge name
    const httpApiDomainMapping: apigwy.DomainMappingOptions = {
      domainName: dnAppsEdge,
    };
    const httpApi = new apigwy.HttpApi(this, 'microapps-api', {
      defaultDomainMapping: httpApiDomainMapping,
      defaultIntegration: intRouter,
      apiName: apigatewayName,
    });
    if (autoDeleteEverything) {
      httpApi.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    }

    // Enable access logs on API Gateway
    const apiAccessLogs = new logs.LogGroup(this, 'microapps-api-logs', {
      logGroupName: `/aws/apigwy/${apigatewayName}`,
      retention: logs.RetentionDays.TWO_WEEKS,
    });
    if (autoDeleteEverything) {
      apiAccessLogs.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    }
    const stage = httpApi.defaultStage?.node.defaultChild as apigwy.CfnStage;
    stage.accessLogSettings = {
      destinationArn: apiAccessLogs.logGroupArn,
      format: JSON.stringify({
        requestId: '$context.requestId',
        userAgent: '$context.identity.userAgent',
        sourceIp: '$context.identity.sourceIp',
        requestTime: '$context.requestTime',
        requestTimeEpoch: '$context.requestTimeEpoch',
        httpMethod: '$context.httpMethod',
        path: '$context.path',
        status: '$context.status',
        protocol: '$context.protocol',
        responseLength: '$context.responseLength',
        domainName: '$context.domainName',
      }),
    };

    // Create a logging role
    // Tips: https://github.com/aws/aws-cdk/issues/11100
    const apiGwyLogRole = new iam.Role(this, 'microapps-api-logs-role', {
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AmazonAPIGatewayPushToCloudWatchLogs',
        ),
      ],
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
    });
    apiAccessLogs.grantWrite(apiGwyLogRole);

    // Add default route on API Gateway to point to the router
    // httpApi.addRoutes({
    //   path: '$default',
    //   integration: intRouter,
    // });

    //
    // Let API Gateway accept requests using domainNameOrigin
    // That is the origin URI that CloudFront uses for this gateway.
    // The gateway will refuse the traffic if it doesn't have the
    // domain name registered.
    //
    const mappingAppsApis = new apigwy.ApiMapping(this, 'microapps-api-mapping-origin', {
      api: httpApi,
      domainName: this.dnAppsOrigin,
    });
    mappingAppsApis.node.addDependency(this.dnAppsOrigin);
    if (autoDeleteEverything) {
      mappingAppsApis.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    }

    //
    // Deployer Lambda Function
    //

    // Create Deployer Lambda Function
    const iamRoleUploadName = `${assetNameRoot}-deployer-upload${assetNameSuffix}`;
    const deployerFuncName = `${assetNameRoot}-deployer${assetNameSuffix}`;
    let deployerFunc: lambda.Function;
    const deployerFuncProps: Omit<lambda.FunctionProps, 'handler' | 'code'> = {
      functionName: deployerFuncName,
      memorySize: 1769,
      logRetention: logs.RetentionDays.ONE_MONTH,
      runtime: lambda.Runtime.NODEJS_14_X,
      timeout: cdk.Duration.seconds(15),
      environment: {
        NODE_ENV: appEnv,
        APIGWY_ID: httpApi.httpApiId,
        DATABASE_TABLE_NAME: table.tableName,
        FILESTORE_STAGING_BUCKET: bucketAppsStagingName,
        FILESTORE_DEST_BUCKET: bucketAppsName,
        UPLOAD_ROLE_NAME: iamRoleUploadName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },
    };
    if (existsSync(`${path.resolve(__dirname)}/../dist/microapps-deployer/index.js`)) {
      // This is for local dev
      deployerFunc = new lambda.Function(this, 'microapps-deployer-func', {
        code: lambda.Code.fromAsset(`${path.resolve(__dirname)}/../dist/microapps-deployer/`),
        handler: 'index.handler',
        ...deployerFuncProps,
      });
    } else if (existsSync(`${path.resolve(__dirname)}/microapps-deployer/index.js`)) {
      // This is for built apps packaged with the CDK construct
      deployerFunc = new lambda.Function(this, 'microapps-deployer-func', {
        code: lambda.Code.fromAsset(`${path.resolve(__dirname)}/microapps-deployer/`),
        handler: 'index.handler',
        ...deployerFuncProps,
      });
    } else {
      deployerFunc = new lambdaNodejs.NodejsFunction(this, 'microapps-deployer-func', {
        entry: './packages/microapps-deployer/src/index.ts',
        handler: 'handler',
        bundling: {
          minify: true,
          sourceMap: true,
        },
        ...deployerFuncProps,
      });
    }
    if (autoDeleteEverything) {
      deployerFunc.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    }
    // Give the Deployer access to DynamoDB table
    table.grantReadWriteData(deployerFunc);
    table.grant(deployerFunc, 'dynamodb:DescribeTable');

    //
    // Deloyer upload temp role
    // Deployer assumes this role with a limited policy to generate
    // an STS temp token to return to microapps-publish for the upload.
    //
    const iamRoleUpload = new iam.Role(this, 'microapps-deployer-upload-role', {
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
      assumedBy: deployerFunc.grantPrincipal,
    });

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
        deployerFunc.grantPrincipal,
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
    if (autoDeleteEverything) {
      policyDenyPrefixOutsideTag.addCondition(
        // Allows the DeletableBucket Lambda to delete items in the buckets
        'StringNotLike',
        { 'aws:PrincipalTag/application': `${assetNameRoot}-core*` },
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
        deployerFunc.grantPrincipal,
        // 2021-12-04 - Not 100% sure that this is actually needed...
        // Let's test this and remove if actually not necessary
        new iam.ArnPrincipal(
          `arn:aws:sts::${account}:assumed-role/${deployerFunc.role?.roleName}/${deployerFunc.functionName}`,
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
        StringNotLike: { 'aws:userid': [account, ...s3PolicyBypassAROAMatches] },
      },
    });
    if (autoDeleteEverything) {
      policyDenyMissingTag.addCondition(
        // Allows the DeletableBucket Lambda to delete items in the buckets
        'StringNotLike',
        { 'aws:PrincipalTag/application': `${assetNameRoot}-core*` },
      );
    }
    const policyCloudFrontAccess = new iam.PolicyStatement({
      sid: 'cloudfront-oai-access',
      effect: iam.Effect.ALLOW,
      actions: ['s3:GetObject'],
      principals: [
        new iam.CanonicalUserPrincipal(
          bucketAppsOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId,
        ),
      ],
      resources: [`${bucketApps.bucketArn}/*`],
    });

    if (bucketApps.policy === undefined) {
      const document = new s3.BucketPolicy(this, 'CFPolicy', {
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
    deployerFunc.addToRolePolicy(policyReadListStaging);

    // Allow the Lambda to write to the target bucket and delete
    const policyReadWriteListTarget = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['s3:GetObject', 's3:PutObject', 's3:ListBucket', 's3:DeleteObject'],
      resources: [`${bucketApps.bucketArn}/*`, bucketApps.bucketArn],
    });
    deployerFunc.addToRolePolicy(policyReadWriteListTarget);

    // Allow the deployer to get a temporary STS token
    const policyGetSTSToken = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['sts:GetFederationToken'],
      resources: ['*'],
    });
    deployerFunc.addToRolePolicy(policyGetSTSToken);

    // Allow the deployer to assume the upload role
    const policyAssumeUpload = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['sts:AssumeRole'],
      resources: [iamRoleUpload.roleArn],
    });
    deployerFunc.addToRolePolicy(policyAssumeUpload);

    //
    // Give Deployer permissions to create routes and integrations
    // on the API Gateway API.
    //

    // Grant the ability to List all APIs (we have to find it)
    const policyAPIList = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['apigateway:GET'],
      resources: [`arn:aws:apigateway:${region}::/apis`],
    });
    deployerFunc.addToRolePolicy(policyAPIList);
    // Grant full control over the API we created
    const policyAPIManage = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['apigateway:*'],
      resources: [
        `arn:aws:apigateway:${region}:${account}:${httpApi.httpApiId}/*`,
        `arn:aws:apigateway:${region}::/apis/${httpApi.httpApiId}/integrations/*`,
        `arn:aws:apigateway:${region}::/apis/${httpApi.httpApiId}/integrations`,
        `arn:aws:apigateway:${region}::/apis/${httpApi.httpApiId}/routes`,
        `arn:aws:apigateway:${region}::/apis/${httpApi.httpApiId}/routes/*`,
      ],
    });
    deployerFunc.addToRolePolicy(policyAPIManage);
    // Grant full control over lambdas that indicate they are microapps
    const policyAPIManageLambdas = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['lambda:*'],
      resources: [
        `arn:aws:lambda:${region}:${account}:function:*`,
        `arn:aws:lambda:${region}:${account}:function:*:*`,
      ],
      conditions: {
        StringEqualsIfExists: { 'aws:ResourceTag/microapp-managed': 'true' },
      },
    });
    deployerFunc.addToRolePolicy(policyAPIManageLambdas);

    //
    // Create the origin name for API Gateway
    //

    const zone = r53.HostedZone.fromHostedZoneAttributes(this, 'microapps-zone', {
      zoneName: r53ZoneName,
      hostedZoneId: r53ZoneID,
    });

    const rrAppsOrigin = new r53.ARecord(this, 'microapps-origin-arecord', {
      zone: zone,
      recordName: domainNameOrigin,
      target: r53.RecordTarget.fromAlias(
        new r53targets.ApiGatewayv2DomainProperties(
          this._dnAppsOrigin.regionalDomainName,
          this._dnAppsOrigin.regionalHostedZoneId,
        ),
      ),
    });
    if (autoDeleteEverything) {
      rrAppsOrigin.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    }
  }
}
