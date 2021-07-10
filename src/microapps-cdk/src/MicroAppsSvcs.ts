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

interface MicroAppsSvcsStackProps extends cdk.ResourceProps {
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

  readonly certEdge: acm.ICertificate;
  readonly certOrigin: acm.ICertificate;

  readonly r53ZoneName: string;
  readonly r53ZoneID: string;

  readonly s3PolicyBypassAROA: string;
  readonly s3PolicyBypassRoleName: string;

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
      s3PolicyBypassAROA,
      s3PolicyBypassRoleName,
      autoDeleteEverything,
      appEnv,
      domainNameEdge,
      domainNameOrigin,
      certEdge,
      certOrigin,
      account,
      region,
      assetNameRoot,
      assetNameSuffix,
    } = props;

    const apigatewayName = assetNameRoot;

    //
    // DynamoDB Table
    //
    const table = new dynamodb.Table(this, 'microapps-router-table', {
      tableName: assetNameRoot,
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
    // Deployer Lambda Function
    //

    // Create Deployer Lambda Function
    const iamRoleUploadName = `${assetNameRoot}-deployer-upload${assetNameSuffix}`;
    const deployerFuncName = `${assetNameRoot}-deployer${assetNameSuffix}`;
    let deployerFunc: lambda.Function;
    const deployerFuncProps: Omit<lambda.FunctionProps, 'handler' | 'code'> = {
      functionName: deployerFuncName,
      memorySize: 1024,
      logRetention: logs.RetentionDays.ONE_MONTH,
      runtime: lambda.Runtime.NODEJS_14_X,
      timeout: cdk.Duration.seconds(15),
      environment: {
        NODE_ENV: appEnv,
        APIGWY_NAME: apigatewayName,
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
    } else if (existsSync(`${path.resolve(__dirname)}/lib/microapps-deployer/index.js`)) {
      // This is for built apps packaged with the CDK construct
      deployerFunc = new lambda.Function(this, 'microapps-deployer-func', {
        code: lambda.Code.fromAsset(`${path.resolve(__dirname)}/lib/microapps-deployer/`),
        handler: 'index.handler',
        ...deployerFuncProps,
      });
    } else {
      deployerFunc = new lambdaNodejs.NodejsFunction(this, 'microapps-deployer-func', {
        entry: './src/microapps-deployer/src/index.ts',
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
        new iam.ArnPrincipal(`arn:aws:iam::${account}:role/${s3PolicyBypassRoleName}`),
        deployerFunc.grantPrincipal,
        // Allow the builder user to update the buckets
        new iam.ArnPrincipal(
          `arn:aws:iam::${account}:user/${assetNameRoot}-builder${assetNameSuffix}`,
        ),
      ],
      notResources: [
        `${bucketApps.bucketArn}/\${aws:PrincipalTag/microapp-name}/*`,
        bucketApps.bucketArn,
      ],
      conditions: {
        Null: { 'aws:PrincipalTag/microapp-name': 'false' },
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
        new iam.ArnPrincipal(`arn:aws:iam::${account}:role/${s3PolicyBypassRoleName}`),
        deployerFunc.grantPrincipal,
        new iam.ArnPrincipal(
          `arn:aws:sts::${account}:assumed-role/${deployerFunc?.role?.roleName}/${deployerFunc.functionName}`,
        ),
        // Allow the builder user to update the buckets
        new iam.ArnPrincipal(
          `arn:aws:iam::${account}:user/${assetNameRoot}-builder${assetNameSuffix}`,
        ),
      ],
      resources: [`${bucketApps.bucketArn}/*`, bucketApps.bucketArn],
      conditions: {
        Null: { 'aws:PrincipalTag/microapp-name': 'true' },
        // Note: This AROA must be specified to prevent this policy from locking
        // out non-root sessions that have assumed the admin role.
        // The notPrincipals will only match the role name exactly and will not match
        // any session that has assumed the role since notPrincipals does not allow
        // wildcard matches and does not do them implicitly either.
        StringNotLike: { 'aws:userid': [`${s3PolicyBypassAROA}:*`, account] },
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
      document.addStatements(policyDenyPrefixOutsideTag);
      document.addStatements(policyDenyMissingTag);
    } else {
      bucketApps.policy.document.addStatements(policyCloudFrontAccess);
      bucketApps.policy.document.addStatements(policyDenyPrefixOutsideTag);
      bucketApps.policy.document.addStatements(policyDenyMissingTag);
    }

    // Allow the Lambda to read from the staging bucket
    const policyReadListStaging = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      // FIXME: Allow Deployer to delete from Staging bucket
      actions: ['s3:GetObject', 's3:ListBucket'],
      resources: [`${bucketAppsStaging.bucketArn}/*`, bucketAppsStaging.bucketArn],
    });
    deployerFunc.addToRolePolicy(policyReadListStaging);

    // Allow the Lambda to write to the target bucket
    const policyReadWriteListTarget = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['s3:GetObject', 's3:PutObject', 's3:ListBucket'],
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
    // Router Lambda Function
    //

    // Create Router Lambda Layer
    const routerDataFiles = new lambda.LayerVersion(this, 'microapps-router-layer', {
      code: lambda.Code.fromAsset('./src/microapps-router/templates/'),
    });
    if (autoDeleteEverything) {
      routerDataFiles.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    }
    // Create Router Lambda Function
    let routerFunc: lambda.Function;
    const routerFuncProps: Omit<lambda.FunctionProps, 'handler' | 'code'> = {
      functionName: `${assetNameRoot}-router${assetNameSuffix}`,
      memorySize: 1024,
      logRetention: logs.RetentionDays.ONE_MONTH,
      runtime: lambda.Runtime.NODEJS_14_X,
      timeout: cdk.Duration.seconds(15),
      environment: {
        NODE_ENV: appEnv,
        DATABASE_TABLE_NAME: table.tableName,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },
      layers: [routerDataFiles],
    };
    if (existsSync(`${path.resolve(__dirname)}/../dist/microapps-router/index.js`)) {
      // This is for local dev
      routerFunc = new lambda.Function(this, 'microapps-router-func', {
        code: lambda.Code.fromAsset(`${path.resolve(__dirname)}/../dist/microapps-router/`),
        handler: 'index.handler',
        ...routerFuncProps,
      });
    } else if (existsSync(`${path.resolve(__dirname)}/lib/microapps-router/index.js`)) {
      // This is for built apps packaged with the CDK construct
      routerFunc = new lambda.Function(this, 'microapps-router-func', {
        code: lambda.Code.fromAsset(`${path.resolve(__dirname)}/lib/microapps-router/`),
        handler: 'index.handler',
        ...routerFuncProps,
      });
    } else {
      routerFunc = new lambdaNodejs.NodejsFunction(this, 'microapps-router-func', {
        entry: './src/microapps-router/src/index.ts',
        handler: 'handler',
        bundling: {
          minify: true,
          sourceMap: true,
        },
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
      certificate: certEdge,
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
        `arn:aws:apigateway:${region}::/apis/${httpApi.httpApiId}/integrations`,
        `arn:aws:apigateway:${region}::/apis/${httpApi.httpApiId}/routes`,
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
