# API Reference <a name="API Reference"></a>

## Constructs <a name="Constructs"></a>

### MicroApps <a name="@pwrdrvr/microapps-cdk.MicroApps"></a>

- *Implements:* [`@pwrdrvr/microapps-cdk.IMicroApps`](#@pwrdrvr/microapps-cdk.IMicroApps)

Create a new MicroApps "turnkey" construct for simple deployments and for initial evaulation of the MicroApps framework.

Use this construct to create a PoC working entire stack.

Do not use this construct when adding MicroApps to an existing
CloudFront, API Gateway, S3 Bucket, etc. or where access
to all features of the AWS Resources are needed (e.g. to
add additional Behaviors to the CloudFront distribution, set authorizors
on API Gateway, etc.).

> {@link https://github.com/pwrdrvr/microapps-core/blob/main/packages/cdk/lib/MicroApps.ts example usage in a CDK Stack }

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

##### `edgeToOrigin`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroApps.edgeToOrigin"></a>

- *Type:* [`@pwrdrvr/microapps-cdk.IMicroAppsEdgeToOrigin`](#@pwrdrvr/microapps-cdk.IMicroAppsEdgeToOrigin)

{@inheritdoc IMicroAppsEdgeToOrigin}.

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

MicroAppsCF.createAPIOriginPolicy(_scope: Construct, _props: CreateAPIOriginPolicyOptions)
```

###### `_scope`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCF._scope"></a>

- *Type:* [`constructs.Construct`](#constructs.Construct)

---

###### `_props`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCF._props"></a>

- *Type:* [`@pwrdrvr/microapps-cdk.CreateAPIOriginPolicyOptions`](#@pwrdrvr/microapps-cdk.CreateAPIOriginPolicyOptions)

---

#### Properties <a name="Properties"></a>

##### `cloudFrontDistro`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCF.cloudFrontDistro"></a>

- *Type:* [`aws-cdk-lib.aws_cloudfront.Distribution`](#aws-cdk-lib.aws_cloudfront.Distribution)

The CloudFront distribution.

---


### MicroAppsChildDeployer <a name="@pwrdrvr/microapps-cdk.MicroAppsChildDeployer"></a>

- *Implements:* [`@pwrdrvr/microapps-cdk.IMicroAppsChildDeployer`](#@pwrdrvr/microapps-cdk.IMicroAppsChildDeployer)

Create a new MicroApps Child Deployer construct.

#### Initializer <a name="@pwrdrvr/microapps-cdk.MicroAppsChildDeployer.Initializer"></a>

```typescript
import { MicroAppsChildDeployer } from '@pwrdrvr/microapps-cdk'

new MicroAppsChildDeployer(scope: Construct, id: string, props?: MicroAppsChildDeployerProps)
```

##### `scope`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsChildDeployer.scope"></a>

- *Type:* [`constructs.Construct`](#constructs.Construct)

---

##### `id`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsChildDeployer.id"></a>

- *Type:* `string`

---

##### `props`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsChildDeployer.props"></a>

- *Type:* [`@pwrdrvr/microapps-cdk.MicroAppsChildDeployerProps`](#@pwrdrvr/microapps-cdk.MicroAppsChildDeployerProps)

---



#### Properties <a name="Properties"></a>

##### `deployerFunc`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsChildDeployer.deployerFunc"></a>

- *Type:* [`aws-cdk-lib.aws_lambda.IFunction`](#aws-cdk-lib.aws_lambda.IFunction)

Lambda function for the Deployer.

---


### MicroAppsEdgeToOrigin <a name="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOrigin"></a>

- *Implements:* [`@pwrdrvr/microapps-cdk.IMicroAppsEdgeToOrigin`](#@pwrdrvr/microapps-cdk.IMicroAppsEdgeToOrigin)

Create a new MicroApps Edge to Origin Function w/ `config.yml`.

#### Initializer <a name="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOrigin.Initializer"></a>

```typescript
import { MicroAppsEdgeToOrigin } from '@pwrdrvr/microapps-cdk'

new MicroAppsEdgeToOrigin(scope: Construct, id: string, props: MicroAppsEdgeToOriginProps)
```

##### `scope`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOrigin.scope"></a>

- *Type:* [`constructs.Construct`](#constructs.Construct)

---

##### `id`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOrigin.id"></a>

- *Type:* `string`

---

##### `props`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOrigin.props"></a>

- *Type:* [`@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps`](#@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps)

---


#### Static Functions <a name="Static Functions"></a>

##### `generateEdgeToOriginConfig` <a name="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOrigin.generateEdgeToOriginConfig"></a>

```typescript
import { MicroAppsEdgeToOrigin } from '@pwrdrvr/microapps-cdk'

MicroAppsEdgeToOrigin.generateEdgeToOriginConfig(props: GenerateEdgeToOriginConfigOptions)
```

###### `props`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOrigin.props"></a>

- *Type:* [`@pwrdrvr/microapps-cdk.GenerateEdgeToOriginConfigOptions`](#@pwrdrvr/microapps-cdk.GenerateEdgeToOriginConfigOptions)

---

#### Properties <a name="Properties"></a>

##### `edgeToOriginFunction`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOrigin.edgeToOriginFunction"></a>

- *Type:* [`aws-cdk-lib.aws_lambda.Function`](#aws-cdk-lib.aws_lambda.Function) | [`aws-cdk-lib.aws_cloudfront.experimental.EdgeFunction`](#aws-cdk-lib.aws_cloudfront.experimental.EdgeFunction)

The edge to origin function for API Gateway Request Origin Edge Lambda.

The generated `config.yml` is included in the Lambda's code.

---

##### `edgeToOriginLambdas`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOrigin.edgeToOriginLambdas"></a>

- *Type:* [`aws-cdk-lib.aws_cloudfront.EdgeLambda`](#aws-cdk-lib.aws_cloudfront.EdgeLambda)[]

Configuration of the edge to origin lambda functions.

---

##### `edgeToOriginRole`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOrigin.edgeToOriginRole"></a>

- *Type:* [`aws-cdk-lib.aws_iam.Role`](#aws-cdk-lib.aws_iam.Role)

The IAM Role for the edge to origin function.

---


### MicroAppsS3 <a name="@pwrdrvr/microapps-cdk.MicroAppsS3"></a>

- *Implements:* [`@pwrdrvr/microapps-cdk.IMicroAppsS3`](#@pwrdrvr/microapps-cdk.IMicroAppsS3)

Create the durable MicroApps S3 Buckets.

These should be created in a stack that will not be deleted if
there are breaking changes to MicroApps in the future.

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

##### `bucketAppsOriginApp`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsS3.bucketAppsOriginApp"></a>

- *Type:* [`aws-cdk-lib.aws_cloudfront_origins.S3Origin`](#aws-cdk-lib.aws_cloudfront_origins.S3Origin)

CloudFront Origin for the deployed applications bucket Marked with `x-microapps-origin: app` so the OriginRequest function knows to send the request to the application origin first, if configured for a particular application.

---

##### `bucketAppsOriginS3`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsS3.bucketAppsOriginS3"></a>

- *Type:* [`aws-cdk-lib.aws_cloudfront_origins.S3Origin`](#aws-cdk-lib.aws_cloudfront_origins.S3Origin)

CloudFront Origin for the deployed applications bucket Marked with `x-microapps-origin: s3` so the OriginRequest function knows to NOT send the request to the application origin and instead let it fall through to the S3 bucket.

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

- *Type:* [`aws-cdk-lib.aws_lambda.Function`](#aws-cdk-lib.aws_lambda.Function)

Lambda function for the Deployer.

---

##### `table`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcs.table"></a>

- *Type:* [`aws-cdk-lib.aws_dynamodb.ITable`](#aws-cdk-lib.aws_dynamodb.ITable)

DynamoDB table used by Router, Deployer, and Release console app.

---

##### `routerFunc`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcs.routerFunc"></a>

- *Type:* [`aws-cdk-lib.aws_lambda.Function`](#aws-cdk-lib.aws_lambda.Function)

Lambda function for the Router.

---


### MicroAppsTable <a name="@pwrdrvr/microapps-cdk.MicroAppsTable"></a>

- *Implements:* [`@pwrdrvr/microapps-cdk.IMicroAppsTable`](#@pwrdrvr/microapps-cdk.IMicroAppsTable)

Create a new MicroApps Table for apps / versions / rules.

#### Initializer <a name="@pwrdrvr/microapps-cdk.MicroAppsTable.Initializer"></a>

```typescript
import { MicroAppsTable } from '@pwrdrvr/microapps-cdk'

new MicroAppsTable(scope: Construct, id: string, props?: MicroAppsTableProps)
```

##### `scope`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsTable.scope"></a>

- *Type:* [`constructs.Construct`](#constructs.Construct)

---

##### `id`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsTable.id"></a>

- *Type:* `string`

---

##### `props`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsTable.props"></a>

- *Type:* [`@pwrdrvr/microapps-cdk.MicroAppsTableProps`](#@pwrdrvr/microapps-cdk.MicroAppsTableProps)

---



#### Properties <a name="Properties"></a>

##### `table`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsTable.table"></a>

- *Type:* [`aws-cdk-lib.aws_dynamodb.Table`](#aws-cdk-lib.aws_dynamodb.Table)

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

##### `appOnlyOrigin`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.AddRoutesOptions.appOnlyOrigin"></a>

- *Type:* [`aws-cdk-lib.aws_cloudfront.IOrigin`](#aws-cdk-lib.aws_cloudfront.IOrigin)

Application origin.

Typically an S3 bucket with a `x-microapps-origin: app` custom header

The request never actually falls through to the S3 bucket.

---

##### `appOriginRequestPolicy`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.AddRoutesOptions.appOriginRequestPolicy"></a>

- *Type:* [`aws-cdk-lib.aws_cloudfront.IOriginRequestPolicy`](#aws-cdk-lib.aws_cloudfront.IOriginRequestPolicy)

Origin Request policy for API Gateway Origin.

---

##### `bucketOriginFallbackToApp`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.AddRoutesOptions.bucketOriginFallbackToApp"></a>

- *Type:* [`aws-cdk-lib.aws_cloudfront_origins.OriginGroup`](#aws-cdk-lib.aws_cloudfront_origins.OriginGroup)

Origin Group with Primary of S3 bucket with `x-microapps-origin: s3` custom header and Fallback of `appOnlyOrigin`.

---

##### `distro`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.AddRoutesOptions.distro"></a>

- *Type:* [`aws-cdk-lib.aws_cloudfront.Distribution`](#aws-cdk-lib.aws_cloudfront.Distribution)

CloudFront Distribution to add the Behaviors (Routes) to.

---

##### `edgeLambdas`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.AddRoutesOptions.edgeLambdas"></a>

- *Type:* [`aws-cdk-lib.aws_cloudfront.EdgeLambda`](#aws-cdk-lib.aws_cloudfront.EdgeLambda)[]

Edge lambdas to associate with the API Gateway routes.

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

### GenerateEdgeToOriginConfigOptions <a name="@pwrdrvr/microapps-cdk.GenerateEdgeToOriginConfigOptions"></a>

#### Initializer <a name="[object Object].Initializer"></a>

```typescript
import { GenerateEdgeToOriginConfigOptions } from '@pwrdrvr/microapps-cdk'

const generateEdgeToOriginConfigOptions: GenerateEdgeToOriginConfigOptions = { ... }
```

##### `addXForwardedHostHeader`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.GenerateEdgeToOriginConfigOptions.addXForwardedHostHeader"></a>

- *Type:* `boolean`

---

##### `originRegion`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.GenerateEdgeToOriginConfigOptions.originRegion"></a>

- *Type:* `string`

---

##### `replaceHostHeader`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.GenerateEdgeToOriginConfigOptions.replaceHostHeader"></a>

- *Type:* `boolean`

---

##### `signingMode`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.GenerateEdgeToOriginConfigOptions.signingMode"></a>

- *Type:* `string`

---

##### `locales`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.GenerateEdgeToOriginConfigOptions.locales"></a>

- *Type:* `string`[]

---

##### `rootPathPrefix`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.GenerateEdgeToOriginConfigOptions.rootPathPrefix"></a>

- *Type:* `string`

---

##### `tableName`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.GenerateEdgeToOriginConfigOptions.tableName"></a>

- *Type:* `string`

---

### MicroAppsCFProps <a name="@pwrdrvr/microapps-cdk.MicroAppsCFProps"></a>

Properties to initialize an instance of `MicroAppsCF`.

#### Initializer <a name="[object Object].Initializer"></a>

```typescript
import { MicroAppsCFProps } from '@pwrdrvr/microapps-cdk'

const microAppsCFProps: MicroAppsCFProps = { ... }
```

##### `bucketAppsOriginApp`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCFProps.bucketAppsOriginApp"></a>

- *Type:* [`aws-cdk-lib.aws_cloudfront_origins.S3Origin`](#aws-cdk-lib.aws_cloudfront_origins.S3Origin)

S3 bucket origin for deployed applications Marked with `x-microapps-origin: app`.

---

##### `bucketAppsOriginS3`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCFProps.bucketAppsOriginS3"></a>

- *Type:* [`aws-cdk-lib.aws_cloudfront_origins.S3Origin`](#aws-cdk-lib.aws_cloudfront_origins.S3Origin)

S3 bucket origin for deployed applications Marked with `x-microapps-origin: s3`.

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
- *Default:* true if httpApi is provided

Create an extra Behavior (Route) for /api/ that allows API routes to have a period in them.

When false API routes with a period in the path will get routed to S3.

When true API routes that contain /api/ in the path will get routed to API Gateway
even if they have a period in the path.

---

##### `createNextDataPathRoute`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCFProps.createNextDataPathRoute"></a>

- *Type:* `boolean`
- *Default:* true if httpApi is provided

Create an extra Behavior (Route) for /_next/data/ This route is used by Next.js to load data from the API Gateway on `getServerSideProps` calls.  The requests can end in `.json`, which would cause them to be routed to S3 if this route is not created.

When false API routes with a period in the path will get routed to S3.

When true API routes that contain /_next/data/ in the path will get routed to API Gateway
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

##### `edgeLambdas`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCFProps.edgeLambdas"></a>

- *Type:* [`aws-cdk-lib.aws_cloudfront.EdgeLambda`](#aws-cdk-lib.aws_cloudfront.EdgeLambda)[]
- *Default:* no edge to API Gateway origin functions added

Configuration of the edge to origin lambda functions.

---

##### `originShieldRegion`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCFProps.originShieldRegion"></a>

- *Type:* `string`
- *Default:* none

Optional Origin Shield Region.

This should be the region where the DynamoDB is located so the
EdgeToOrigin calls have the lowest latency (~1 ms).

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

### MicroAppsChildDeployerProps <a name="@pwrdrvr/microapps-cdk.MicroAppsChildDeployerProps"></a>

Properties to initialize an instance of `MicroAppsChildDeployer`.

#### Initializer <a name="[object Object].Initializer"></a>

```typescript
import { MicroAppsChildDeployerProps } from '@pwrdrvr/microapps-cdk'

const microAppsChildDeployerProps: MicroAppsChildDeployerProps = { ... }
```

##### `appEnv`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsChildDeployerProps.appEnv"></a>

- *Type:* `string`

Application environment, passed as `NODE_ENV` to the Router and Deployer Lambda functions.

---

##### `parentDeployerLambdaARN`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsChildDeployerProps.parentDeployerLambdaARN"></a>

- *Type:* `string`

ARN of the parent Deployer Lambda Function.

---

##### `assetNameRoot`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsChildDeployerProps.assetNameRoot"></a>

- *Type:* `string`
- *Default:* resource names auto assigned

Optional asset name root.

---

##### `assetNameSuffix`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsChildDeployerProps.assetNameSuffix"></a>

- *Type:* `string`
- *Default:* none

Optional asset name suffix.

---

##### `deployerTimeout`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsChildDeployerProps.deployerTimeout"></a>

- *Type:* [`aws-cdk-lib.Duration`](#aws-cdk-lib.Duration)
- *Default:* 2 minutes

Deployer timeout.

For larger applications this needs to be set up to 2-5 minutes for the S3 copy

---

##### `edgeToOriginRoleARN`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsChildDeployerProps.edgeToOriginRoleARN"></a>

- *Type:* `string`

ARN of the IAM Role for the Edge to Origin Lambda Function.

For child accounts this can be blank as it is retrieved from the parent Deployer

---

##### `removalPolicy`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsChildDeployerProps.removalPolicy"></a>

- *Type:* [`aws-cdk-lib.RemovalPolicy`](#aws-cdk-lib.RemovalPolicy)
- *Default:* per resource default

RemovalPolicy override for child resources.

Note: if set to DESTROY the S3 buckes will have `autoDeleteObjects` set to `true`

---

### MicroAppsEdgeToOriginProps <a name="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps"></a>

Properties to initialize an instance of `MicroAppsEdgeToOrigin`.

#### Initializer <a name="[object Object].Initializer"></a>

```typescript
import { MicroAppsEdgeToOriginProps } from '@pwrdrvr/microapps-cdk'

const microAppsEdgeToOriginProps: MicroAppsEdgeToOriginProps = { ... }
```

##### `addXForwardedHostHeader`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps.addXForwardedHostHeader"></a>

- *Type:* `boolean`
- *Default:* true

Adds an X-Forwarded-Host-Header when calling API Gateway.

Can only be trusted if `signingMode` is enabled, which restricts
access to API Gateway to only IAM signed requests.

Note: if true, creates OriginRequest Lambda @ Edge function for API Gateway Origin

---

##### `allowedFunctionUrlAccounts`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps.allowedFunctionUrlAccounts"></a>

- *Type:* `string`[]
- *Default:* []

Account IDs allowed for cross-account Function URL invocations.

---

##### `allowedLocalePrefixes`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps.allowedLocalePrefixes"></a>

- *Type:* `string`[]
- *Default:* none

List of allowed locale prefixes for pages.

---

##### `assetNameRoot`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps.assetNameRoot"></a>

- *Type:* `string`
- *Default:* resource names auto assigned

Optional asset name root.

---

##### `assetNameSuffix`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps.assetNameSuffix"></a>

- *Type:* `string`
- *Default:* none

Optional asset name suffix.

---

##### `originRegion`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps.originRegion"></a>

- *Type:* `string`
- *Default:* undefined

Origin region that API Gateway will be deployed to, used for the config.yml on the Edge function to sign requests for the correct region.

Note that Lambda FunctionURLs get the region from the Lambda ARN
and do not need this to be configured.

---

##### `removalPolicy`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps.removalPolicy"></a>

- *Type:* [`aws-cdk-lib.RemovalPolicy`](#aws-cdk-lib.RemovalPolicy)
- *Default:* per resource default

RemovalPolicy override for child resources.

---

##### `replaceHostHeader`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps.replaceHostHeader"></a>

- *Type:* `boolean`
- *Default:* true

Replaces Host header (which will be the Edge domain name) with the Origin domain name when enabled.

This is necessary when API Gateway has not been configured
with a custom domain name that matches the exact domain name used by the CloudFront
Distribution AND when the OriginRequestPolicy.HeadersBehavior is set
to pass all headers to the origin.

Note: if true, creates OriginRequest Lambda @ Edge function for API Gateway Origin

---

##### `rootPathPrefix`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps.rootPathPrefix"></a>

- *Type:* `string`
- *Default:* none

Path prefix on the root of the API Gateway Stage.

---

##### `setupApiGatewayPermissions`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps.setupApiGatewayPermissions"></a>

- *Type:* `boolean`
- *Default:* false

Enable invoking API Gateway from the Edge Lambda.

---

##### `signingMode`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps.signingMode"></a>

- *Type:* `string`
- *Default:* 'sign'

Requires IAM auth on the API Gateway origin if not set to 'none'.

'sign' - Uses request headers for auth.
'presign' - Uses query string for auth.

If enabled,

Note: if 'sign' or 'presign', creates OriginRequest Lambda @ Edge function for API Gateway Origin

---

##### `tableRulesArn`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps.tableRulesArn"></a>

- *Type:* `string`

DynamoDB Table Name for apps/versions/rules.

Must be a full ARN as this can be cross region.

Implies that 2nd generation routing is enabled.

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

##### `addXForwardedHostHeader`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.addXForwardedHostHeader"></a>

- *Type:* `boolean`
- *Default:* true

Adds an X-Forwarded-Host-Header when calling API Gateway.

Can only be trusted if `signingMode` is enabled, which restricts
access to API Gateway to only IAM signed requests.

Note: if true, creates OriginRequest Lambda @ Edge function for API Gateway Origin

---

##### `allowedFunctionUrlAccounts`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.allowedFunctionUrlAccounts"></a>

- *Type:* `string`[]
- *Default:* []

Account IDs allowed for cross-account Function URL invocations.

---

##### `allowedLocalePrefixes`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.allowedLocalePrefixes"></a>

- *Type:* `string`[]
- *Default:* none

List of allowed locale prefixes for pages.

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

##### `createAPIGateway`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.createAPIGateway"></a>

- *Type:* `boolean`
- *Default:* false

Create API Gateway for non-edge invocation.

---

##### `createAPIPathRoute`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.createAPIPathRoute"></a>

- *Type:* `boolean`
- *Default:* true

Create an extra Behavior (Route) for /api/ that allows API routes to have a period in them.

When false API routes with a period in the path will get routed to S3.

When true API routes that contain /api/ in the path will get routed to API Gateway
even if they have a period in the path.

---

##### `createNextDataPathRoute`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.createNextDataPathRoute"></a>

- *Type:* `boolean`
- *Default:* true

Create an extra Behavior (Route) for /_next/data/ This route is used by Next.js to load data from the API Gateway on `getServerSideProps` calls.  The requests can end in `.json`, which would cause them to be routed to S3 if this route is not created.

When false API routes with a period in the path will get routed to S3.

When true API routes that contain /_next/data/ in the path will get routed to API Gateway
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

##### `edgeLambdas`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.edgeLambdas"></a>

- *Type:* [`aws-cdk-lib.aws_cloudfront.EdgeLambda`](#aws-cdk-lib.aws_cloudfront.EdgeLambda)[]

Additional edge lambda functions.

---

##### `edgeToOriginRoleARNs`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.edgeToOriginRoleARNs"></a>

- *Type:* `string`[]

Additional IAM Role ARNs that should be allowed to invoke apps in child accounts.

---

##### `originRegion`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.originRegion"></a>

- *Type:* `string`
- *Default:* undefined

Origin region that API Gateway or Lambda function will be deployed to, used for the config.yml on the Edge function to sign requests for the correct region.

---

##### `originShieldRegion`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.originShieldRegion"></a>

- *Type:* `string`
- *Default:* originRegion if specified, otherwise undefined

Optional Origin Shield Region.

This should be the region where the DynamoDB is located so the
EdgeToOrigin calls have the lowest latency (~1 ms).

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

##### `replaceHostHeader`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.replaceHostHeader"></a>

- *Type:* `boolean`
- *Default:* true

Replaces Host header (which will be the Edge domain name) with the Origin domain name when enabled.

This is necessary when API Gateway has not been configured
with a custom domain name that matches the exact domain name used by the CloudFront
Distribution AND when the OriginRequestPolicy.HeadersBehavior is set
to pass all headers to the origin.

Note: if true, creates OriginRequest Lambda @ Edge function for API Gateway Origin

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
  aws iam get-user --user-name USER-NAME

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

##### `signingMode`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.signingMode"></a>

- *Type:* `string`
- *Default:* 'sign'

Requires IAM auth on the API Gateway origin if not set to 'none'.

'sign' - Uses request headers for auth.
'presign' - Uses query string for auth.

If enabled,

Note: if 'sign' or 'presign', creates OriginRequest Lambda @ Edge function for API Gateway Origin

---

##### `table`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.table"></a>

- *Type:* [`aws-cdk-lib.aws_dynamodb.ITable`](#aws-cdk-lib.aws_dynamodb.ITable) | [`aws-cdk-lib.aws_dynamodb.ITableV2`](#aws-cdk-lib.aws_dynamodb.ITableV2)
- *Default:* created by construct

Existing table for apps/versions/rules.

---

##### `tableNameForEdgeToOrigin`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.tableNameForEdgeToOrigin"></a>

- *Type:* `string`

Pre-set table name for apps/versions/rules.

This is required when using v2 routing

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

##### `originShieldRegion`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsS3Props.originShieldRegion"></a>

- *Type:* `string`
- *Default:* none

Optional Origin Shield Region.

This should be the region where the DynamoDB is located so the
EdgeToOrigin calls have the lowest latency (~1 ms).

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

##### `deployerTimeout`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.deployerTimeout"></a>

- *Type:* [`aws-cdk-lib.Duration`](#aws-cdk-lib.Duration)
- *Default:* 2 minutes

Deployer timeout.

For larger applications this needs to be set up to 2-5 minutes for the S3 copy

---

##### `edgeToOriginRoleARN`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.edgeToOriginRoleARN"></a>

- *Type:* `string`[]

ARN of the IAM Role for the Edge to Origin Lambda Function.

---

##### `removalPolicy`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.removalPolicy"></a>

- *Type:* [`aws-cdk-lib.RemovalPolicy`](#aws-cdk-lib.RemovalPolicy)
- *Default:* per resource default

RemovalPolicy override for child resources.

Note: if set to DESTROY the S3 buckes will have `autoDeleteObjects` set to `true`

---

##### `requireIAMAuthorization`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.requireIAMAuthorization"></a>

- *Type:* `boolean`
- *Default:* true

Require IAM auth on API Gateway and Lambda Function URLs.

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
  aws iam get-user --user-name USER-NAME

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

##### `table`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.table"></a>

- *Type:* [`aws-cdk-lib.aws_dynamodb.ITable`](#aws-cdk-lib.aws_dynamodb.ITable)
- *Default:* created by construct

Existing table for apps/versions/rules.

---

### MicroAppsTableProps <a name="@pwrdrvr/microapps-cdk.MicroAppsTableProps"></a>

Properties to initialize an instance of `MicroAppsTable`.

#### Initializer <a name="[object Object].Initializer"></a>

```typescript
import { MicroAppsTableProps } from '@pwrdrvr/microapps-cdk'

const microAppsTableProps: MicroAppsTableProps = { ... }
```

##### `assetNameRoot`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsTableProps.assetNameRoot"></a>

- *Type:* `string`
- *Default:* resource names auto assigned

Optional asset name root.

---

##### `assetNameSuffix`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsTableProps.assetNameSuffix"></a>

- *Type:* `string`
- *Default:* none

Optional asset name suffix.

---

##### `removalPolicy`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsTableProps.removalPolicy"></a>

- *Type:* [`aws-cdk-lib.RemovalPolicy`](#aws-cdk-lib.RemovalPolicy)
- *Default:* per resource default

RemovalPolicy override for child resources.

Note: if set to DESTROY the S3 buckes will have `autoDeleteObjects` set to `true`

---


## Protocols <a name="Protocols"></a>

### IMicroApps <a name="@pwrdrvr/microapps-cdk.IMicroApps"></a>

- *Implemented By:* [`@pwrdrvr/microapps-cdk.MicroApps`](#@pwrdrvr/microapps-cdk.MicroApps), [`@pwrdrvr/microapps-cdk.IMicroApps`](#@pwrdrvr/microapps-cdk.IMicroApps)

Represents a MicroApps.


#### Properties <a name="Properties"></a>

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

##### `edgeToOrigin`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.IMicroApps.edgeToOrigin"></a>

- *Type:* [`@pwrdrvr/microapps-cdk.IMicroAppsEdgeToOrigin`](#@pwrdrvr/microapps-cdk.IMicroAppsEdgeToOrigin)

{@inheritdoc IMicroAppsEdgeToOrigin}.

---

### IMicroAppsCF <a name="@pwrdrvr/microapps-cdk.IMicroAppsCF"></a>

- *Implemented By:* [`@pwrdrvr/microapps-cdk.MicroAppsCF`](#@pwrdrvr/microapps-cdk.MicroAppsCF), [`@pwrdrvr/microapps-cdk.IMicroAppsCF`](#@pwrdrvr/microapps-cdk.IMicroAppsCF)

Represents a MicroApps CloudFront.


#### Properties <a name="Properties"></a>

##### `cloudFrontDistro`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.IMicroAppsCF.cloudFrontDistro"></a>

- *Type:* [`aws-cdk-lib.aws_cloudfront.Distribution`](#aws-cdk-lib.aws_cloudfront.Distribution)

The CloudFront distribution.

---

### IMicroAppsChildDeployer <a name="@pwrdrvr/microapps-cdk.IMicroAppsChildDeployer"></a>

- *Implemented By:* [`@pwrdrvr/microapps-cdk.MicroAppsChildDeployer`](#@pwrdrvr/microapps-cdk.MicroAppsChildDeployer), [`@pwrdrvr/microapps-cdk.IMicroAppsChildDeployer`](#@pwrdrvr/microapps-cdk.IMicroAppsChildDeployer)

Represents a MicroApps Child Deployer.


#### Properties <a name="Properties"></a>

##### `deployerFunc`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.IMicroAppsChildDeployer.deployerFunc"></a>

- *Type:* [`aws-cdk-lib.aws_lambda.IFunction`](#aws-cdk-lib.aws_lambda.IFunction)

Lambda function for the Deployer.

---

### IMicroAppsEdgeToOrigin <a name="@pwrdrvr/microapps-cdk.IMicroAppsEdgeToOrigin"></a>

- *Implemented By:* [`@pwrdrvr/microapps-cdk.MicroAppsEdgeToOrigin`](#@pwrdrvr/microapps-cdk.MicroAppsEdgeToOrigin), [`@pwrdrvr/microapps-cdk.IMicroAppsEdgeToOrigin`](#@pwrdrvr/microapps-cdk.IMicroAppsEdgeToOrigin)

Represents a MicroApps Edge to Origin Function.


#### Properties <a name="Properties"></a>

##### `edgeToOriginFunction`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.IMicroAppsEdgeToOrigin.edgeToOriginFunction"></a>

- *Type:* [`aws-cdk-lib.aws_lambda.Function`](#aws-cdk-lib.aws_lambda.Function) | [`aws-cdk-lib.aws_cloudfront.experimental.EdgeFunction`](#aws-cdk-lib.aws_cloudfront.experimental.EdgeFunction)

The edge to origin function for API Gateway Request Origin Edge Lambda.

The generated `config.yml` is included in the Lambda's code.

---

##### `edgeToOriginLambdas`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.IMicroAppsEdgeToOrigin.edgeToOriginLambdas"></a>

- *Type:* [`aws-cdk-lib.aws_cloudfront.EdgeLambda`](#aws-cdk-lib.aws_cloudfront.EdgeLambda)[]

Configuration of the edge to origin lambda functions.

---

##### `edgeToOriginRole`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.IMicroAppsEdgeToOrigin.edgeToOriginRole"></a>

- *Type:* [`aws-cdk-lib.aws_iam.Role`](#aws-cdk-lib.aws_iam.Role)

The IAM Role for the edge to origin function.

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

##### `bucketAppsOriginApp`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.IMicroAppsS3.bucketAppsOriginApp"></a>

- *Type:* [`aws-cdk-lib.aws_cloudfront_origins.S3Origin`](#aws-cdk-lib.aws_cloudfront_origins.S3Origin)

CloudFront Origin for the deployed applications bucket Marked with `x-microapps-origin: app` so the OriginRequest function knows to send the request to the application origin first, if configured for a particular application.

---

##### `bucketAppsOriginS3`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.IMicroAppsS3.bucketAppsOriginS3"></a>

- *Type:* [`aws-cdk-lib.aws_cloudfront_origins.S3Origin`](#aws-cdk-lib.aws_cloudfront_origins.S3Origin)

CloudFront Origin for the deployed applications bucket Marked with `x-microapps-origin: s3` so the OriginRequest function knows to NOT send the request to the application origin and instead let it fall through to the S3 bucket.

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

- *Type:* [`aws-cdk-lib.aws_lambda.Function`](#aws-cdk-lib.aws_lambda.Function)

Lambda function for the Deployer.

---

##### `table`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.IMicroAppsSvcs.table"></a>

- *Type:* [`aws-cdk-lib.aws_dynamodb.ITable`](#aws-cdk-lib.aws_dynamodb.ITable)

DynamoDB table used by Router, Deployer, and Release console app.

---

##### `routerFunc`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.IMicroAppsSvcs.routerFunc"></a>

- *Type:* [`aws-cdk-lib.aws_lambda.Function`](#aws-cdk-lib.aws_lambda.Function)

Lambda function for the Router.

---

### IMicroAppsTable <a name="@pwrdrvr/microapps-cdk.IMicroAppsTable"></a>

- *Implemented By:* [`@pwrdrvr/microapps-cdk.MicroAppsTable`](#@pwrdrvr/microapps-cdk.MicroAppsTable), [`@pwrdrvr/microapps-cdk.IMicroAppsTable`](#@pwrdrvr/microapps-cdk.IMicroAppsTable)

Represents a MicroAppsTable.


#### Properties <a name="Properties"></a>

##### `table`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.IMicroAppsTable.table"></a>

- *Type:* [`aws-cdk-lib.aws_dynamodb.Table`](#aws-cdk-lib.aws_dynamodb.Table)

DynamoDB table used by Router, Deployer, and Release console app.

---

