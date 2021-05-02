import * as cdk from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as lambda from '@aws-cdk/aws-lambda';
import * as iam from '@aws-cdk/aws-iam';
import * as apigwy from '@aws-cdk/aws-apigatewayv2';
import * as apigwyint from '@aws-cdk/aws-apigatewayv2-integrations';
import * as s3 from '@aws-cdk/aws-s3';
import * as logs from '@aws-cdk/aws-logs';
import * as acm from '@aws-cdk/aws-certificatemanager';
import * as r53 from '@aws-cdk/aws-route53';
import * as r53targets from '@aws-cdk/aws-route53-targets';
import { ICloudFrontExports } from './CloudFront';
import { IReposExports } from './Repos';

interface IMicroAppsStackProps extends cdk.StackProps {
  ReposExports: IReposExports;
  CFStackExports: ICloudFrontExports;
}

export class MicroApps extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: IMicroAppsStackProps) {
    super(scope, id, props);

    if (props === undefined) {
      throw new Error('props cannot be undefined');
    }
    if (props.env === undefined) {
      throw new Error('props.env cannot be undefined');
    }

    // The code that defines your stack goes here
    //
    // DynamoDB Table
    //
    const table = new dynamodb.Table(this, 'table', {
      tableName: 'MicroApps',
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
    // Import S3 Buckets
    //
    const bucketApps = props.CFStackExports.BucketApps;
    const bucketStaging = s3.Bucket.fromBucketName(this, 'bucketStaging', 'pwrdrvr-apps-staging');

    //
    // Deployer Lambda Function
    //

    // Create Deployer Lambda Function
    const deployerFunc = new lambda.DockerImageFunction(this, 'deployer-func', {
      code: lambda.DockerImageCode.fromEcr(props.ReposExports.RepoDeployer),
      functionName: 'microapps-deployer',
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
          props.CFStackExports.CloudFrontOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId,
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
          props.CFStackExports.CloudFrontOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId,
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
          props.CFStackExports.CloudFrontOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId,
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
      resources: [`${bucketStaging.bucketArn}/*`, bucketStaging.bucketArn],
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
    const routerFunc = new lambda.DockerImageFunction(this, 'router-func', {
      code: lambda.DockerImageCode.fromEcr(props.ReposExports.RepoRouter),
      functionName: 'microapps-router',
      timeout: cdk.Duration.seconds(3),
      memorySize: 1024,
      logRetention: logs.RetentionDays.ONE_MONTH,
    });
    const routerzFunc = new lambda.Function(this, 'routerz-func', {
      code: lambda.Code.fromInline(
        "function handler() { return 'cat'; }; exports.handler=handler;",
      ),
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'index.handler',
      functionName: 'microapps-routerz',
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
    //       or a Lambda @ Edge function that detecgts these and routes
    //       to origin Lambda Router function.

    //
    // APIGateway for appsapis.pwrdrvr.com
    //

    // Import certificate
    const certArn =
      'arn:aws:acm:us-east-2:***REMOVED***:certificate/533cdfa2-0528-484f-bd53-0a0d0dc6159c';
    const cert = acm.Certificate.fromCertificateArn(this, 'cert', certArn);

    // Create Custom Domains for API Gateway
    const dnApps = new apigwy.DomainName(this, 'micro-apps-http-api-dn', {
      domainName: 'apps.pwrdrvr.com',
      certificate: cert,
    });
    const dnAppsApis = new apigwy.DomainName(this, 'micro-apps-http-apps-api-dn', {
      domainName: 'appsapis.pwrdrvr.com',
      certificate: cert,
    });

    // Create an integration for the Router
    // Do this here since it's the default route
    const intRouter = new apigwyint.LambdaProxyIntegration({
      handler: routerFunc,
    });

    // Create APIGateway for apps-apis.pwrdrvr.com
    const httpApiDomainMapping: apigwy.DomainMappingOptions = {
      domainName: dnApps,
    };
    const httpApi = new apigwy.HttpApi(this, 'micro-apps-http-api', {
      defaultDomainMapping: httpApiDomainMapping,
      defaultIntegration: intRouter,
      apiName: 'microapps-apis',
    });

    //
    // Add a route to the Deployer function
    //
    const intDeployer = new apigwyint.LambdaProxyIntegration({
      handler: deployerFunc,
    });
    httpApi.addRoutes({
      path: '/deployer/{proxy+}',
      methods: [apigwy.HttpMethod.ANY],
      integration: intDeployer,
    });

    //
    // Let API Gateway accept request at apps-apis.pwrdrvr.com
    // That is the origin URI that CloudFront uses for this gateway.
    // The gateway will refuse the traffic if it doesn't have the
    // domain name registered.
    //
    const mappingAppsApis = new apigwy.ApiMapping(this, 'apps-apis-mapping', {
      api: httpApi,
      domainName: dnAppsApis,
    });
    mappingAppsApis.node.addDependency(dnAppsApis);

    //
    // Create the appsapis.pwrdrvr.com name
    //
    const zone = r53.HostedZone.fromHostedZoneAttributes(this, 'zone', {
      zoneName: 'pwrdrvr.com',
      hostedZoneId: 'ZHYNI9F572BBD',
    });

    const arecord = new r53.ARecord(this, 'ARecord', {
      zone: zone,
      recordName: 'appsapis',
      target: r53.RecordTarget.fromAlias(
        new r53targets.ApiGatewayv2DomainProperties(
          dnAppsApis.regionalDomainName,
          dnAppsApis.regionalHostedZoneId,
        ),
      ),
    });

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
