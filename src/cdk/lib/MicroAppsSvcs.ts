import * as cdk from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as lambda from '@aws-cdk/aws-lambda';
import * as iam from '@aws-cdk/aws-iam';
import * as apigwy from '@aws-cdk/aws-apigatewayv2';
import * as apigwyint from '@aws-cdk/aws-apigatewayv2-integrations';
import * as s3 from '@aws-cdk/aws-s3';
import * as logs from '@aws-cdk/aws-logs';
import * as acm from '@aws-cdk/aws-certificatemanager';
import { IMicroAppsCFExports } from './MicroAppsCF';
import { IMicroAppsReposExports } from './MicroAppsRepos';
import { IMicroAppsS3Exports } from './MicroAppsS3';

interface IMicroAppsSvcsStackProps extends cdk.StackProps {
  reposExports: IMicroAppsReposExports;
  cfStackExports: IMicroAppsCFExports;
  s3Exports: IMicroAppsS3Exports;
  local: {
    domainName: string;
    domainNameOrigin: string;
    cert: acm.ICertificate;
  };
}

export interface IMicroAppsSvcsExports {
  dnAppsOrigin: apigwy.DomainName;
}

export class MicroAppsSvcs extends cdk.Stack implements IMicroAppsSvcsExports {
  private _dnAppsOrigin: apigwy.DomainName;
  public get dnAppsOrigin(): apigwy.DomainName {
    return this._dnAppsOrigin;
  }

  constructor(scope: cdk.Construct, id: string, props?: IMicroAppsSvcsStackProps) {
    super(scope, id, props);

    if (props === undefined) {
      throw new Error('props cannot be undefined');
    }
    if (props.env === undefined) {
      throw new Error('props.env cannot be undefined');
    }

    const { bucketApps, bucketAppsStaging } = props.s3Exports;
    const { cert } = props.local;

    //
    // DynamoDB Table
    //
    const table = new dynamodb.Table(this, 'microapps-router-table', {
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

    //
    // Deployer Lambda Function
    //

    // Create Deployer Lambda Function
    const deployerFunc = new lambda.DockerImageFunction(this, 'microapps-deployer-func', {
      code: lambda.DockerImageCode.fromEcr(props.reposExports.repoDeployer),
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
      logRetention: logs.RetentionDays.ONE_MONTH,
    });
    // Give the Deployer access to DynamoDB table
    table.grantReadWriteData(deployerFunc);
    table.grant(deployerFunc, 'dynamodb:DescribeTable');

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
          props.cfStackExports.cloudFrontOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId,
        ),
        new iam.AccountRootPrincipal(),
        new iam.ArnPrincipal(`arn:aws:iam::${props.env.account}:role/AdminAccess`),
        deployerFunc.grantPrincipal,
      ],
      notResources: [
        `${bucketApps.bucketArn}/\${aws:PrincipalTag/microapp-name}/*`,
        bucketApps.bucketArn,
      ],
      conditions: {
        Null: { 'aws:PrincipalTag/microapp-name': 'false' },
      },
    });
    const policyDenyMissingTag = new iam.PolicyStatement({
      sid: 'deny-missing-microapp-name-tag',
      effect: iam.Effect.DENY,
      actions: ['s3:*'],
      notPrincipals: [
        new iam.CanonicalUserPrincipal(
          props.cfStackExports.cloudFrontOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId,
        ),
        new iam.AccountRootPrincipal(),
        new iam.ArnPrincipal(`arn:aws:iam::${props.env.account}:role/AdminAccess`),
        deployerFunc.grantPrincipal,
        new iam.ArnPrincipal(
          `arn:aws:sts::${props.env.account}:assumed-role/${deployerFunc?.role?.roleName}/${deployerFunc.functionName}`,
        ),
      ],
      resources: [`${bucketApps.bucketArn}/*`, bucketApps.bucketArn],
      conditions: {
        Null: { 'aws:PrincipalTag/microapp-name': 'true' },
        StringNotLike: { 'aws:userid': ['AROATPLZCRY427AZLMDOB:*', props.env.account] },
      },
    });
    const policyCloudFrontAccess = new iam.PolicyStatement({
      sid: 'cloudfront-oai-access',
      effect: iam.Effect.ALLOW,
      actions: ['s3:GetObject'],
      principals: [
        new iam.CanonicalUserPrincipal(
          props.cfStackExports.cloudFrontOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId,
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

    //
    // Router Lambda Function
    //

    // Create Router Lambda Function - Docker Image Version (aka "slow")
    const routerFunc = new lambda.DockerImageFunction(this, 'microapps-router-func', {
      code: lambda.DockerImageCode.fromEcr(props.reposExports.repoRouter),
      timeout: cdk.Duration.seconds(3),
      memorySize: 1024,
      logRetention: logs.RetentionDays.ONE_MONTH,
    });
    // Zip version of the function
    // This is *much* faster on cold inits
    const routerzFunc = new lambda.Function(this, 'microapps-router-funcz', {
      code: lambda.Code.fromInline(
        "function handler() { return 'cat'; }; exports.handler=handler;",
      ),
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'index.handler',
      timeout: cdk.Duration.seconds(3),
      memorySize: 1024,
      logRetention: logs.RetentionDays.ONE_MONTH,
    });
    const policyReadTarget = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['s3:GetObject'],
      resources: [`${bucketApps.bucketArn}/*`],
    });
    routerFunc.addToRolePolicy(policyReadTarget);
    // Give the Router access to DynamoDB table
    table.grantReadData(routerFunc);
    table.grant(routerFunc, 'dynamodb:DescribeTable');
    // Repeat for zip file function
    routerzFunc.addToRolePolicy(policyReadTarget);
    // Give the Router access to DynamoDB table
    table.grantReadData(routerzFunc);
    table.grant(routerzFunc, 'dynamodb:DescribeTable');

    // TODO: Add Last Route for /*/{proxy+}
    // Note: That might not work, may need a Behavior in CloudFront
    //       or a Lambda @ Edge function that detects these and routes
    //       to origin Lambda Router function.

    //
    // APIGateway domain names for CloudFront and origin
    //

    // Create Custom Domains for API Gateway
    const dnAppsEdge = new apigwy.DomainName(this, 'microapps-apps-edge-dn', {
      domainName: props.local.domainName,
      certificate: cert,
    });
    this._dnAppsOrigin = new apigwy.DomainName(this, 'microapps-apps-origin-dn', {
      domainName: props.local.domainNameOrigin,
      certificate: cert,
    });

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
    });

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

    //
    // Give Deployer permissions to create routes and integrations
    // on the API Gateway API.
    //

    // Grant the ability to List all APIs (we have to find it)
    const policyAPIList = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['apigateway:GET'],
      resources: [`arn:aws:apigateway:${this.region}::/apis`],
    });
    deployerFunc.addToRolePolicy(policyAPIList);
    // Grant full control over the API we created
    const policyAPIManage = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['apigateway:*'],
      resources: [
        `arn:aws:apigateway:${this.region}:${this.account}:${httpApi.httpApiId}/*`,
        `arn:aws:apigateway:${this.region}::/apis/${httpApi.httpApiId}/integrations`,
        `arn:aws:apigateway:${this.region}::/apis/${httpApi.httpApiId}/routes`,
      ],
    });
    deployerFunc.addToRolePolicy(policyAPIManage);
    // Grant full control over lambdas that indicate they are microapps
    const policyAPIManageLambdas = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['lambda:*'],
      resources: [
        `arn:aws:lambda:${this.region}:${this.account}:function:*`,
        `arn:aws:lambda:${this.region}:${this.account}:function:*:*`,
      ],
      conditions: {
        StringEqualsIfExists: { 'aws:ResourceTag/microapp-managed': 'true' },
      },
    });
    deployerFunc.addToRolePolicy(policyAPIManageLambdas);
  }
}
