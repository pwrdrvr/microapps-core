# API Reference <a name="API Reference"></a>

## Constructs <a name="Constructs"></a>

### MicroApps <a name="@pwrdrvr/microapps-cdk.MicroApps"></a>

- *Implements:* [`@pwrdrvr/microapps-cdk.IMicroApps`](#@pwrdrvr/microapps-cdk.IMicroApps)

Create a new MicroApps "turnkey" construct for simple deployments and for initial evaulation of the MicroApps framework.

Use this construct to create a working entire stack.

Do not use this construct when adding MicroApps to an existing
CloudFront, API Gateway, S3 Bucket, etc. or where access
to all features of the AWS Resources are needed (e.g. to
add additional Behaviors to the CloudFront distribution, set authorizors
on API Gateway, etc.).

> {@link https://github.com/pwrdrvr/microapps-core/blob/main/packages/cdk/lib/MicroApps.ts | example usage in a CDK Stack }

#### Initializer <a name="@pwrdrvr/microapps-cdk.MicroApps.Initializer"></a>

```typescript
import { MicroApps } from '@pwrdrvr/microapps-cdk'

new MicroApps(scope: Construct, id: string, props?: MicroAppsProps)
```

##### `scope`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroApps.scope"></a>

- *Type:* [`constructs.Construct`](#constructs.Construct)

---

##### `id`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroApps.id"></a>

- *Type:* `string`

---

##### `props`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroApps.props"></a>

- *Type:* [`@pwrdrvr/microapps-cdk.MicroAppsProps`](#@pwrdrvr/microapps-cdk.MicroAppsProps)

---



#### Properties <a name="Properties"></a>

##### `apigwy`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroApps.apigwy"></a>

- *Type:* [`@pwrdrvr/microapps-cdk.IMicroAppsAPIGwy`](#@pwrdrvr/microapps-cdk.IMicroAppsAPIGwy)

{@inheritdoc IMicroAppsAPIGwy}.

---

##### `cf`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroApps.cf"></a>

- *Type:* [`@pwrdrvr/microapps-cdk.IMicroAppsCF`](#@pwrdrvr/microapps-cdk.IMicroAppsCF)

{@inheritdoc IMicroAppsCF}.

---

##### `s3`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroApps.s3"></a>

- *Type:* [`@pwrdrvr/microapps-cdk.IMicroAppsS3`](#@pwrdrvr/microapps-cdk.IMicroAppsS3)

{@inheritdoc IMicroAppsS3}.

---

##### `svcs`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroApps.svcs"></a>

- *Type:* [`@pwrdrvr/microapps-cdk.IMicroAppsSvcs`](#@pwrdrvr/microapps-cdk.IMicroAppsSvcs)

{@inheritdoc IMicroAppsSvcs}.

---


### MicroAppsAPIGwy <a name="@pwrdrvr/microapps-cdk.MicroAppsAPIGwy"></a>

- *Implements:* [`@pwrdrvr/microapps-cdk.IMicroAppsAPIGwy`](#@pwrdrvr/microapps-cdk.IMicroAppsAPIGwy)

Create a new MicroApps API Gateway HTTP API endpoint.

#### Initializer <a name="@pwrdrvr/microapps-cdk.MicroAppsAPIGwy.Initializer"></a>

```typescript
import { MicroAppsAPIGwy } from '@pwrdrvr/microapps-cdk'

new MicroAppsAPIGwy(scope: Construct, id: string, props?: MicroAppsAPIGwyProps)
```

##### `scope`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsAPIGwy.scope"></a>

- *Type:* [`constructs.Construct`](#constructs.Construct)

---

##### `id`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsAPIGwy.id"></a>

- *Type:* `string`

---

##### `props`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsAPIGwy.props"></a>

- *Type:* [`@pwrdrvr/microapps-cdk.MicroAppsAPIGwyProps`](#@pwrdrvr/microapps-cdk.MicroAppsAPIGwyProps)

---



#### Properties <a name="Properties"></a>

##### `httpApi`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsAPIGwy.httpApi"></a>

- *Type:* [`@aws-cdk/aws-apigatewayv2-alpha.HttpApi`](#@aws-cdk/aws-apigatewayv2-alpha.HttpApi)

API Gateway.

---

##### `dnAppsOrigin`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsAPIGwy.dnAppsOrigin"></a>

- *Type:* [`@aws-cdk/aws-apigatewayv2-alpha.IDomainName`](#@aws-cdk/aws-apigatewayv2-alpha.IDomainName)

Domain Name applied to API Gateway origin.

---


### MicroAppsCF <a name="@pwrdrvr/microapps-cdk.MicroAppsCF"></a>

- *Implements:* [`@pwrdrvr/microapps-cdk.IMicroAppsCF`](#@pwrdrvr/microapps-cdk.IMicroAppsCF)

Create a new MicroApps CloudFront Distribution.

#### Initializer <a name="@pwrdrvr/microapps-cdk.MicroAppsCF.Initializer"></a>

```typescript
import { MicroAppsCF } from '@pwrdrvr/microapps-cdk'

new MicroAppsCF(scope: Construct, id: string, props: MicroAppsCFProps)
```

##### `scope`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCF.scope"></a>

- *Type:* [`constructs.Construct`](#constructs.Construct)

---

##### `id`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCF.id"></a>

- *Type:* `string`

---

##### `props`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCF.props"></a>

- *Type:* [`@pwrdrvr/microapps-cdk.MicroAppsCFProps`](#@pwrdrvr/microapps-cdk.MicroAppsCFProps)

---


#### Static Functions <a name="Static Functions"></a>

##### `addRoutes` <a name="@pwrdrvr/microapps-cdk.MicroAppsCF.addRoutes"></a>

```typescript
import { MicroAppsCF } from '@pwrdrvr/microapps-cdk'

MicroAppsCF.addRoutes(_scope: Construct, props: AddRoutesOptions)
```

###### `_scope`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCF._scope"></a>

- *Type:* [`constructs.Construct`](#constructs.Construct)

---

###### `props`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCF.props"></a>

- *Type:* [`@pwrdrvr/microapps-cdk.AddRoutesOptions`](#@pwrdrvr/microapps-cdk.AddRoutesOptions)

---

##### `createAPIOriginPolicy` <a name="@pwrdrvr/microapps-cdk.MicroAppsCF.createAPIOriginPolicy"></a>

```typescript
import { MicroAppsCF } from '@pwrdrvr/microapps-cdk'

MicroAppsCF.createAPIOriginPolicy(scope: Construct, props: CreateAPIOriginPolicyOptions)
```

###### `scope`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCF.scope"></a>

- *Type:* [`constructs.Construct`](#constructs.Construct)

---

###### `props`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCF.props"></a>

- *Type:* [`@pwrdrvr/microapps-cdk.CreateAPIOriginPolicyOptions`](#@pwrdrvr/microapps-cdk.CreateAPIOriginPolicyOptions)

---

#### Properties <a name="Properties"></a>

##### `cloudFrontDistro`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCF.cloudFrontDistro"></a>

- *Type:* [`aws-cdk-lib.aws_cloudfront.Distribution`](#aws-cdk-lib.aws_cloudfront.Distribution)

---

##### `edgeToOriginFunction`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCF.edgeToOriginFunction"></a>

- *Type:* [`aws-cdk-lib.aws_cloudfront.experimental.EdgeFunction`](#aws-cdk-lib.aws_cloudfront.experimental.EdgeFunction) | [`aws-cdk-lib.aws_lambda.Function`](#aws-cdk-lib.aws_lambda.Function)

---


### MicroAppsS3 <a name="@pwrdrvr/microapps-cdk.MicroAppsS3"></a>

- *Implements:* [`@pwrdrvr/microapps-cdk.IMicroAppsS3`](#@pwrdrvr/microapps-cdk.IMicroAppsS3)

Create a new MicroApps S3 Bucket.

#### Initializer <a name="@pwrdrvr/microapps-cdk.MicroAppsS3.Initializer"></a>

```typescript
import { MicroAppsS3 } from '@pwrdrvr/microapps-cdk'

new MicroAppsS3(scope: Construct, id: string, props?: MicroAppsS3Props)
```

##### `scope`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsS3.scope"></a>

- *Type:* [`constructs.Construct`](#constructs.Construct)

---

##### `id`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsS3.id"></a>

- *Type:* `string`

---

##### `props`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsS3.props"></a>

- *Type:* [`@pwrdrvr/microapps-cdk.MicroAppsS3Props`](#@pwrdrvr/microapps-cdk.MicroAppsS3Props)

---



#### Properties <a name="Properties"></a>

##### `bucketApps`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsS3.bucketApps"></a>

- *Type:* [`aws-cdk-lib.aws_s3.IBucket`](#aws-cdk-lib.aws_s3.IBucket)

S3 bucket for deployed applications.

---

##### `bucketAppsOAI`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsS3.bucketAppsOAI"></a>

- *Type:* [`aws-cdk-lib.aws_cloudfront.OriginAccessIdentity`](#aws-cdk-lib.aws_cloudfront.OriginAccessIdentity)

CloudFront Origin Access Identity for the deployed applications bucket.

---

##### `bucketAppsOrigin`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsS3.bucketAppsOrigin"></a>

- *Type:* [`aws-cdk-lib.aws_cloudfront_origins.S3Origin`](#aws-cdk-lib.aws_cloudfront_origins.S3Origin)

CloudFront Origin for the deployed applications bucket.

---

##### `bucketAppsStaging`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsS3.bucketAppsStaging"></a>

- *Type:* [`aws-cdk-lib.aws_s3.IBucket`](#aws-cdk-lib.aws_s3.IBucket)

S3 bucket for staged applications (prior to deploy).

---

##### `bucketLogs`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsS3.bucketLogs"></a>

- *Type:* [`aws-cdk-lib.aws_s3.IBucket`](#aws-cdk-lib.aws_s3.IBucket)

S3 bucket for CloudFront logs.

---


### MicroAppsSvcs <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcs"></a>

- *Implements:* [`@pwrdrvr/microapps-cdk.IMicroAppsSvcs`](#@pwrdrvr/microapps-cdk.IMicroAppsSvcs)

Create a new MicroApps Services construct, including the Deployer and Router Lambda Functions, and the DynamoDB Table used by both.

#### Initializer <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcs.Initializer"></a>

```typescript
import { MicroAppsSvcs } from '@pwrdrvr/microapps-cdk'

new MicroAppsSvcs(scope: Construct, id: string, props?: MicroAppsSvcsProps)
```

##### `scope`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcs.scope"></a>

- *Type:* [`constructs.Construct`](#constructs.Construct)

---

##### `id`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcs.id"></a>

- *Type:* `string`

---

##### `props`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcs.props"></a>

- *Type:* [`@pwrdrvr/microapps-cdk.MicroAppsSvcsProps`](#@pwrdrvr/microapps-cdk.MicroAppsSvcsProps)

---



#### Properties <a name="Properties"></a>

##### `deployerFunc`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcs.deployerFunc"></a>

- *Type:* [`aws-cdk-lib.aws_lambda.IFunction`](#aws-cdk-lib.aws_lambda.IFunction)

Lambda function for the Deployer.

---

##### `routerFunc`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcs.routerFunc"></a>

- *Type:* [`aws-cdk-lib.aws_lambda.IFunction`](#aws-cdk-lib.aws_lambda.IFunction)

Lambda function for the Router.

---

##### `table`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcs.table"></a>

- *Type:* [`aws-cdk-lib.aws_dynamodb.ITable`](#aws-cdk-lib.aws_dynamodb.ITable)

DynamoDB table used by Router, Deployer, and Release console app.

---


## Structs <a name="Structs"></a>

### AddRoutesOptions <a name="@pwrdrvr/microapps-cdk.AddRoutesOptions"></a>

Options for `AddRoutes`.

#### Initializer <a name="[object Object].Initializer"></a>

```typescript
import { AddRoutesOptions } from '@pwrdrvr/microapps-cdk'

const addRoutesOptions: AddRoutesOptions = { ... }
```

##### `apiGwyOrigin`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.AddRoutesOptions.apiGwyOrigin"></a>

- *Type:* [`aws-cdk-lib.aws_cloudfront.IOrigin`](#aws-cdk-lib.aws_cloudfront.IOrigin)

API Gateway CloudFront Origin for API calls.

---

##### `apigwyOriginRequestPolicy`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.AddRoutesOptions.apigwyOriginRequestPolicy"></a>

- *Type:* [`aws-cdk-lib.aws_cloudfront.IOriginRequestPolicy`](#aws-cdk-lib.aws_cloudfront.IOriginRequestPolicy)

Origin Request policy for API Gateway Origin.

---

##### `bucketAppsOrigin`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.AddRoutesOptions.bucketAppsOrigin"></a>

- *Type:* [`aws-cdk-lib.aws_cloudfront_origins.S3Origin`](#aws-cdk-lib.aws_cloudfront_origins.S3Origin)

S3 Bucket CloudFront Origin for static assets.

---

##### `distro`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.AddRoutesOptions.distro"></a>

- *Type:* [`aws-cdk-lib.aws_cloudfront.Distribution`](#aws-cdk-lib.aws_cloudfront.Distribution)

CloudFront Distribution to add the Behaviors (Routes) to.

---

##### `apigwyEdgeFunctions`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.AddRoutesOptions.apigwyEdgeFunctions"></a>

- *Type:* [`aws-cdk-lib.aws_cloudfront.EdgeLambda`](#aws-cdk-lib.aws_cloudfront.EdgeLambda)[]

Edge lambdas to associate with the API Gateway routes.

---

##### `createAPIPathRoute`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.AddRoutesOptions.createAPIPathRoute"></a>

- *Type:* `boolean`
- *Default:* true

Create an extra Behavior (Route) for /api/ that allows API routes to have a period in them.

When false API routes with a period in the path will get routed to S3.

When true API routes that contain /api/ in the path will get routed to API Gateway
even if they have a period in the path.

---

##### `rootPathPrefix`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.AddRoutesOptions.rootPathPrefix"></a>

- *Type:* `string`

Path prefix on the root of the CloudFront distribution.

---

### CreateAPIOriginPolicyOptions <a name="@pwrdrvr/microapps-cdk.CreateAPIOriginPolicyOptions"></a>

Options for the `CreateAPIOriginPolicy`.

#### Initializer <a name="[object Object].Initializer"></a>

```typescript
import { CreateAPIOriginPolicyOptions } from '@pwrdrvr/microapps-cdk'

const createAPIOriginPolicyOptions: CreateAPIOriginPolicyOptions = { ... }
```

##### `assetNameRoot`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.CreateAPIOriginPolicyOptions.assetNameRoot"></a>

- *Type:* `string`
- *Default:* resource names auto assigned

Optional asset name root.

---

##### `assetNameSuffix`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.CreateAPIOriginPolicyOptions.assetNameSuffix"></a>

- *Type:* `string`
- *Default:* none

Optional asset name suffix.

---

##### `domainNameEdge`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.CreateAPIOriginPolicyOptions.domainNameEdge"></a>

- *Type:* `string`

Edge domain name used by CloudFront - If set a custom OriginRequestPolicy will be created that prevents the Host header from being passed to the origin.

---

### MicroAppsAPIGwyProps <a name="@pwrdrvr/microapps-cdk.MicroAppsAPIGwyProps"></a>

Properties to initialize an instance of `MicroAppsAPIGwy`.

#### Initializer <a name="[object Object].Initializer"></a>

```typescript
import { MicroAppsAPIGwyProps } from '@pwrdrvr/microapps-cdk'

const microAppsAPIGwyProps: MicroAppsAPIGwyProps = { ... }
```

##### `assetNameRoot`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsAPIGwyProps.assetNameRoot"></a>

- *Type:* `string`
- *Default:* resource names auto assigned

Optional asset name root.

---

##### `assetNameSuffix`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsAPIGwyProps.assetNameSuffix"></a>

- *Type:* `string`
- *Default:* none

Optional asset name suffix.

---

##### `certOrigin`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsAPIGwyProps.certOrigin"></a>

- *Type:* [`aws-cdk-lib.aws_certificatemanager.ICertificate`](#aws-cdk-lib.aws_certificatemanager.ICertificate)
- *Default:* none

Optional local region ACM certificate to use for API Gateway Note: required when using a custom domain.

---

##### `domainNameEdge`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsAPIGwyProps.domainNameEdge"></a>

- *Type:* `string`
- *Default:* auto-assigned

CloudFront edge domain name.

---

##### `domainNameOrigin`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsAPIGwyProps.domainNameOrigin"></a>

- *Type:* `string`
- *Default:* auto-assigned

API Gateway origin domain name.

---

##### `r53Zone`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsAPIGwyProps.r53Zone"></a>

- *Type:* [`aws-cdk-lib.aws_route53.IHostedZone`](#aws-cdk-lib.aws_route53.IHostedZone)

Route53 zone in which to create optional `domainNameEdge` record.

---

##### `removalPolicy`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsAPIGwyProps.removalPolicy"></a>

- *Type:* [`aws-cdk-lib.RemovalPolicy`](#aws-cdk-lib.RemovalPolicy)
- *Default:* per resource default

RemovalPolicy override for child resources.

Note: if set to DESTROY the S3 buckes will have `autoDeleteObjects` set to `true`

---

##### `rootPathPrefix`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsAPIGwyProps.rootPathPrefix"></a>

- *Type:* `string`
- *Default:* none

Path prefix on the root of the API Gateway Stage.

---

### MicroAppsCFProps <a name="@pwrdrvr/microapps-cdk.MicroAppsCFProps"></a>

Properties to initialize an instance of `MicroAppsCF`.

#### Initializer <a name="[object Object].Initializer"></a>

```typescript
import { MicroAppsCFProps } from '@pwrdrvr/microapps-cdk'

const microAppsCFProps: MicroAppsCFProps = { ... }
```

##### `bucketAppsOrigin`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCFProps.bucketAppsOrigin"></a>

- *Type:* [`aws-cdk-lib.aws_cloudfront_origins.S3Origin`](#aws-cdk-lib.aws_cloudfront_origins.S3Origin)

S3 bucket origin for deployed applications.

---

##### `httpApi`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCFProps.httpApi"></a>

- *Type:* [`@aws-cdk/aws-apigatewayv2-alpha.HttpApi`](#@aws-cdk/aws-apigatewayv2-alpha.HttpApi)

API Gateway v2 HTTP API for apps.

---

##### `assetNameRoot`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCFProps.assetNameRoot"></a>

- *Type:* `string`
- *Default:* resource names auto assigned

Optional asset name root.

---

##### `assetNameSuffix`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCFProps.assetNameSuffix"></a>

- *Type:* `string`
- *Default:* none

Optional asset name suffix.

---

##### `bucketLogs`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCFProps.bucketLogs"></a>

- *Type:* [`aws-cdk-lib.aws_s3.IBucket`](#aws-cdk-lib.aws_s3.IBucket)

S3 bucket for CloudFront logs.

---

##### `certEdge`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCFProps.certEdge"></a>

- *Type:* [`aws-cdk-lib.aws_certificatemanager.ICertificate`](#aws-cdk-lib.aws_certificatemanager.ICertificate)

ACM Certificate that covers `domainNameEdge` name.

---

##### `createAPIPathRoute`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCFProps.createAPIPathRoute"></a>

- *Type:* `boolean`
- *Default:* true

Create an extra Behavior (Route) for /api/ that allows API routes to have a period in them.

When false API routes with a period in the path will get routed to S3.

When true API routes that contain /api/ in the path will get routed to API Gateway
even if they have a period in the path.

---

##### `domainNameEdge`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCFProps.domainNameEdge"></a>

- *Type:* `string`
- *Default:* auto-assigned

CloudFront Distribution domain name.

---

##### `domainNameOrigin`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCFProps.domainNameOrigin"></a>

- *Type:* `string`
- *Default:* retrieved from httpApi, if possible

API Gateway custom origin domain name.

---

##### `r53Zone`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCFProps.r53Zone"></a>

- *Type:* [`aws-cdk-lib.aws_route53.IHostedZone`](#aws-cdk-lib.aws_route53.IHostedZone)

Route53 zone in which to create optional `domainNameEdge` record.

---

##### `removalPolicy`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCFProps.removalPolicy"></a>

- *Type:* [`aws-cdk-lib.RemovalPolicy`](#aws-cdk-lib.RemovalPolicy)
- *Default:* per resource default

RemovalPolicy override for child resources.

Note: if set to DESTROY the S3 buckes will have `autoDeleteObjects` set to `true`

---

##### `rootPathPrefix`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCFProps.rootPathPrefix"></a>

- *Type:* `string`

Path prefix on the root of the CloudFront distribution.

---

### MicroAppsProps <a name="@pwrdrvr/microapps-cdk.MicroAppsProps"></a>

Properties to initialize an instance of `MicroApps`.

#### Initializer <a name="[object Object].Initializer"></a>

```typescript
import { MicroAppsProps } from '@pwrdrvr/microapps-cdk'

const microAppsProps: MicroAppsProps = { ... }
```

##### `appEnv`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.appEnv"></a>

- *Type:* `string`
- *Default:* dev

Passed to NODE_ENV of Router and Deployer Lambda functions.

---

##### `assetNameRoot`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.assetNameRoot"></a>

- *Type:* `string`
- *Default:* resource names auto assigned

Optional asset name root.

---

##### `assetNameSuffix`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.assetNameSuffix"></a>

- *Type:* `string`
- *Default:* none

Optional asset name suffix.

---

##### `certEdge`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.certEdge"></a>

- *Type:* [`aws-cdk-lib.aws_certificatemanager.ICertificate`](#aws-cdk-lib.aws_certificatemanager.ICertificate)

Certificate in US-East-1 for the CloudFront distribution.

---

##### `certOrigin`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.certOrigin"></a>

- *Type:* [`aws-cdk-lib.aws_certificatemanager.ICertificate`](#aws-cdk-lib.aws_certificatemanager.ICertificate)

Certificate in deployed region for the API Gateway.

---

##### `createAPIPathRoute`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.createAPIPathRoute"></a>

- *Type:* `boolean`
- *Default:* true

Create an extra Behavior (Route) for /api/ that allows API routes to have a period in them.

When false API routes with a period in the path will get routed to S3.

When true API routes that contain /api/ in the path will get routed to API Gateway
even if they have a period in the path.

---

##### `domainNameEdge`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.domainNameEdge"></a>

- *Type:* `string`
- *Default:* auto-assigned

Optional custom domain name for the CloudFront distribution.

---

##### `domainNameOrigin`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.domainNameOrigin"></a>

- *Type:* `string`
- *Default:* auto-assigned

Optional custom domain name for the API Gateway HTTPv2 API.

---

##### `r53Zone`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.r53Zone"></a>

- *Type:* [`aws-cdk-lib.aws_route53.IHostedZone`](#aws-cdk-lib.aws_route53.IHostedZone)

Route53 zone in which to create optional `domainNameEdge` record.

---

##### `removalPolicy`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.removalPolicy"></a>

- *Type:* [`aws-cdk-lib.RemovalPolicy`](#aws-cdk-lib.RemovalPolicy)
- *Default:* per resource default

RemovalPolicy override for child resources.

Note: if set to DESTROY the S3 buckes will have `autoDeleteObjects` set to `true`

---

##### `rootPathPrefix`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.rootPathPrefix"></a>

- *Type:* `string`

Path prefix on the root of the CloudFront distribution.

---

##### `s3PolicyBypassAROAs`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.s3PolicyBypassAROAs"></a>

- *Type:* `string`[]

Applies when using s3StrictBucketPolicy = true.

AROAs of the IAM Role to exclude from the DENY rules on the S3 Bucket Policy.
This allows sessions that assume the IAM Role to be excluded from the
DENY rules on the S3 Bucket Policy.

Typically any admin roles / users that need to view or manage the S3 Bucket
would be added to this list.

Roles / users that are used directly, not assumed, can be added to `s3PolicyBypassRoleNames` instead.

Note: This AROA must be specified to prevent this policy from locking
out non-root sessions that have assumed the admin role.

The notPrincipals will only match the role name exactly and will not match
any session that has assumed the role since notPrincipals does not allow
wildcard matches and does not do wildcard matches implicitly either.

The AROA must be used because there are only 3 Principal variables available:
  https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_variables.html#principaltable
  aws:username, aws:userid, aws:PrincipalTag

For an assumed role, aws:username is blank, aws:userid is:
  [unique id AKA AROA for Role]:[session name]

Table of unique ID prefixes such as AROA:
  https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_identifiers.html#identifiers-prefixes

The name of the role is simply not available for an assumed role and, if it was,
a complicated comparison would be requierd to prevent exclusion
of applying the Deny Rule to roles from other accounts.

To get the AROA with the AWS CLI:
   aws iam get-role --role-name ROLE-NAME
   aws iam get-user -–user-name USER-NAME

> s3StrictBucketPolicy

---

##### `s3PolicyBypassPrincipalARNs`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.s3PolicyBypassPrincipalARNs"></a>

- *Type:* `string`[]

Applies when using s3StrictBucketPolicy = true.

IAM Role or IAM User names to exclude from the DENY rules on the S3 Bucket Policy.

Roles that are Assumed must instead have their AROA added to `s3PolicyBypassAROAs`.

Typically any admin roles / users that need to view or manage the S3 Bucket
would be added to this list.

> s3PolicyBypassAROAs

---

##### `s3StrictBucketPolicy`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.s3StrictBucketPolicy"></a>

- *Type:* `boolean`
- *Default:* false

Use a strict S3 Bucket Policy that prevents applications from reading/writing/modifying/deleting files in the S3 Bucket outside of the path that is specific to their app/version.

This setting should be used when applications are less than
fully trusted.

---

### MicroAppsS3Props <a name="@pwrdrvr/microapps-cdk.MicroAppsS3Props"></a>

Properties to initialize an instance of `MicroAppsS3`.

#### Initializer <a name="[object Object].Initializer"></a>

```typescript
import { MicroAppsS3Props } from '@pwrdrvr/microapps-cdk'

const microAppsS3Props: MicroAppsS3Props = { ... }
```

##### `assetNameRoot`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsS3Props.assetNameRoot"></a>

- *Type:* `string`
- *Default:* resource names auto assigned

Optional asset name root.

---

##### `assetNameSuffix`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsS3Props.assetNameSuffix"></a>

- *Type:* `string`
- *Default:* none

Optional asset name suffix.

---

##### `bucketAppsName`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsS3Props.bucketAppsName"></a>

- *Type:* `string`
- *Default:* auto-assigned

S3 deployed apps bucket name.

---

##### `bucketAppsStagingName`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsS3Props.bucketAppsStagingName"></a>

- *Type:* `string`
- *Default:* auto-assigned

S3 staging apps bucket name.

---

##### `bucketLogsName`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsS3Props.bucketLogsName"></a>

- *Type:* `string`
- *Default:* auto-assigned

S3 logs bucket name.

---

##### `removalPolicy`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsS3Props.removalPolicy"></a>

- *Type:* [`aws-cdk-lib.RemovalPolicy`](#aws-cdk-lib.RemovalPolicy)
- *Default:* per resource default

RemovalPolicy override for child resources.

Note: if set to DESTROY the S3 buckets will have `autoDeleteObjects` set to `true`

---

### MicroAppsSvcsProps <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcsProps"></a>

Properties to initialize an instance of `MicroAppsSvcs`.

#### Initializer <a name="[object Object].Initializer"></a>

```typescript
import { MicroAppsSvcsProps } from '@pwrdrvr/microapps-cdk'

const microAppsSvcsProps: MicroAppsSvcsProps = { ... }
```

##### `appEnv`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.appEnv"></a>

- *Type:* `string`

Application environment, passed as `NODE_ENV` to the Router and Deployer Lambda functions.

---

##### `bucketApps`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.bucketApps"></a>

- *Type:* [`aws-cdk-lib.aws_s3.IBucket`](#aws-cdk-lib.aws_s3.IBucket)

S3 bucket for deployed applications.

---

##### `bucketAppsOAI`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.bucketAppsOAI"></a>

- *Type:* [`aws-cdk-lib.aws_cloudfront.OriginAccessIdentity`](#aws-cdk-lib.aws_cloudfront.OriginAccessIdentity)

CloudFront Origin Access Identity for the deployed applications bucket.

---

##### `bucketAppsStaging`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.bucketAppsStaging"></a>

- *Type:* [`aws-cdk-lib.aws_s3.IBucket`](#aws-cdk-lib.aws_s3.IBucket)

S3 bucket for staged applications (prior to deploy).

---

##### `httpApi`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.httpApi"></a>

- *Type:* [`@aws-cdk/aws-apigatewayv2-alpha.HttpApi`](#@aws-cdk/aws-apigatewayv2-alpha.HttpApi)

API Gateway v2 HTTP for Router and app.

---

##### `assetNameRoot`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.assetNameRoot"></a>

- *Type:* `string`
- *Default:* resource names auto assigned

Optional asset name root.

---

##### `assetNameSuffix`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.assetNameSuffix"></a>

- *Type:* `string`
- *Default:* none

Optional asset name suffix.

---

##### `removalPolicy`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.removalPolicy"></a>

- *Type:* [`aws-cdk-lib.RemovalPolicy`](#aws-cdk-lib.RemovalPolicy)
- *Default:* per resource default

RemovalPolicy override for child resources.

Note: if set to DESTROY the S3 buckes will have `autoDeleteObjects` set to `true`

---

##### `rootPathPrefix`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.rootPathPrefix"></a>

- *Type:* `string`
- *Default:* none

Path prefix on the root of the deployment.

---

##### `s3PolicyBypassAROAs`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.s3PolicyBypassAROAs"></a>

- *Type:* `string`[]

Applies when using s3StrictBucketPolicy = true.

AROAs of the IAM Role to exclude from the DENY rules on the S3 Bucket Policy.
This allows sessions that assume the IAM Role to be excluded from the
DENY rules on the S3 Bucket Policy.

Typically any admin roles / users that need to view or manage the S3 Bucket
would be added to this list.

Roles / users that are used directly, not assumed, can be added to `s3PolicyBypassRoleNames` instead.

Note: This AROA must be specified to prevent this policy from locking
out non-root sessions that have assumed the admin role.

The notPrincipals will only match the role name exactly and will not match
any session that has assumed the role since notPrincipals does not allow
wildcard matches and does not do wildcard matches implicitly either.

The AROA must be used because there are only 3 Principal variables available:
  https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_variables.html#principaltable
  aws:username, aws:userid, aws:PrincipalTag

For an assumed role, aws:username is blank, aws:userid is:
  [unique id AKA AROA for Role]:[session name]

Table of unique ID prefixes such as AROA:
  https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_identifiers.html#identifiers-prefixes

The name of the role is simply not available for an assumed role and, if it was,
a complicated comparison would be requierd to prevent exclusion
of applying the Deny Rule to roles from other accounts.

To get the AROA with the AWS CLI:
   aws iam get-role --role-name ROLE-NAME
   aws iam get-user -–user-name USER-NAME

> s3StrictBucketPolicy

---

##### `s3PolicyBypassPrincipalARNs`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.s3PolicyBypassPrincipalARNs"></a>

- *Type:* `string`[]

Applies when using s3StrictBucketPolicy = true.

IAM Role or IAM User names to exclude from the DENY rules on the S3 Bucket Policy.

Roles that are Assumed must instead have their AROA added to `s3PolicyBypassAROAs`.

Typically any admin roles / users that need to view or manage the S3 Bucket
would be added to this list.

> s3PolicyBypassAROAs

---

##### `s3StrictBucketPolicy`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.s3StrictBucketPolicy"></a>

- *Type:* `boolean`
- *Default:* false

Use a strict S3 Bucket Policy that prevents applications from reading/writing/modifying/deleting files in the S3 Bucket outside of the path that is specific to their app/version.

This setting should be used when applications are less than
fully trusted.

---


## Protocols <a name="Protocols"></a>

### IMicroApps <a name="@pwrdrvr/microapps-cdk.IMicroApps"></a>

- *Implemented By:* [`@pwrdrvr/microapps-cdk.MicroApps`](#@pwrdrvr/microapps-cdk.MicroApps), [`@pwrdrvr/microapps-cdk.IMicroApps`](#@pwrdrvr/microapps-cdk.IMicroApps)

Represents a MicroApps.


#### Properties <a name="Properties"></a>

##### `apigwy`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.IMicroApps.apigwy"></a>

- *Type:* [`@pwrdrvr/microapps-cdk.IMicroAppsAPIGwy`](#@pwrdrvr/microapps-cdk.IMicroAppsAPIGwy)

{@inheritdoc IMicroAppsAPIGwy}.

---

##### `cf`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.IMicroApps.cf"></a>

- *Type:* [`@pwrdrvr/microapps-cdk.IMicroAppsCF`](#@pwrdrvr/microapps-cdk.IMicroAppsCF)

{@inheritdoc IMicroAppsCF}.

---

##### `s3`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.IMicroApps.s3"></a>

- *Type:* [`@pwrdrvr/microapps-cdk.IMicroAppsS3`](#@pwrdrvr/microapps-cdk.IMicroAppsS3)

{@inheritdoc IMicroAppsS3}.

---

##### `svcs`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.IMicroApps.svcs"></a>

- *Type:* [`@pwrdrvr/microapps-cdk.IMicroAppsSvcs`](#@pwrdrvr/microapps-cdk.IMicroAppsSvcs)

{@inheritdoc IMicroAppsSvcs}.

---

### IMicroAppsAPIGwy <a name="@pwrdrvr/microapps-cdk.IMicroAppsAPIGwy"></a>

- *Implemented By:* [`@pwrdrvr/microapps-cdk.MicroAppsAPIGwy`](#@pwrdrvr/microapps-cdk.MicroAppsAPIGwy), [`@pwrdrvr/microapps-cdk.IMicroAppsAPIGwy`](#@pwrdrvr/microapps-cdk.IMicroAppsAPIGwy)

Represents a MicroApps API Gateway.


#### Properties <a name="Properties"></a>

##### `httpApi`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.IMicroAppsAPIGwy.httpApi"></a>

- *Type:* [`@aws-cdk/aws-apigatewayv2-alpha.HttpApi`](#@aws-cdk/aws-apigatewayv2-alpha.HttpApi)

API Gateway.

---

##### `dnAppsOrigin`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.IMicroAppsAPIGwy.dnAppsOrigin"></a>

- *Type:* [`@aws-cdk/aws-apigatewayv2-alpha.IDomainName`](#@aws-cdk/aws-apigatewayv2-alpha.IDomainName)

Domain Name applied to API Gateway origin.

---

### IMicroAppsCF <a name="@pwrdrvr/microapps-cdk.IMicroAppsCF"></a>

- *Implemented By:* [`@pwrdrvr/microapps-cdk.MicroAppsCF`](#@pwrdrvr/microapps-cdk.MicroAppsCF), [`@pwrdrvr/microapps-cdk.IMicroAppsCF`](#@pwrdrvr/microapps-cdk.IMicroAppsCF)

Represents a MicroApps CloudFront.


#### Properties <a name="Properties"></a>

##### `cloudFrontDistro`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.IMicroAppsCF.cloudFrontDistro"></a>

- *Type:* [`aws-cdk-lib.aws_cloudfront.Distribution`](#aws-cdk-lib.aws_cloudfront.Distribution)

---

##### `edgeToOriginFunction`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.IMicroAppsCF.edgeToOriginFunction"></a>

- *Type:* [`aws-cdk-lib.aws_cloudfront.experimental.EdgeFunction`](#aws-cdk-lib.aws_cloudfront.experimental.EdgeFunction) | [`aws-cdk-lib.aws_lambda.Function`](#aws-cdk-lib.aws_lambda.Function)

---

### IMicroAppsS3 <a name="@pwrdrvr/microapps-cdk.IMicroAppsS3"></a>

- *Implemented By:* [`@pwrdrvr/microapps-cdk.MicroAppsS3`](#@pwrdrvr/microapps-cdk.MicroAppsS3), [`@pwrdrvr/microapps-cdk.IMicroAppsS3`](#@pwrdrvr/microapps-cdk.IMicroAppsS3)

Represents a MicroApps S3.


#### Properties <a name="Properties"></a>

##### `bucketApps`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.IMicroAppsS3.bucketApps"></a>

- *Type:* [`aws-cdk-lib.aws_s3.IBucket`](#aws-cdk-lib.aws_s3.IBucket)

S3 bucket for deployed applications.

---

##### `bucketAppsOAI`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.IMicroAppsS3.bucketAppsOAI"></a>

- *Type:* [`aws-cdk-lib.aws_cloudfront.OriginAccessIdentity`](#aws-cdk-lib.aws_cloudfront.OriginAccessIdentity)

CloudFront Origin Access Identity for the deployed applications bucket.

---

##### `bucketAppsOrigin`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.IMicroAppsS3.bucketAppsOrigin"></a>

- *Type:* [`aws-cdk-lib.aws_cloudfront_origins.S3Origin`](#aws-cdk-lib.aws_cloudfront_origins.S3Origin)

CloudFront Origin for the deployed applications bucket.

---

##### `bucketAppsStaging`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.IMicroAppsS3.bucketAppsStaging"></a>

- *Type:* [`aws-cdk-lib.aws_s3.IBucket`](#aws-cdk-lib.aws_s3.IBucket)

S3 bucket for staged applications (prior to deploy).

---

##### `bucketLogs`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.IMicroAppsS3.bucketLogs"></a>

- *Type:* [`aws-cdk-lib.aws_s3.IBucket`](#aws-cdk-lib.aws_s3.IBucket)

S3 bucket for CloudFront logs.

---

### IMicroAppsSvcs <a name="@pwrdrvr/microapps-cdk.IMicroAppsSvcs"></a>

- *Implemented By:* [`@pwrdrvr/microapps-cdk.MicroAppsSvcs`](#@pwrdrvr/microapps-cdk.MicroAppsSvcs), [`@pwrdrvr/microapps-cdk.IMicroAppsSvcs`](#@pwrdrvr/microapps-cdk.IMicroAppsSvcs)

Represents a MicroApps Services.


#### Properties <a name="Properties"></a>

##### `deployerFunc`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.IMicroAppsSvcs.deployerFunc"></a>

- *Type:* [`aws-cdk-lib.aws_lambda.IFunction`](#aws-cdk-lib.aws_lambda.IFunction)

Lambda function for the Deployer.

---

##### `routerFunc`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.IMicroAppsSvcs.routerFunc"></a>

- *Type:* [`aws-cdk-lib.aws_lambda.IFunction`](#aws-cdk-lib.aws_lambda.IFunction)

Lambda function for the Router.

---

##### `table`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.IMicroAppsSvcs.table"></a>

- *Type:* [`aws-cdk-lib.aws_dynamodb.ITable`](#aws-cdk-lib.aws_dynamodb.ITable)

DynamoDB table used by Router, Deployer, and Release console app.

---

