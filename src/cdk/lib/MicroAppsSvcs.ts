import * as cdk from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import * as iam from '@aws-cdk/aws-iam';
import * as apigwy from '@aws-cdk/aws-apigatewayv2';
import * as apigwyint from '@aws-cdk/aws-apigatewayv2-integrations';
import * as s3 from '@aws-cdk/aws-s3';
import * as r53 from '@aws-cdk/aws-route53';
import * as r53targets from '@aws-cdk/aws-route53-targets';
import * as logs from '@aws-cdk/aws-logs';
import * as acm from '@aws-cdk/aws-certificatemanager';
import { IMicroAppsCFExports } from './MicroAppsCF';
import { IMicroAppsReposExports } from './MicroAppsRepos';
import { IMicroAppsS3Exports } from './MicroAppsS3';
import SharedProps from './SharedProps';
import SharedTags from './SharedTags';

interface IMicroAppsSvcsStackProps extends cdk.ResourceProps {
  reposExports: IMicroAppsReposExports;
  cfStackExports: IMicroAppsCFExports;
  s3Exports: IMicroAppsS3Exports;
  local: {
    domainNameEdge: string;
    domainNameOrigin: string;
    cert: acm.ICertificate;
  };
  shared: SharedProps;
}

export interface IMicroAppsSvcsExports {
  dnAppsOrigin: apigwy.DomainName;
}

export class MicroAppsSvcs extends cdk.Construct implements IMicroAppsSvcsExports {
  private _dnAppsOrigin: apigwy.DomainName;
  public get dnAppsOrigin(): apigwy.DomainName {
    return this._dnAppsOrigin;
  }

  constructor(scope: cdk.Construct, id: string, props?: IMicroAppsSvcsStackProps) {
    super(scope, id);

    if (props === undefined) {
      throw new Error('props cannot be undefined');
    }

    const { bucketApps, bucketAppsName, bucketAppsOAI, bucketAppsStaging, bucketAppsStagingName } =
      props.s3Exports;
    const { cert, domainNameOrigin } = props.local;
    const { shared } = props;
    const { r53ZoneID, r53ZoneName, s3PolicyBypassAROA, s3PolicyBypassRoleName } = shared;

    SharedTags.addEnvTag(this, shared.env, shared.isPR);

    const apigatewayName = `microapps${shared.envSuffix}${shared.prSuffix}`;

    //
    // DynamoDB Table
    //
    const table = new dynamodb.Table(this, 'microapps-router-table', {
      tableName: `microapps${shared.envSuffix}${shared.prSuffix}`,
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
    if (shared.isPR) {
      table.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    }

    //
    // Deployer Lambda Function
    //

    // Create Deployer Lambda Function
    const deployerFunc = new lambda.DockerImageFunction(this, 'microapps-deployer-func', {
      functionName: `microapps-deployer${shared.envSuffix}${shared.prSuffix}`,
      code: lambda.DockerImageCode.fromEcr(props.reposExports.repoDeployer),
      timeout: cdk.Duration.seconds(60),
      memorySize: 1024,
      logRetention: logs.RetentionDays.ONE_MONTH,
      environment: {
        NODE_ENV: shared.env,
        APIGWY_NAME: apigatewayName,
        DATABASE_TABLE_NAME: table.tableName,
        FILESTORE_STAGING_BUCKET: bucketAppsStagingName,
        FILESTORE_DEST_BUCKET: bucketAppsName,
      },
    });
    if (shared.isPR) {
      deployerFunc.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    }
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
          bucketAppsOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId,
        ),
        new iam.AccountRootPrincipal(),
        new iam.ArnPrincipal(`arn:aws:iam::${shared.account}:role/${s3PolicyBypassRoleName}`),
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
          bucketAppsOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId,
        ),
        new iam.AccountRootPrincipal(),
        new iam.ArnPrincipal(`arn:aws:iam::${shared.account}:role/${s3PolicyBypassRoleName}`),
        deployerFunc.grantPrincipal,
        new iam.ArnPrincipal(
          `arn:aws:sts::${shared.account}:assumed-role/${deployerFunc?.role?.roleName}/${deployerFunc.functionName}`,
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
        StringNotLike: { 'aws:userid': [`${s3PolicyBypassAROA}:*`, shared.account] },
      },
    });
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
      functionName: `microapps-router${shared.envSuffix}${shared.prSuffix}`,
      code: lambda.DockerImageCode.fromEcr(props.reposExports.repoRouter),
      timeout: cdk.Duration.seconds(15),
      memorySize: 1024,
      logRetention: logs.RetentionDays.ONE_MONTH,
      environment: {
        NODE_ENV: shared.env,
        DATABASE_TABLE_NAME: table.tableName,
      },
    });
    if (shared.isPR) {
      routerFunc.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    }
    // Zip version of the function
    // This is *much* faster on cold inits
    const routerzFunc = new lambdaNodejs.NodejsFunction(this, 'microapps-routerz2-func', {
      functionName: `microapps-routerz2${shared.envSuffix}${shared.prSuffix}`,
      entry: './src/microapps-router/src/index.ts',
      handler: 'handler',
      logRetention: logs.RetentionDays.ONE_MONTH,
      memorySize: 1024,
      runtime: lambda.Runtime.NODEJS_14_X,
      awsSdkConnectionReuse: true,
      timeout: cdk.Duration.seconds(15),
      environment: {
        NODE_ENV: shared.env,
        DATABASE_TABLE_NAME: table.tableName,
      },
    });
    if (shared.isPR) {
      routerzFunc.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    }
    const policyReadTarget = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['s3:GetObject'],
      resources: [`${bucketApps.bucketArn}/*`],
    });
    for (const router of [routerFunc, routerzFunc]) {
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
      domainName: props.local.domainNameEdge,
      certificate: cert,
    });
    if (shared.isPR) {
      dnAppsEdge.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    }
    this._dnAppsOrigin = new apigwy.DomainName(this, 'microapps-apps-origin-dn', {
      domainName: props.local.domainNameOrigin,
      certificate: cert,
    });
    if (shared.isPR) {
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
    if (shared.isPR) {
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
    if (shared.isPR) {
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
      resources: [`arn:aws:apigateway:${shared.region}::/apis`],
    });
    deployerFunc.addToRolePolicy(policyAPIList);
    // Grant full control over the API we created
    const policyAPIManage = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['apigateway:*'],
      resources: [
        `arn:aws:apigateway:${shared.region}:${shared.account}:${httpApi.httpApiId}/*`,
        `arn:aws:apigateway:${shared.region}::/apis/${httpApi.httpApiId}/integrations`,
        `arn:aws:apigateway:${shared.region}::/apis/${httpApi.httpApiId}/routes`,
      ],
    });
    deployerFunc.addToRolePolicy(policyAPIManage);
    // Grant full control over lambdas that indicate they are microapps
    const policyAPIManageLambdas = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['lambda:*'],
      resources: [
        `arn:aws:lambda:${shared.region}:${shared.account}:function:*`,
        `arn:aws:lambda:${shared.region}:${shared.account}:function:*:*`,
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
    if (shared.isPR) {
      rrAppsOrigin.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    }
  }
}
