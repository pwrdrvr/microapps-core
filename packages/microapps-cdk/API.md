# API Reference <a name="API Reference" id="api-reference"></a>

## Constructs <a name="Constructs" id="Constructs"></a>

### MicroApps <a name="MicroApps" id="@pwrdrvr/microapps-cdk.MicroApps"></a>

- *Implements:* <a href="#@pwrdrvr/microapps-cdk.IMicroApps">IMicroApps</a>

Create a new MicroApps "turnkey" construct for simple deployments and for initial evaulation of the MicroApps framework.

Use this construct to create a PoC working entire stack.

Do not use this construct when adding MicroApps to an existing
CloudFront, API Gateway, S3 Bucket, etc. or where access
to all features of the AWS Resources are needed (e.g. to
add additional Behaviors to the CloudFront distribution, set authorizors
on API Gateway, etc.).

> [{@link https://github.com/pwrdrvr/microapps-core/blob/main/packages/cdk/lib/MicroApps.ts example usage in a CDK Stack }]({@link https://github.com/pwrdrvr/microapps-core/blob/main/packages/cdk/lib/MicroApps.ts example usage in a CDK Stack })

#### Initializers <a name="Initializers" id="@pwrdrvr/microapps-cdk.MicroApps.Initializer"></a>

```typescript
import { MicroApps } from '@pwrdrvr/microapps-cdk'

new MicroApps(scope: Construct, id: string, props?: MicroAppsProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroApps.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | *No description.* |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroApps.Initializer.parameter.id">id</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroApps.Initializer.parameter.props">props</a></code> | <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsProps">MicroAppsProps</a></code> | *No description.* |

---

##### `scope`<sup>Required</sup> <a name="scope" id="@pwrdrvr/microapps-cdk.MicroApps.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

---

##### `id`<sup>Required</sup> <a name="id" id="@pwrdrvr/microapps-cdk.MicroApps.Initializer.parameter.id"></a>

- *Type:* string

---

##### `props`<sup>Optional</sup> <a name="props" id="@pwrdrvr/microapps-cdk.MicroApps.Initializer.parameter.props"></a>

- *Type:* <a href="#@pwrdrvr/microapps-cdk.MicroAppsProps">MicroAppsProps</a>

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroApps.toString">toString</a></code> | Returns a string representation of this construct. |

---

##### `toString` <a name="toString" id="@pwrdrvr/microapps-cdk.MicroApps.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroApps.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### `isConstruct` <a name="isConstruct" id="@pwrdrvr/microapps-cdk.MicroApps.isConstruct"></a>

```typescript
import { MicroApps } from '@pwrdrvr/microapps-cdk'

MicroApps.isConstruct(x: any)
```

Checks if `x` is a construct.

Use this method instead of `instanceof` to properly detect `Construct`
instances, even when the construct library is symlinked.

Explanation: in JavaScript, multiple copies of the `constructs` library on
disk are seen as independent, completely different libraries. As a
consequence, the class `Construct` in each copy of the `constructs` library
is seen as a different class, and an instance of one class will not test as
`instanceof` the other class. `npm install` will not create installations
like this, but users may manually symlink construct libraries together or
use a monorepo tool: in those cases, multiple copies of the `constructs`
library can be accidentally installed, and `instanceof` will behave
unpredictably. It is safest to avoid using `instanceof`, and using
this type-testing method instead.

###### `x`<sup>Required</sup> <a name="x" id="@pwrdrvr/microapps-cdk.MicroApps.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroApps.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroApps.property.cf">cf</a></code> | <code><a href="#@pwrdrvr/microapps-cdk.IMicroAppsCF">IMicroAppsCF</a></code> | {@inheritdoc IMicroAppsCF}. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroApps.property.s3">s3</a></code> | <code><a href="#@pwrdrvr/microapps-cdk.IMicroAppsS3">IMicroAppsS3</a></code> | {@inheritdoc IMicroAppsS3}. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroApps.property.svcs">svcs</a></code> | <code><a href="#@pwrdrvr/microapps-cdk.IMicroAppsSvcs">IMicroAppsSvcs</a></code> | {@inheritdoc IMicroAppsSvcs}. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroApps.property.edgeToOrigin">edgeToOrigin</a></code> | <code><a href="#@pwrdrvr/microapps-cdk.IMicroAppsEdgeToOrigin">IMicroAppsEdgeToOrigin</a></code> | {@inheritdoc IMicroAppsEdgeToOrigin}. |

---

##### `node`<sup>Required</sup> <a name="node" id="@pwrdrvr/microapps-cdk.MicroApps.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `cf`<sup>Required</sup> <a name="cf" id="@pwrdrvr/microapps-cdk.MicroApps.property.cf"></a>

```typescript
public readonly cf: IMicroAppsCF;
```

- *Type:* <a href="#@pwrdrvr/microapps-cdk.IMicroAppsCF">IMicroAppsCF</a>

{@inheritdoc IMicroAppsCF}.

---

##### `s3`<sup>Required</sup> <a name="s3" id="@pwrdrvr/microapps-cdk.MicroApps.property.s3"></a>

```typescript
public readonly s3: IMicroAppsS3;
```

- *Type:* <a href="#@pwrdrvr/microapps-cdk.IMicroAppsS3">IMicroAppsS3</a>

{@inheritdoc IMicroAppsS3}.

---

##### `svcs`<sup>Required</sup> <a name="svcs" id="@pwrdrvr/microapps-cdk.MicroApps.property.svcs"></a>

```typescript
public readonly svcs: IMicroAppsSvcs;
```

- *Type:* <a href="#@pwrdrvr/microapps-cdk.IMicroAppsSvcs">IMicroAppsSvcs</a>

{@inheritdoc IMicroAppsSvcs}.

---

##### `edgeToOrigin`<sup>Optional</sup> <a name="edgeToOrigin" id="@pwrdrvr/microapps-cdk.MicroApps.property.edgeToOrigin"></a>

```typescript
public readonly edgeToOrigin: IMicroAppsEdgeToOrigin;
```

- *Type:* <a href="#@pwrdrvr/microapps-cdk.IMicroAppsEdgeToOrigin">IMicroAppsEdgeToOrigin</a>

{@inheritdoc IMicroAppsEdgeToOrigin}.

---


### MicroAppsCF <a name="MicroAppsCF" id="@pwrdrvr/microapps-cdk.MicroAppsCF"></a>

- *Implements:* <a href="#@pwrdrvr/microapps-cdk.IMicroAppsCF">IMicroAppsCF</a>

Create a new MicroApps CloudFront Distribution.

#### Initializers <a name="Initializers" id="@pwrdrvr/microapps-cdk.MicroAppsCF.Initializer"></a>

```typescript
import { MicroAppsCF } from '@pwrdrvr/microapps-cdk'

new MicroAppsCF(scope: Construct, id: string, props: MicroAppsCFProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsCF.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | *No description.* |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsCF.Initializer.parameter.id">id</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsCF.Initializer.parameter.props">props</a></code> | <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsCFProps">MicroAppsCFProps</a></code> | *No description.* |

---

##### `scope`<sup>Required</sup> <a name="scope" id="@pwrdrvr/microapps-cdk.MicroAppsCF.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

---

##### `id`<sup>Required</sup> <a name="id" id="@pwrdrvr/microapps-cdk.MicroAppsCF.Initializer.parameter.id"></a>

- *Type:* string

---

##### `props`<sup>Required</sup> <a name="props" id="@pwrdrvr/microapps-cdk.MicroAppsCF.Initializer.parameter.props"></a>

- *Type:* <a href="#@pwrdrvr/microapps-cdk.MicroAppsCFProps">MicroAppsCFProps</a>

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsCF.toString">toString</a></code> | Returns a string representation of this construct. |

---

##### `toString` <a name="toString" id="@pwrdrvr/microapps-cdk.MicroAppsCF.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsCF.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsCF.addRoutes">addRoutes</a></code> | Add API Gateway and S3 routes to an existing CloudFront Distribution. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsCF.createAPIOriginPolicy">createAPIOriginPolicy</a></code> | Create or get the origin request policy. |

---

##### `isConstruct` <a name="isConstruct" id="@pwrdrvr/microapps-cdk.MicroAppsCF.isConstruct"></a>

```typescript
import { MicroAppsCF } from '@pwrdrvr/microapps-cdk'

MicroAppsCF.isConstruct(x: any)
```

Checks if `x` is a construct.

Use this method instead of `instanceof` to properly detect `Construct`
instances, even when the construct library is symlinked.

Explanation: in JavaScript, multiple copies of the `constructs` library on
disk are seen as independent, completely different libraries. As a
consequence, the class `Construct` in each copy of the `constructs` library
is seen as a different class, and an instance of one class will not test as
`instanceof` the other class. `npm install` will not create installations
like this, but users may manually symlink construct libraries together or
use a monorepo tool: in those cases, multiple copies of the `constructs`
library can be accidentally installed, and `instanceof` will behave
unpredictably. It is safest to avoid using `instanceof`, and using
this type-testing method instead.

###### `x`<sup>Required</sup> <a name="x" id="@pwrdrvr/microapps-cdk.MicroAppsCF.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

##### `addRoutes` <a name="addRoutes" id="@pwrdrvr/microapps-cdk.MicroAppsCF.addRoutes"></a>

```typescript
import { MicroAppsCF } from '@pwrdrvr/microapps-cdk'

MicroAppsCF.addRoutes(_scope: Construct, props: AddRoutesOptions)
```

Add API Gateway and S3 routes to an existing CloudFront Distribution.

###### `_scope`<sup>Required</sup> <a name="_scope" id="@pwrdrvr/microapps-cdk.MicroAppsCF.addRoutes.parameter._scope"></a>

- *Type:* constructs.Construct

---

###### `props`<sup>Required</sup> <a name="props" id="@pwrdrvr/microapps-cdk.MicroAppsCF.addRoutes.parameter.props"></a>

- *Type:* <a href="#@pwrdrvr/microapps-cdk.AddRoutesOptions">AddRoutesOptions</a>

---

##### `createAPIOriginPolicy` <a name="createAPIOriginPolicy" id="@pwrdrvr/microapps-cdk.MicroAppsCF.createAPIOriginPolicy"></a>

```typescript
import { MicroAppsCF } from '@pwrdrvr/microapps-cdk'

MicroAppsCF.createAPIOriginPolicy(_scope: Construct, _props: CreateAPIOriginPolicyOptions)
```

Create or get the origin request policy.

If a custom domain name is NOT used for the origin then a policy
will be created.

If a custom domain name IS used for the origin then the ALL_VIEWER
policy will be returned.  This policy passes the Host header to the
origin, which is fine when using a custom domain name on the origin.

###### `_scope`<sup>Required</sup> <a name="_scope" id="@pwrdrvr/microapps-cdk.MicroAppsCF.createAPIOriginPolicy.parameter._scope"></a>

- *Type:* constructs.Construct

---

###### `_props`<sup>Required</sup> <a name="_props" id="@pwrdrvr/microapps-cdk.MicroAppsCF.createAPIOriginPolicy.parameter._props"></a>

- *Type:* <a href="#@pwrdrvr/microapps-cdk.CreateAPIOriginPolicyOptions">CreateAPIOriginPolicyOptions</a>

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsCF.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsCF.property.cloudFrontDistro">cloudFrontDistro</a></code> | <code>aws-cdk-lib.aws_cloudfront.Distribution</code> | The CloudFront distribution. |

---

##### `node`<sup>Required</sup> <a name="node" id="@pwrdrvr/microapps-cdk.MicroAppsCF.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `cloudFrontDistro`<sup>Required</sup> <a name="cloudFrontDistro" id="@pwrdrvr/microapps-cdk.MicroAppsCF.property.cloudFrontDistro"></a>

```typescript
public readonly cloudFrontDistro: Distribution;
```

- *Type:* aws-cdk-lib.aws_cloudfront.Distribution

The CloudFront distribution.

---


### MicroAppsChildDeployer <a name="MicroAppsChildDeployer" id="@pwrdrvr/microapps-cdk.MicroAppsChildDeployer"></a>

- *Implements:* <a href="#@pwrdrvr/microapps-cdk.IMicroAppsChildDeployer">IMicroAppsChildDeployer</a>

Create a new MicroApps Child Deployer construct.

#### Initializers <a name="Initializers" id="@pwrdrvr/microapps-cdk.MicroAppsChildDeployer.Initializer"></a>

```typescript
import { MicroAppsChildDeployer } from '@pwrdrvr/microapps-cdk'

new MicroAppsChildDeployer(scope: Construct, id: string, props?: MicroAppsChildDeployerProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsChildDeployer.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | *No description.* |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsChildDeployer.Initializer.parameter.id">id</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsChildDeployer.Initializer.parameter.props">props</a></code> | <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsChildDeployerProps">MicroAppsChildDeployerProps</a></code> | *No description.* |

---

##### `scope`<sup>Required</sup> <a name="scope" id="@pwrdrvr/microapps-cdk.MicroAppsChildDeployer.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

---

##### `id`<sup>Required</sup> <a name="id" id="@pwrdrvr/microapps-cdk.MicroAppsChildDeployer.Initializer.parameter.id"></a>

- *Type:* string

---

##### `props`<sup>Optional</sup> <a name="props" id="@pwrdrvr/microapps-cdk.MicroAppsChildDeployer.Initializer.parameter.props"></a>

- *Type:* <a href="#@pwrdrvr/microapps-cdk.MicroAppsChildDeployerProps">MicroAppsChildDeployerProps</a>

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsChildDeployer.toString">toString</a></code> | Returns a string representation of this construct. |

---

##### `toString` <a name="toString" id="@pwrdrvr/microapps-cdk.MicroAppsChildDeployer.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsChildDeployer.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### `isConstruct` <a name="isConstruct" id="@pwrdrvr/microapps-cdk.MicroAppsChildDeployer.isConstruct"></a>

```typescript
import { MicroAppsChildDeployer } from '@pwrdrvr/microapps-cdk'

MicroAppsChildDeployer.isConstruct(x: any)
```

Checks if `x` is a construct.

Use this method instead of `instanceof` to properly detect `Construct`
instances, even when the construct library is symlinked.

Explanation: in JavaScript, multiple copies of the `constructs` library on
disk are seen as independent, completely different libraries. As a
consequence, the class `Construct` in each copy of the `constructs` library
is seen as a different class, and an instance of one class will not test as
`instanceof` the other class. `npm install` will not create installations
like this, but users may manually symlink construct libraries together or
use a monorepo tool: in those cases, multiple copies of the `constructs`
library can be accidentally installed, and `instanceof` will behave
unpredictably. It is safest to avoid using `instanceof`, and using
this type-testing method instead.

###### `x`<sup>Required</sup> <a name="x" id="@pwrdrvr/microapps-cdk.MicroAppsChildDeployer.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsChildDeployer.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsChildDeployer.property.deployerFunc">deployerFunc</a></code> | <code>aws-cdk-lib.aws_lambda.IFunction</code> | Lambda function for the Deployer. |

---

##### `node`<sup>Required</sup> <a name="node" id="@pwrdrvr/microapps-cdk.MicroAppsChildDeployer.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `deployerFunc`<sup>Required</sup> <a name="deployerFunc" id="@pwrdrvr/microapps-cdk.MicroAppsChildDeployer.property.deployerFunc"></a>

```typescript
public readonly deployerFunc: IFunction;
```

- *Type:* aws-cdk-lib.aws_lambda.IFunction

Lambda function for the Deployer.

---


### MicroAppsEdgeToOrigin <a name="MicroAppsEdgeToOrigin" id="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOrigin"></a>

- *Implements:* <a href="#@pwrdrvr/microapps-cdk.IMicroAppsEdgeToOrigin">IMicroAppsEdgeToOrigin</a>

Create a new MicroApps Edge to Origin Function w/ `config.yml`.

#### Initializers <a name="Initializers" id="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOrigin.Initializer"></a>

```typescript
import { MicroAppsEdgeToOrigin } from '@pwrdrvr/microapps-cdk'

new MicroAppsEdgeToOrigin(scope: Construct, id: string, props: MicroAppsEdgeToOriginProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsEdgeToOrigin.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | *No description.* |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsEdgeToOrigin.Initializer.parameter.id">id</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsEdgeToOrigin.Initializer.parameter.props">props</a></code> | <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps">MicroAppsEdgeToOriginProps</a></code> | *No description.* |

---

##### `scope`<sup>Required</sup> <a name="scope" id="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOrigin.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

---

##### `id`<sup>Required</sup> <a name="id" id="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOrigin.Initializer.parameter.id"></a>

- *Type:* string

---

##### `props`<sup>Required</sup> <a name="props" id="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOrigin.Initializer.parameter.props"></a>

- *Type:* <a href="#@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps">MicroAppsEdgeToOriginProps</a>

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsEdgeToOrigin.toString">toString</a></code> | Returns a string representation of this construct. |

---

##### `toString` <a name="toString" id="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOrigin.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsEdgeToOrigin.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsEdgeToOrigin.generateEdgeToOriginConfig">generateEdgeToOriginConfig</a></code> | Generate the yaml config for the edge lambda. |

---

##### `isConstruct` <a name="isConstruct" id="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOrigin.isConstruct"></a>

```typescript
import { MicroAppsEdgeToOrigin } from '@pwrdrvr/microapps-cdk'

MicroAppsEdgeToOrigin.isConstruct(x: any)
```

Checks if `x` is a construct.

Use this method instead of `instanceof` to properly detect `Construct`
instances, even when the construct library is symlinked.

Explanation: in JavaScript, multiple copies of the `constructs` library on
disk are seen as independent, completely different libraries. As a
consequence, the class `Construct` in each copy of the `constructs` library
is seen as a different class, and an instance of one class will not test as
`instanceof` the other class. `npm install` will not create installations
like this, but users may manually symlink construct libraries together or
use a monorepo tool: in those cases, multiple copies of the `constructs`
library can be accidentally installed, and `instanceof` will behave
unpredictably. It is safest to avoid using `instanceof`, and using
this type-testing method instead.

###### `x`<sup>Required</sup> <a name="x" id="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOrigin.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

##### `generateEdgeToOriginConfig` <a name="generateEdgeToOriginConfig" id="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOrigin.generateEdgeToOriginConfig"></a>

```typescript
import { MicroAppsEdgeToOrigin } from '@pwrdrvr/microapps-cdk'

MicroAppsEdgeToOrigin.generateEdgeToOriginConfig(props: GenerateEdgeToOriginConfigOptions)
```

Generate the yaml config for the edge lambda.

###### `props`<sup>Required</sup> <a name="props" id="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOrigin.generateEdgeToOriginConfig.parameter.props"></a>

- *Type:* <a href="#@pwrdrvr/microapps-cdk.GenerateEdgeToOriginConfigOptions">GenerateEdgeToOriginConfigOptions</a>

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsEdgeToOrigin.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsEdgeToOrigin.property.edgeToOriginFunction">edgeToOriginFunction</a></code> | <code>aws-cdk-lib.aws_lambda.Function \| aws-cdk-lib.aws_cloudfront.experimental.EdgeFunction</code> | The edge to origin function for API Gateway Request Origin Edge Lambda. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsEdgeToOrigin.property.edgeToOriginLambdas">edgeToOriginLambdas</a></code> | <code>aws-cdk-lib.aws_cloudfront.EdgeLambda[]</code> | Configuration of the edge to origin lambda functions. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsEdgeToOrigin.property.edgeToOriginRole">edgeToOriginRole</a></code> | <code>aws-cdk-lib.aws_iam.Role</code> | The IAM Role for the edge to origin function. |

---

##### `node`<sup>Required</sup> <a name="node" id="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOrigin.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `edgeToOriginFunction`<sup>Required</sup> <a name="edgeToOriginFunction" id="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOrigin.property.edgeToOriginFunction"></a>

```typescript
public readonly edgeToOriginFunction: Function | EdgeFunction;
```

- *Type:* aws-cdk-lib.aws_lambda.Function | aws-cdk-lib.aws_cloudfront.experimental.EdgeFunction

The edge to origin function for API Gateway Request Origin Edge Lambda.

The generated `config.yml` is included in the Lambda's code.

---

##### `edgeToOriginLambdas`<sup>Required</sup> <a name="edgeToOriginLambdas" id="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOrigin.property.edgeToOriginLambdas"></a>

```typescript
public readonly edgeToOriginLambdas: EdgeLambda[];
```

- *Type:* aws-cdk-lib.aws_cloudfront.EdgeLambda[]

Configuration of the edge to origin lambda functions.

---

##### `edgeToOriginRole`<sup>Required</sup> <a name="edgeToOriginRole" id="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOrigin.property.edgeToOriginRole"></a>

```typescript
public readonly edgeToOriginRole: Role;
```

- *Type:* aws-cdk-lib.aws_iam.Role

The IAM Role for the edge to origin function.

---


### MicroAppsS3 <a name="MicroAppsS3" id="@pwrdrvr/microapps-cdk.MicroAppsS3"></a>

- *Implements:* <a href="#@pwrdrvr/microapps-cdk.IMicroAppsS3">IMicroAppsS3</a>

Create the durable MicroApps S3 Buckets.

These should be created in a stack that will not be deleted if
there are breaking changes to MicroApps in the future.

#### Initializers <a name="Initializers" id="@pwrdrvr/microapps-cdk.MicroAppsS3.Initializer"></a>

```typescript
import { MicroAppsS3 } from '@pwrdrvr/microapps-cdk'

new MicroAppsS3(scope: Construct, id: string, props?: MicroAppsS3Props)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsS3.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | *No description.* |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsS3.Initializer.parameter.id">id</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsS3.Initializer.parameter.props">props</a></code> | <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsS3Props">MicroAppsS3Props</a></code> | *No description.* |

---

##### `scope`<sup>Required</sup> <a name="scope" id="@pwrdrvr/microapps-cdk.MicroAppsS3.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

---

##### `id`<sup>Required</sup> <a name="id" id="@pwrdrvr/microapps-cdk.MicroAppsS3.Initializer.parameter.id"></a>

- *Type:* string

---

##### `props`<sup>Optional</sup> <a name="props" id="@pwrdrvr/microapps-cdk.MicroAppsS3.Initializer.parameter.props"></a>

- *Type:* <a href="#@pwrdrvr/microapps-cdk.MicroAppsS3Props">MicroAppsS3Props</a>

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsS3.toString">toString</a></code> | Returns a string representation of this construct. |

---

##### `toString` <a name="toString" id="@pwrdrvr/microapps-cdk.MicroAppsS3.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsS3.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### `isConstruct` <a name="isConstruct" id="@pwrdrvr/microapps-cdk.MicroAppsS3.isConstruct"></a>

```typescript
import { MicroAppsS3 } from '@pwrdrvr/microapps-cdk'

MicroAppsS3.isConstruct(x: any)
```

Checks if `x` is a construct.

Use this method instead of `instanceof` to properly detect `Construct`
instances, even when the construct library is symlinked.

Explanation: in JavaScript, multiple copies of the `constructs` library on
disk are seen as independent, completely different libraries. As a
consequence, the class `Construct` in each copy of the `constructs` library
is seen as a different class, and an instance of one class will not test as
`instanceof` the other class. `npm install` will not create installations
like this, but users may manually symlink construct libraries together or
use a monorepo tool: in those cases, multiple copies of the `constructs`
library can be accidentally installed, and `instanceof` will behave
unpredictably. It is safest to avoid using `instanceof`, and using
this type-testing method instead.

###### `x`<sup>Required</sup> <a name="x" id="@pwrdrvr/microapps-cdk.MicroAppsS3.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsS3.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsS3.property.bucketApps">bucketApps</a></code> | <code>aws-cdk-lib.aws_s3.IBucket</code> | S3 bucket for deployed applications. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsS3.property.bucketAppsOAI">bucketAppsOAI</a></code> | <code>aws-cdk-lib.aws_cloudfront.OriginAccessIdentity</code> | CloudFront Origin Access Identity for the deployed applications bucket. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsS3.property.bucketAppsOriginApp">bucketAppsOriginApp</a></code> | <code>aws-cdk-lib.aws_cloudfront_origins.S3Origin</code> | CloudFront Origin for the deployed applications bucket Marked with `x-microapps-origin: app` so the OriginRequest function knows to send the request to the application origin first, if configured for a particular application. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsS3.property.bucketAppsOriginS3">bucketAppsOriginS3</a></code> | <code>aws-cdk-lib.aws_cloudfront_origins.S3Origin</code> | CloudFront Origin for the deployed applications bucket Marked with `x-microapps-origin: s3` so the OriginRequest function knows to NOT send the request to the application origin and instead let it fall through to the S3 bucket. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsS3.property.bucketAppsStaging">bucketAppsStaging</a></code> | <code>aws-cdk-lib.aws_s3.IBucket</code> | S3 bucket for staged applications (prior to deploy). |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsS3.property.bucketLogs">bucketLogs</a></code> | <code>aws-cdk-lib.aws_s3.IBucket</code> | S3 bucket for CloudFront logs. |

---

##### `node`<sup>Required</sup> <a name="node" id="@pwrdrvr/microapps-cdk.MicroAppsS3.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `bucketApps`<sup>Required</sup> <a name="bucketApps" id="@pwrdrvr/microapps-cdk.MicroAppsS3.property.bucketApps"></a>

```typescript
public readonly bucketApps: IBucket;
```

- *Type:* aws-cdk-lib.aws_s3.IBucket

S3 bucket for deployed applications.

---

##### `bucketAppsOAI`<sup>Required</sup> <a name="bucketAppsOAI" id="@pwrdrvr/microapps-cdk.MicroAppsS3.property.bucketAppsOAI"></a>

```typescript
public readonly bucketAppsOAI: OriginAccessIdentity;
```

- *Type:* aws-cdk-lib.aws_cloudfront.OriginAccessIdentity

CloudFront Origin Access Identity for the deployed applications bucket.

---

##### `bucketAppsOriginApp`<sup>Required</sup> <a name="bucketAppsOriginApp" id="@pwrdrvr/microapps-cdk.MicroAppsS3.property.bucketAppsOriginApp"></a>

```typescript
public readonly bucketAppsOriginApp: S3Origin;
```

- *Type:* aws-cdk-lib.aws_cloudfront_origins.S3Origin

CloudFront Origin for the deployed applications bucket Marked with `x-microapps-origin: app` so the OriginRequest function knows to send the request to the application origin first, if configured for a particular application.

---

##### `bucketAppsOriginS3`<sup>Required</sup> <a name="bucketAppsOriginS3" id="@pwrdrvr/microapps-cdk.MicroAppsS3.property.bucketAppsOriginS3"></a>

```typescript
public readonly bucketAppsOriginS3: S3Origin;
```

- *Type:* aws-cdk-lib.aws_cloudfront_origins.S3Origin

CloudFront Origin for the deployed applications bucket Marked with `x-microapps-origin: s3` so the OriginRequest function knows to NOT send the request to the application origin and instead let it fall through to the S3 bucket.

---

##### `bucketAppsStaging`<sup>Required</sup> <a name="bucketAppsStaging" id="@pwrdrvr/microapps-cdk.MicroAppsS3.property.bucketAppsStaging"></a>

```typescript
public readonly bucketAppsStaging: IBucket;
```

- *Type:* aws-cdk-lib.aws_s3.IBucket

S3 bucket for staged applications (prior to deploy).

---

##### `bucketLogs`<sup>Required</sup> <a name="bucketLogs" id="@pwrdrvr/microapps-cdk.MicroAppsS3.property.bucketLogs"></a>

```typescript
public readonly bucketLogs: IBucket;
```

- *Type:* aws-cdk-lib.aws_s3.IBucket

S3 bucket for CloudFront logs.

---


### MicroAppsSvcs <a name="MicroAppsSvcs" id="@pwrdrvr/microapps-cdk.MicroAppsSvcs"></a>

- *Implements:* <a href="#@pwrdrvr/microapps-cdk.IMicroAppsSvcs">IMicroAppsSvcs</a>

Create a new MicroApps Services construct, including the Deployer and Router Lambda Functions, and the DynamoDB Table used by both.

#### Initializers <a name="Initializers" id="@pwrdrvr/microapps-cdk.MicroAppsSvcs.Initializer"></a>

```typescript
import { MicroAppsSvcs } from '@pwrdrvr/microapps-cdk'

new MicroAppsSvcs(scope: Construct, id: string, props?: MicroAppsSvcsProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsSvcs.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | *No description.* |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsSvcs.Initializer.parameter.id">id</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsSvcs.Initializer.parameter.props">props</a></code> | <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsSvcsProps">MicroAppsSvcsProps</a></code> | *No description.* |

---

##### `scope`<sup>Required</sup> <a name="scope" id="@pwrdrvr/microapps-cdk.MicroAppsSvcs.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

---

##### `id`<sup>Required</sup> <a name="id" id="@pwrdrvr/microapps-cdk.MicroAppsSvcs.Initializer.parameter.id"></a>

- *Type:* string

---

##### `props`<sup>Optional</sup> <a name="props" id="@pwrdrvr/microapps-cdk.MicroAppsSvcs.Initializer.parameter.props"></a>

- *Type:* <a href="#@pwrdrvr/microapps-cdk.MicroAppsSvcsProps">MicroAppsSvcsProps</a>

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsSvcs.toString">toString</a></code> | Returns a string representation of this construct. |

---

##### `toString` <a name="toString" id="@pwrdrvr/microapps-cdk.MicroAppsSvcs.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsSvcs.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### `isConstruct` <a name="isConstruct" id="@pwrdrvr/microapps-cdk.MicroAppsSvcs.isConstruct"></a>

```typescript
import { MicroAppsSvcs } from '@pwrdrvr/microapps-cdk'

MicroAppsSvcs.isConstruct(x: any)
```

Checks if `x` is a construct.

Use this method instead of `instanceof` to properly detect `Construct`
instances, even when the construct library is symlinked.

Explanation: in JavaScript, multiple copies of the `constructs` library on
disk are seen as independent, completely different libraries. As a
consequence, the class `Construct` in each copy of the `constructs` library
is seen as a different class, and an instance of one class will not test as
`instanceof` the other class. `npm install` will not create installations
like this, but users may manually symlink construct libraries together or
use a monorepo tool: in those cases, multiple copies of the `constructs`
library can be accidentally installed, and `instanceof` will behave
unpredictably. It is safest to avoid using `instanceof`, and using
this type-testing method instead.

###### `x`<sup>Required</sup> <a name="x" id="@pwrdrvr/microapps-cdk.MicroAppsSvcs.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsSvcs.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsSvcs.property.deployerFunc">deployerFunc</a></code> | <code>aws-cdk-lib.aws_lambda.Function</code> | Lambda function for the Deployer. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsSvcs.property.table">table</a></code> | <code>aws-cdk-lib.aws_dynamodb.ITable</code> | DynamoDB table used by Router, Deployer, and Release console app. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsSvcs.property.routerFunc">routerFunc</a></code> | <code>aws-cdk-lib.aws_lambda.Function</code> | Lambda function for the Router. |

---

##### `node`<sup>Required</sup> <a name="node" id="@pwrdrvr/microapps-cdk.MicroAppsSvcs.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `deployerFunc`<sup>Required</sup> <a name="deployerFunc" id="@pwrdrvr/microapps-cdk.MicroAppsSvcs.property.deployerFunc"></a>

```typescript
public readonly deployerFunc: Function;
```

- *Type:* aws-cdk-lib.aws_lambda.Function

Lambda function for the Deployer.

---

##### `table`<sup>Required</sup> <a name="table" id="@pwrdrvr/microapps-cdk.MicroAppsSvcs.property.table"></a>

```typescript
public readonly table: ITable;
```

- *Type:* aws-cdk-lib.aws_dynamodb.ITable

DynamoDB table used by Router, Deployer, and Release console app.

---

##### `routerFunc`<sup>Optional</sup> <a name="routerFunc" id="@pwrdrvr/microapps-cdk.MicroAppsSvcs.property.routerFunc"></a>

```typescript
public readonly routerFunc: Function;
```

- *Type:* aws-cdk-lib.aws_lambda.Function

Lambda function for the Router.

---


### MicroAppsTable <a name="MicroAppsTable" id="@pwrdrvr/microapps-cdk.MicroAppsTable"></a>

- *Implements:* <a href="#@pwrdrvr/microapps-cdk.IMicroAppsTable">IMicroAppsTable</a>

Create a new MicroApps Table for apps / versions / rules.

#### Initializers <a name="Initializers" id="@pwrdrvr/microapps-cdk.MicroAppsTable.Initializer"></a>

```typescript
import { MicroAppsTable } from '@pwrdrvr/microapps-cdk'

new MicroAppsTable(scope: Construct, id: string, props?: MicroAppsTableProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsTable.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | *No description.* |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsTable.Initializer.parameter.id">id</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsTable.Initializer.parameter.props">props</a></code> | <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsTableProps">MicroAppsTableProps</a></code> | *No description.* |

---

##### `scope`<sup>Required</sup> <a name="scope" id="@pwrdrvr/microapps-cdk.MicroAppsTable.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

---

##### `id`<sup>Required</sup> <a name="id" id="@pwrdrvr/microapps-cdk.MicroAppsTable.Initializer.parameter.id"></a>

- *Type:* string

---

##### `props`<sup>Optional</sup> <a name="props" id="@pwrdrvr/microapps-cdk.MicroAppsTable.Initializer.parameter.props"></a>

- *Type:* <a href="#@pwrdrvr/microapps-cdk.MicroAppsTableProps">MicroAppsTableProps</a>

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsTable.toString">toString</a></code> | Returns a string representation of this construct. |

---

##### `toString` <a name="toString" id="@pwrdrvr/microapps-cdk.MicroAppsTable.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsTable.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### `isConstruct` <a name="isConstruct" id="@pwrdrvr/microapps-cdk.MicroAppsTable.isConstruct"></a>

```typescript
import { MicroAppsTable } from '@pwrdrvr/microapps-cdk'

MicroAppsTable.isConstruct(x: any)
```

Checks if `x` is a construct.

Use this method instead of `instanceof` to properly detect `Construct`
instances, even when the construct library is symlinked.

Explanation: in JavaScript, multiple copies of the `constructs` library on
disk are seen as independent, completely different libraries. As a
consequence, the class `Construct` in each copy of the `constructs` library
is seen as a different class, and an instance of one class will not test as
`instanceof` the other class. `npm install` will not create installations
like this, but users may manually symlink construct libraries together or
use a monorepo tool: in those cases, multiple copies of the `constructs`
library can be accidentally installed, and `instanceof` will behave
unpredictably. It is safest to avoid using `instanceof`, and using
this type-testing method instead.

###### `x`<sup>Required</sup> <a name="x" id="@pwrdrvr/microapps-cdk.MicroAppsTable.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsTable.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsTable.property.table">table</a></code> | <code>aws-cdk-lib.aws_dynamodb.Table</code> | DynamoDB table used by Router, Deployer, and Release console app. |

---

##### `node`<sup>Required</sup> <a name="node" id="@pwrdrvr/microapps-cdk.MicroAppsTable.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `table`<sup>Required</sup> <a name="table" id="@pwrdrvr/microapps-cdk.MicroAppsTable.property.table"></a>

```typescript
public readonly table: Table;
```

- *Type:* aws-cdk-lib.aws_dynamodb.Table

DynamoDB table used by Router, Deployer, and Release console app.

---


## Structs <a name="Structs" id="Structs"></a>

### AddRoutesOptions <a name="AddRoutesOptions" id="@pwrdrvr/microapps-cdk.AddRoutesOptions"></a>

Options for `AddRoutes`.

#### Initializer <a name="Initializer" id="@pwrdrvr/microapps-cdk.AddRoutesOptions.Initializer"></a>

```typescript
import { AddRoutesOptions } from '@pwrdrvr/microapps-cdk'

const addRoutesOptions: AddRoutesOptions = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.AddRoutesOptions.property.appOnlyOrigin">appOnlyOrigin</a></code> | <code>aws-cdk-lib.aws_cloudfront.IOrigin</code> | Application origin. |
| <code><a href="#@pwrdrvr/microapps-cdk.AddRoutesOptions.property.appOriginRequestPolicy">appOriginRequestPolicy</a></code> | <code>aws-cdk-lib.aws_cloudfront.IOriginRequestPolicy</code> | Origin Request policy for API Gateway Origin. |
| <code><a href="#@pwrdrvr/microapps-cdk.AddRoutesOptions.property.bucketOriginFallbackToApp">bucketOriginFallbackToApp</a></code> | <code>aws-cdk-lib.aws_cloudfront_origins.OriginGroup</code> | Origin Group with Primary of S3 bucket with `x-microapps-origin: s3` custom header and Fallback of `appOnlyOrigin`. |
| <code><a href="#@pwrdrvr/microapps-cdk.AddRoutesOptions.property.distro">distro</a></code> | <code>aws-cdk-lib.aws_cloudfront.Distribution</code> | CloudFront Distribution to add the Behaviors (Routes) to. |
| <code><a href="#@pwrdrvr/microapps-cdk.AddRoutesOptions.property.edgeLambdas">edgeLambdas</a></code> | <code>aws-cdk-lib.aws_cloudfront.EdgeLambda[]</code> | Edge lambdas to associate with the API Gateway routes. |
| <code><a href="#@pwrdrvr/microapps-cdk.AddRoutesOptions.property.rootPathPrefix">rootPathPrefix</a></code> | <code>string</code> | Path prefix on the root of the CloudFront distribution. |

---

##### `appOnlyOrigin`<sup>Required</sup> <a name="appOnlyOrigin" id="@pwrdrvr/microapps-cdk.AddRoutesOptions.property.appOnlyOrigin"></a>

```typescript
public readonly appOnlyOrigin: IOrigin;
```

- *Type:* aws-cdk-lib.aws_cloudfront.IOrigin

Application origin.

Typically an S3 bucket with a `x-microapps-origin: app` custom header

The request never actually falls through to the S3 bucket.

---

##### `appOriginRequestPolicy`<sup>Required</sup> <a name="appOriginRequestPolicy" id="@pwrdrvr/microapps-cdk.AddRoutesOptions.property.appOriginRequestPolicy"></a>

```typescript
public readonly appOriginRequestPolicy: IOriginRequestPolicy;
```

- *Type:* aws-cdk-lib.aws_cloudfront.IOriginRequestPolicy

Origin Request policy for API Gateway Origin.

---

##### `bucketOriginFallbackToApp`<sup>Required</sup> <a name="bucketOriginFallbackToApp" id="@pwrdrvr/microapps-cdk.AddRoutesOptions.property.bucketOriginFallbackToApp"></a>

```typescript
public readonly bucketOriginFallbackToApp: OriginGroup;
```

- *Type:* aws-cdk-lib.aws_cloudfront_origins.OriginGroup

Origin Group with Primary of S3 bucket with `x-microapps-origin: s3` custom header and Fallback of `appOnlyOrigin`.

---

##### `distro`<sup>Required</sup> <a name="distro" id="@pwrdrvr/microapps-cdk.AddRoutesOptions.property.distro"></a>

```typescript
public readonly distro: Distribution;
```

- *Type:* aws-cdk-lib.aws_cloudfront.Distribution

CloudFront Distribution to add the Behaviors (Routes) to.

---

##### `edgeLambdas`<sup>Optional</sup> <a name="edgeLambdas" id="@pwrdrvr/microapps-cdk.AddRoutesOptions.property.edgeLambdas"></a>

```typescript
public readonly edgeLambdas: EdgeLambda[];
```

- *Type:* aws-cdk-lib.aws_cloudfront.EdgeLambda[]

Edge lambdas to associate with the API Gateway routes.

---

##### `rootPathPrefix`<sup>Optional</sup> <a name="rootPathPrefix" id="@pwrdrvr/microapps-cdk.AddRoutesOptions.property.rootPathPrefix"></a>

```typescript
public readonly rootPathPrefix: string;
```

- *Type:* string

Path prefix on the root of the CloudFront distribution.

---

*Example*

```typescript
dev/
```


### CreateAPIOriginPolicyOptions <a name="CreateAPIOriginPolicyOptions" id="@pwrdrvr/microapps-cdk.CreateAPIOriginPolicyOptions"></a>

Options for the `CreateAPIOriginPolicy`.

#### Initializer <a name="Initializer" id="@pwrdrvr/microapps-cdk.CreateAPIOriginPolicyOptions.Initializer"></a>

```typescript
import { CreateAPIOriginPolicyOptions } from '@pwrdrvr/microapps-cdk'

const createAPIOriginPolicyOptions: CreateAPIOriginPolicyOptions = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.CreateAPIOriginPolicyOptions.property.assetNameRoot">assetNameRoot</a></code> | <code>string</code> | Optional asset name root. |
| <code><a href="#@pwrdrvr/microapps-cdk.CreateAPIOriginPolicyOptions.property.assetNameSuffix">assetNameSuffix</a></code> | <code>string</code> | Optional asset name suffix. |
| <code><a href="#@pwrdrvr/microapps-cdk.CreateAPIOriginPolicyOptions.property.domainNameEdge">domainNameEdge</a></code> | <code>string</code> | Edge domain name used by CloudFront - If set a custom OriginRequestPolicy will be created that prevents the Host header from being passed to the origin. |

---

##### `assetNameRoot`<sup>Optional</sup> <a name="assetNameRoot" id="@pwrdrvr/microapps-cdk.CreateAPIOriginPolicyOptions.property.assetNameRoot"></a>

```typescript
public readonly assetNameRoot: string;
```

- *Type:* string
- *Default:* resource names auto assigned

Optional asset name root.

---

*Example*

```typescript
microapps
```


##### `assetNameSuffix`<sup>Optional</sup> <a name="assetNameSuffix" id="@pwrdrvr/microapps-cdk.CreateAPIOriginPolicyOptions.property.assetNameSuffix"></a>

```typescript
public readonly assetNameSuffix: string;
```

- *Type:* string
- *Default:* none

Optional asset name suffix.

---

*Example*

```typescript
-dev-pr-12
```


##### `domainNameEdge`<sup>Optional</sup> <a name="domainNameEdge" id="@pwrdrvr/microapps-cdk.CreateAPIOriginPolicyOptions.property.domainNameEdge"></a>

```typescript
public readonly domainNameEdge: string;
```

- *Type:* string

Edge domain name used by CloudFront - If set a custom OriginRequestPolicy will be created that prevents the Host header from being passed to the origin.

---

### GenerateEdgeToOriginConfigOptions <a name="GenerateEdgeToOriginConfigOptions" id="@pwrdrvr/microapps-cdk.GenerateEdgeToOriginConfigOptions"></a>

#### Initializer <a name="Initializer" id="@pwrdrvr/microapps-cdk.GenerateEdgeToOriginConfigOptions.Initializer"></a>

```typescript
import { GenerateEdgeToOriginConfigOptions } from '@pwrdrvr/microapps-cdk'

const generateEdgeToOriginConfigOptions: GenerateEdgeToOriginConfigOptions = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.GenerateEdgeToOriginConfigOptions.property.addXForwardedHostHeader">addXForwardedHostHeader</a></code> | <code>boolean</code> | *No description.* |
| <code><a href="#@pwrdrvr/microapps-cdk.GenerateEdgeToOriginConfigOptions.property.originRegion">originRegion</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@pwrdrvr/microapps-cdk.GenerateEdgeToOriginConfigOptions.property.replaceHostHeader">replaceHostHeader</a></code> | <code>boolean</code> | *No description.* |
| <code><a href="#@pwrdrvr/microapps-cdk.GenerateEdgeToOriginConfigOptions.property.signingMode">signingMode</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@pwrdrvr/microapps-cdk.GenerateEdgeToOriginConfigOptions.property.locales">locales</a></code> | <code>string[]</code> | *No description.* |
| <code><a href="#@pwrdrvr/microapps-cdk.GenerateEdgeToOriginConfigOptions.property.rootPathPrefix">rootPathPrefix</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@pwrdrvr/microapps-cdk.GenerateEdgeToOriginConfigOptions.property.tableName">tableName</a></code> | <code>string</code> | *No description.* |

---

##### `addXForwardedHostHeader`<sup>Required</sup> <a name="addXForwardedHostHeader" id="@pwrdrvr/microapps-cdk.GenerateEdgeToOriginConfigOptions.property.addXForwardedHostHeader"></a>

```typescript
public readonly addXForwardedHostHeader: boolean;
```

- *Type:* boolean

---

##### `originRegion`<sup>Required</sup> <a name="originRegion" id="@pwrdrvr/microapps-cdk.GenerateEdgeToOriginConfigOptions.property.originRegion"></a>

```typescript
public readonly originRegion: string;
```

- *Type:* string

---

##### `replaceHostHeader`<sup>Required</sup> <a name="replaceHostHeader" id="@pwrdrvr/microapps-cdk.GenerateEdgeToOriginConfigOptions.property.replaceHostHeader"></a>

```typescript
public readonly replaceHostHeader: boolean;
```

- *Type:* boolean

---

##### `signingMode`<sup>Required</sup> <a name="signingMode" id="@pwrdrvr/microapps-cdk.GenerateEdgeToOriginConfigOptions.property.signingMode"></a>

```typescript
public readonly signingMode: string;
```

- *Type:* string

---

##### `locales`<sup>Optional</sup> <a name="locales" id="@pwrdrvr/microapps-cdk.GenerateEdgeToOriginConfigOptions.property.locales"></a>

```typescript
public readonly locales: string[];
```

- *Type:* string[]

---

##### `rootPathPrefix`<sup>Optional</sup> <a name="rootPathPrefix" id="@pwrdrvr/microapps-cdk.GenerateEdgeToOriginConfigOptions.property.rootPathPrefix"></a>

```typescript
public readonly rootPathPrefix: string;
```

- *Type:* string

---

##### `tableName`<sup>Optional</sup> <a name="tableName" id="@pwrdrvr/microapps-cdk.GenerateEdgeToOriginConfigOptions.property.tableName"></a>

```typescript
public readonly tableName: string;
```

- *Type:* string

---

### MicroAppsCFProps <a name="MicroAppsCFProps" id="@pwrdrvr/microapps-cdk.MicroAppsCFProps"></a>

Properties to initialize an instance of `MicroAppsCF`.

#### Initializer <a name="Initializer" id="@pwrdrvr/microapps-cdk.MicroAppsCFProps.Initializer"></a>

```typescript
import { MicroAppsCFProps } from '@pwrdrvr/microapps-cdk'

const microAppsCFProps: MicroAppsCFProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsCFProps.property.bucketAppsOriginApp">bucketAppsOriginApp</a></code> | <code>aws-cdk-lib.aws_cloudfront_origins.S3Origin</code> | S3 bucket origin for deployed applications Marked with `x-microapps-origin: app`. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsCFProps.property.bucketAppsOriginS3">bucketAppsOriginS3</a></code> | <code>aws-cdk-lib.aws_cloudfront_origins.S3Origin</code> | S3 bucket origin for deployed applications Marked with `x-microapps-origin: s3`. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsCFProps.property.assetNameRoot">assetNameRoot</a></code> | <code>string</code> | Optional asset name root. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsCFProps.property.assetNameSuffix">assetNameSuffix</a></code> | <code>string</code> | Optional asset name suffix. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsCFProps.property.bucketLogs">bucketLogs</a></code> | <code>aws-cdk-lib.aws_s3.IBucket</code> | S3 bucket for CloudFront logs. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsCFProps.property.certEdge">certEdge</a></code> | <code>aws-cdk-lib.aws_certificatemanager.ICertificate</code> | ACM Certificate that covers `domainNameEdge` name. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsCFProps.property.createAPIPathRoute">createAPIPathRoute</a></code> | <code>boolean</code> | Create an extra Behavior (Route) for /api/ that allows API routes to have a period in them. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsCFProps.property.createNextDataPathRoute">createNextDataPathRoute</a></code> | <code>boolean</code> | Create an extra Behavior (Route) for /_next/data/ This route is used by Next.js to load data from the API Gateway on `getServerSideProps` calls.  The requests can end in `.json`, which would cause them to be routed to S3 if this route is not created. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsCFProps.property.domainNameEdge">domainNameEdge</a></code> | <code>string</code> | CloudFront Distribution domain name. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsCFProps.property.domainNameOrigin">domainNameOrigin</a></code> | <code>string</code> | API Gateway custom origin domain name. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsCFProps.property.edgeLambdas">edgeLambdas</a></code> | <code>aws-cdk-lib.aws_cloudfront.EdgeLambda[]</code> | Configuration of the edge to origin lambda functions. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsCFProps.property.originShieldRegion">originShieldRegion</a></code> | <code>string</code> | Optional Origin Shield Region. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsCFProps.property.r53Zone">r53Zone</a></code> | <code>aws-cdk-lib.aws_route53.IHostedZone</code> | Route53 zone in which to create optional `domainNameEdge` record. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsCFProps.property.removalPolicy">removalPolicy</a></code> | <code>aws-cdk-lib.RemovalPolicy</code> | RemovalPolicy override for child resources. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsCFProps.property.rootPathPrefix">rootPathPrefix</a></code> | <code>string</code> | Path prefix on the root of the CloudFront distribution. |

---

##### `bucketAppsOriginApp`<sup>Required</sup> <a name="bucketAppsOriginApp" id="@pwrdrvr/microapps-cdk.MicroAppsCFProps.property.bucketAppsOriginApp"></a>

```typescript
public readonly bucketAppsOriginApp: S3Origin;
```

- *Type:* aws-cdk-lib.aws_cloudfront_origins.S3Origin

S3 bucket origin for deployed applications Marked with `x-microapps-origin: app`.

---

##### `bucketAppsOriginS3`<sup>Required</sup> <a name="bucketAppsOriginS3" id="@pwrdrvr/microapps-cdk.MicroAppsCFProps.property.bucketAppsOriginS3"></a>

```typescript
public readonly bucketAppsOriginS3: S3Origin;
```

- *Type:* aws-cdk-lib.aws_cloudfront_origins.S3Origin

S3 bucket origin for deployed applications Marked with `x-microapps-origin: s3`.

---

##### `assetNameRoot`<sup>Optional</sup> <a name="assetNameRoot" id="@pwrdrvr/microapps-cdk.MicroAppsCFProps.property.assetNameRoot"></a>

```typescript
public readonly assetNameRoot: string;
```

- *Type:* string
- *Default:* resource names auto assigned

Optional asset name root.

---

*Example*

```typescript
microapps
```


##### `assetNameSuffix`<sup>Optional</sup> <a name="assetNameSuffix" id="@pwrdrvr/microapps-cdk.MicroAppsCFProps.property.assetNameSuffix"></a>

```typescript
public readonly assetNameSuffix: string;
```

- *Type:* string
- *Default:* none

Optional asset name suffix.

---

*Example*

```typescript
-dev-pr-12
```


##### `bucketLogs`<sup>Optional</sup> <a name="bucketLogs" id="@pwrdrvr/microapps-cdk.MicroAppsCFProps.property.bucketLogs"></a>

```typescript
public readonly bucketLogs: IBucket;
```

- *Type:* aws-cdk-lib.aws_s3.IBucket

S3 bucket for CloudFront logs.

---

##### `certEdge`<sup>Optional</sup> <a name="certEdge" id="@pwrdrvr/microapps-cdk.MicroAppsCFProps.property.certEdge"></a>

```typescript
public readonly certEdge: ICertificate;
```

- *Type:* aws-cdk-lib.aws_certificatemanager.ICertificate

ACM Certificate that covers `domainNameEdge` name.

---

##### `createAPIPathRoute`<sup>Optional</sup> <a name="createAPIPathRoute" id="@pwrdrvr/microapps-cdk.MicroAppsCFProps.property.createAPIPathRoute"></a>

```typescript
public readonly createAPIPathRoute: boolean;
```

- *Type:* boolean
- *Default:* true if httpApi is provided

Create an extra Behavior (Route) for /api/ that allows API routes to have a period in them.

When false API routes with a period in the path will get routed to S3.

When true API routes that contain /api/ in the path will get routed to API Gateway
even if they have a period in the path.

---

##### `createNextDataPathRoute`<sup>Optional</sup> <a name="createNextDataPathRoute" id="@pwrdrvr/microapps-cdk.MicroAppsCFProps.property.createNextDataPathRoute"></a>

```typescript
public readonly createNextDataPathRoute: boolean;
```

- *Type:* boolean
- *Default:* true if httpApi is provided

Create an extra Behavior (Route) for /_next/data/ This route is used by Next.js to load data from the API Gateway on `getServerSideProps` calls.  The requests can end in `.json`, which would cause them to be routed to S3 if this route is not created.

When false API routes with a period in the path will get routed to S3.

When true API routes that contain /_next/data/ in the path will get routed to API Gateway
even if they have a period in the path.

---

##### `domainNameEdge`<sup>Optional</sup> <a name="domainNameEdge" id="@pwrdrvr/microapps-cdk.MicroAppsCFProps.property.domainNameEdge"></a>

```typescript
public readonly domainNameEdge: string;
```

- *Type:* string
- *Default:* auto-assigned

CloudFront Distribution domain name.

---

*Example*

```typescript
apps.pwrdrvr.com
```


##### `domainNameOrigin`<sup>Optional</sup> <a name="domainNameOrigin" id="@pwrdrvr/microapps-cdk.MicroAppsCFProps.property.domainNameOrigin"></a>

```typescript
public readonly domainNameOrigin: string;
```

- *Type:* string
- *Default:* retrieved from httpApi, if possible

API Gateway custom origin domain name.

---

*Example*

```typescript
apps.pwrdrvr.com
```


##### `edgeLambdas`<sup>Optional</sup> <a name="edgeLambdas" id="@pwrdrvr/microapps-cdk.MicroAppsCFProps.property.edgeLambdas"></a>

```typescript
public readonly edgeLambdas: EdgeLambda[];
```

- *Type:* aws-cdk-lib.aws_cloudfront.EdgeLambda[]
- *Default:* no edge to API Gateway origin functions added

Configuration of the edge to origin lambda functions.

---

##### `originShieldRegion`<sup>Optional</sup> <a name="originShieldRegion" id="@pwrdrvr/microapps-cdk.MicroAppsCFProps.property.originShieldRegion"></a>

```typescript
public readonly originShieldRegion: string;
```

- *Type:* string
- *Default:* none

Optional Origin Shield Region.

This should be the region where the DynamoDB is located so the
EdgeToOrigin calls have the lowest latency (~1 ms).

---

##### `r53Zone`<sup>Optional</sup> <a name="r53Zone" id="@pwrdrvr/microapps-cdk.MicroAppsCFProps.property.r53Zone"></a>

```typescript
public readonly r53Zone: IHostedZone;
```

- *Type:* aws-cdk-lib.aws_route53.IHostedZone

Route53 zone in which to create optional `domainNameEdge` record.

---

##### `removalPolicy`<sup>Optional</sup> <a name="removalPolicy" id="@pwrdrvr/microapps-cdk.MicroAppsCFProps.property.removalPolicy"></a>

```typescript
public readonly removalPolicy: RemovalPolicy;
```

- *Type:* aws-cdk-lib.RemovalPolicy
- *Default:* per resource default

RemovalPolicy override for child resources.

Note: if set to DESTROY the S3 buckes will have `autoDeleteObjects` set to `true`

---

##### `rootPathPrefix`<sup>Optional</sup> <a name="rootPathPrefix" id="@pwrdrvr/microapps-cdk.MicroAppsCFProps.property.rootPathPrefix"></a>

```typescript
public readonly rootPathPrefix: string;
```

- *Type:* string

Path prefix on the root of the CloudFront distribution.

---

*Example*

```typescript
dev/
```


### MicroAppsChildDeployerProps <a name="MicroAppsChildDeployerProps" id="@pwrdrvr/microapps-cdk.MicroAppsChildDeployerProps"></a>

Properties to initialize an instance of `MicroAppsChildDeployer`.

#### Initializer <a name="Initializer" id="@pwrdrvr/microapps-cdk.MicroAppsChildDeployerProps.Initializer"></a>

```typescript
import { MicroAppsChildDeployerProps } from '@pwrdrvr/microapps-cdk'

const microAppsChildDeployerProps: MicroAppsChildDeployerProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsChildDeployerProps.property.appEnv">appEnv</a></code> | <code>string</code> | Application environment, passed as `NODE_ENV` to the Router and Deployer Lambda functions. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsChildDeployerProps.property.parentDeployerLambdaARN">parentDeployerLambdaARN</a></code> | <code>string</code> | ARN of the parent Deployer Lambda Function. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsChildDeployerProps.property.assetNameRoot">assetNameRoot</a></code> | <code>string</code> | Optional asset name root. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsChildDeployerProps.property.assetNameSuffix">assetNameSuffix</a></code> | <code>string</code> | Optional asset name suffix. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsChildDeployerProps.property.deployerTimeout">deployerTimeout</a></code> | <code>aws-cdk-lib.Duration</code> | Deployer timeout. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsChildDeployerProps.property.edgeToOriginRoleARN">edgeToOriginRoleARN</a></code> | <code>string</code> | ARN of the IAM Role for the Edge to Origin Lambda Function. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsChildDeployerProps.property.removalPolicy">removalPolicy</a></code> | <code>aws-cdk-lib.RemovalPolicy</code> | RemovalPolicy override for child resources. |

---

##### `appEnv`<sup>Required</sup> <a name="appEnv" id="@pwrdrvr/microapps-cdk.MicroAppsChildDeployerProps.property.appEnv"></a>

```typescript
public readonly appEnv: string;
```

- *Type:* string

Application environment, passed as `NODE_ENV` to the Router and Deployer Lambda functions.

---

##### `parentDeployerLambdaARN`<sup>Required</sup> <a name="parentDeployerLambdaARN" id="@pwrdrvr/microapps-cdk.MicroAppsChildDeployerProps.property.parentDeployerLambdaARN"></a>

```typescript
public readonly parentDeployerLambdaARN: string;
```

- *Type:* string

ARN of the parent Deployer Lambda Function.

---

##### `assetNameRoot`<sup>Optional</sup> <a name="assetNameRoot" id="@pwrdrvr/microapps-cdk.MicroAppsChildDeployerProps.property.assetNameRoot"></a>

```typescript
public readonly assetNameRoot: string;
```

- *Type:* string
- *Default:* resource names auto assigned

Optional asset name root.

---

*Example*

```typescript
microapps
```


##### `assetNameSuffix`<sup>Optional</sup> <a name="assetNameSuffix" id="@pwrdrvr/microapps-cdk.MicroAppsChildDeployerProps.property.assetNameSuffix"></a>

```typescript
public readonly assetNameSuffix: string;
```

- *Type:* string
- *Default:* none

Optional asset name suffix.

---

*Example*

```typescript
-dev-pr-12
```


##### `deployerTimeout`<sup>Optional</sup> <a name="deployerTimeout" id="@pwrdrvr/microapps-cdk.MicroAppsChildDeployerProps.property.deployerTimeout"></a>

```typescript
public readonly deployerTimeout: Duration;
```

- *Type:* aws-cdk-lib.Duration
- *Default:* 2 minutes

Deployer timeout.

For larger applications this needs to be set up to 2-5 minutes for the S3 copy

---

##### `edgeToOriginRoleARN`<sup>Optional</sup> <a name="edgeToOriginRoleARN" id="@pwrdrvr/microapps-cdk.MicroAppsChildDeployerProps.property.edgeToOriginRoleARN"></a>

```typescript
public readonly edgeToOriginRoleARN: string;
```

- *Type:* string

ARN of the IAM Role for the Edge to Origin Lambda Function.

For child accounts this can be blank as it is retrieved from the parent Deployer

---

##### `removalPolicy`<sup>Optional</sup> <a name="removalPolicy" id="@pwrdrvr/microapps-cdk.MicroAppsChildDeployerProps.property.removalPolicy"></a>

```typescript
public readonly removalPolicy: RemovalPolicy;
```

- *Type:* aws-cdk-lib.RemovalPolicy
- *Default:* per resource default

RemovalPolicy override for child resources.

Note: if set to DESTROY the S3 buckes will have `autoDeleteObjects` set to `true`

---

### MicroAppsEdgeToOriginProps <a name="MicroAppsEdgeToOriginProps" id="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps"></a>

Properties to initialize an instance of `MicroAppsEdgeToOrigin`.

#### Initializer <a name="Initializer" id="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps.Initializer"></a>

```typescript
import { MicroAppsEdgeToOriginProps } from '@pwrdrvr/microapps-cdk'

const microAppsEdgeToOriginProps: MicroAppsEdgeToOriginProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps.property.addXForwardedHostHeader">addXForwardedHostHeader</a></code> | <code>boolean</code> | Adds an X-Forwarded-Host-Header when calling API Gateway. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps.property.allowedFunctionUrlAccounts">allowedFunctionUrlAccounts</a></code> | <code>string[]</code> | Account IDs allowed for cross-account Function URL invocations. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps.property.allowedLocalePrefixes">allowedLocalePrefixes</a></code> | <code>string[]</code> | List of allowed locale prefixes for pages. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps.property.assetNameRoot">assetNameRoot</a></code> | <code>string</code> | Optional asset name root. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps.property.assetNameSuffix">assetNameSuffix</a></code> | <code>string</code> | Optional asset name suffix. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps.property.originRegion">originRegion</a></code> | <code>string</code> | Origin region that API Gateway will be deployed to, used for the config.yml on the Edge function to sign requests for the correct region. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps.property.removalPolicy">removalPolicy</a></code> | <code>aws-cdk-lib.RemovalPolicy</code> | RemovalPolicy override for child resources. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps.property.replaceHostHeader">replaceHostHeader</a></code> | <code>boolean</code> | Replaces Host header (which will be the Edge domain name) with the Origin domain name when enabled. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps.property.rootPathPrefix">rootPathPrefix</a></code> | <code>string</code> | Path prefix on the root of the API Gateway Stage. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps.property.setupApiGatewayPermissions">setupApiGatewayPermissions</a></code> | <code>boolean</code> | Enable invoking API Gateway from the Edge Lambda. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps.property.signingMode">signingMode</a></code> | <code>string</code> | Requires IAM auth on the API Gateway origin if not set to 'none'. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps.property.tableRulesArn">tableRulesArn</a></code> | <code>string</code> | DynamoDB Table Name for apps/versions/rules. |

---

##### `addXForwardedHostHeader`<sup>Optional</sup> <a name="addXForwardedHostHeader" id="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps.property.addXForwardedHostHeader"></a>

```typescript
public readonly addXForwardedHostHeader: boolean;
```

- *Type:* boolean
- *Default:* true

Adds an X-Forwarded-Host-Header when calling API Gateway.

Can only be trusted if `signingMode` is enabled, which restricts
access to API Gateway to only IAM signed requests.

Note: if true, creates OriginRequest Lambda @ Edge function for API Gateway Origin

---

##### `allowedFunctionUrlAccounts`<sup>Optional</sup> <a name="allowedFunctionUrlAccounts" id="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps.property.allowedFunctionUrlAccounts"></a>

```typescript
public readonly allowedFunctionUrlAccounts: string[];
```

- *Type:* string[]
- *Default:* []

Account IDs allowed for cross-account Function URL invocations.

---

##### `allowedLocalePrefixes`<sup>Optional</sup> <a name="allowedLocalePrefixes" id="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps.property.allowedLocalePrefixes"></a>

```typescript
public readonly allowedLocalePrefixes: string[];
```

- *Type:* string[]
- *Default:* none

List of allowed locale prefixes for pages.

---

*Example*

```typescript
: ['en', 'fr', 'es']
```


##### `assetNameRoot`<sup>Optional</sup> <a name="assetNameRoot" id="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps.property.assetNameRoot"></a>

```typescript
public readonly assetNameRoot: string;
```

- *Type:* string
- *Default:* resource names auto assigned

Optional asset name root.

---

*Example*

```typescript
microapps
```


##### `assetNameSuffix`<sup>Optional</sup> <a name="assetNameSuffix" id="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps.property.assetNameSuffix"></a>

```typescript
public readonly assetNameSuffix: string;
```

- *Type:* string
- *Default:* none

Optional asset name suffix.

---

*Example*

```typescript
-dev-pr-12
```


##### `originRegion`<sup>Optional</sup> <a name="originRegion" id="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps.property.originRegion"></a>

```typescript
public readonly originRegion: string;
```

- *Type:* string
- *Default:* undefined

Origin region that API Gateway will be deployed to, used for the config.yml on the Edge function to sign requests for the correct region.

Note that Lambda FunctionURLs get the region from the Lambda ARN
and do not need this to be configured.

---

##### `removalPolicy`<sup>Optional</sup> <a name="removalPolicy" id="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps.property.removalPolicy"></a>

```typescript
public readonly removalPolicy: RemovalPolicy;
```

- *Type:* aws-cdk-lib.RemovalPolicy
- *Default:* per resource default

RemovalPolicy override for child resources.

---

##### `replaceHostHeader`<sup>Optional</sup> <a name="replaceHostHeader" id="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps.property.replaceHostHeader"></a>

```typescript
public readonly replaceHostHeader: boolean;
```

- *Type:* boolean
- *Default:* true

Replaces Host header (which will be the Edge domain name) with the Origin domain name when enabled.

This is necessary when API Gateway has not been configured
with a custom domain name that matches the exact domain name used by the CloudFront
Distribution AND when the OriginRequestPolicy.HeadersBehavior is set
to pass all headers to the origin.

Note: if true, creates OriginRequest Lambda @ Edge function for API Gateway Origin

---

##### `rootPathPrefix`<sup>Optional</sup> <a name="rootPathPrefix" id="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps.property.rootPathPrefix"></a>

```typescript
public readonly rootPathPrefix: string;
```

- *Type:* string
- *Default:* none

Path prefix on the root of the API Gateway Stage.

---

*Example*

```typescript
dev/
```


##### `setupApiGatewayPermissions`<sup>Optional</sup> <a name="setupApiGatewayPermissions" id="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps.property.setupApiGatewayPermissions"></a>

```typescript
public readonly setupApiGatewayPermissions: boolean;
```

- *Type:* boolean
- *Default:* false

Enable invoking API Gateway from the Edge Lambda.

---

##### `signingMode`<sup>Optional</sup> <a name="signingMode" id="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps.property.signingMode"></a>

```typescript
public readonly signingMode: string;
```

- *Type:* string
- *Default:* 'sign'

Requires IAM auth on the API Gateway origin if not set to 'none'.

'sign' - Uses request headers for auth.
'presign' - Uses query string for auth.

If enabled,

Note: if 'sign' or 'presign', creates OriginRequest Lambda @ Edge function for API Gateway Origin

---

##### `tableRulesArn`<sup>Optional</sup> <a name="tableRulesArn" id="@pwrdrvr/microapps-cdk.MicroAppsEdgeToOriginProps.property.tableRulesArn"></a>

```typescript
public readonly tableRulesArn: string;
```

- *Type:* string

DynamoDB Table Name for apps/versions/rules.

Must be a full ARN as this can be cross region.

Implies that 2nd generation routing is enabled.

---

### MicroAppsProps <a name="MicroAppsProps" id="@pwrdrvr/microapps-cdk.MicroAppsProps"></a>

Properties to initialize an instance of `MicroApps`.

#### Initializer <a name="Initializer" id="@pwrdrvr/microapps-cdk.MicroAppsProps.Initializer"></a>

```typescript
import { MicroAppsProps } from '@pwrdrvr/microapps-cdk'

const microAppsProps: MicroAppsProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsProps.property.appEnv">appEnv</a></code> | <code>string</code> | Passed to NODE_ENV of Router and Deployer Lambda functions. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsProps.property.addXForwardedHostHeader">addXForwardedHostHeader</a></code> | <code>boolean</code> | Adds an X-Forwarded-Host-Header when calling API Gateway. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsProps.property.allowedFunctionUrlAccounts">allowedFunctionUrlAccounts</a></code> | <code>string[]</code> | Account IDs allowed for cross-account Function URL invocations. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsProps.property.allowedLocalePrefixes">allowedLocalePrefixes</a></code> | <code>string[]</code> | List of allowed locale prefixes for pages. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsProps.property.assetNameRoot">assetNameRoot</a></code> | <code>string</code> | Optional asset name root. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsProps.property.assetNameSuffix">assetNameSuffix</a></code> | <code>string</code> | Optional asset name suffix. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsProps.property.certEdge">certEdge</a></code> | <code>aws-cdk-lib.aws_certificatemanager.ICertificate</code> | Certificate in US-East-1 for the CloudFront distribution. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsProps.property.certOrigin">certOrigin</a></code> | <code>aws-cdk-lib.aws_certificatemanager.ICertificate</code> | Certificate in deployed region for the API Gateway. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsProps.property.createAPIGateway">createAPIGateway</a></code> | <code>boolean</code> | Create API Gateway for non-edge invocation. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsProps.property.createAPIPathRoute">createAPIPathRoute</a></code> | <code>boolean</code> | Create an extra Behavior (Route) for /api/ that allows API routes to have a period in them. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsProps.property.createNextDataPathRoute">createNextDataPathRoute</a></code> | <code>boolean</code> | Create an extra Behavior (Route) for /_next/data/ This route is used by Next.js to load data from the API Gateway on `getServerSideProps` calls.  The requests can end in `.json`, which would cause them to be routed to S3 if this route is not created. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsProps.property.domainNameEdge">domainNameEdge</a></code> | <code>string</code> | Optional custom domain name for the CloudFront distribution. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsProps.property.domainNameOrigin">domainNameOrigin</a></code> | <code>string</code> | Optional custom domain name for the API Gateway HTTPv2 API. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsProps.property.edgeLambdas">edgeLambdas</a></code> | <code>aws-cdk-lib.aws_cloudfront.EdgeLambda[]</code> | Additional edge lambda functions. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsProps.property.edgeToOriginRoleARNs">edgeToOriginRoleARNs</a></code> | <code>string[]</code> | Additional IAM Role ARNs that should be allowed to invoke apps in child accounts. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsProps.property.originRegion">originRegion</a></code> | <code>string</code> | Origin region that API Gateway or Lambda function will be deployed to, used for the config.yml on the Edge function to sign requests for the correct region. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsProps.property.originShieldRegion">originShieldRegion</a></code> | <code>string</code> | Optional Origin Shield Region. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsProps.property.r53Zone">r53Zone</a></code> | <code>aws-cdk-lib.aws_route53.IHostedZone</code> | Route53 zone in which to create optional `domainNameEdge` record. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsProps.property.removalPolicy">removalPolicy</a></code> | <code>aws-cdk-lib.RemovalPolicy</code> | RemovalPolicy override for child resources. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsProps.property.replaceHostHeader">replaceHostHeader</a></code> | <code>boolean</code> | Replaces Host header (which will be the Edge domain name) with the Origin domain name when enabled. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsProps.property.rootPathPrefix">rootPathPrefix</a></code> | <code>string</code> | Path prefix on the root of the CloudFront distribution. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsProps.property.s3PolicyBypassAROAs">s3PolicyBypassAROAs</a></code> | <code>string[]</code> | Applies when using s3StrictBucketPolicy = true. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsProps.property.s3PolicyBypassPrincipalARNs">s3PolicyBypassPrincipalARNs</a></code> | <code>string[]</code> | Applies when using s3StrictBucketPolicy = true. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsProps.property.s3StrictBucketPolicy">s3StrictBucketPolicy</a></code> | <code>boolean</code> | Use a strict S3 Bucket Policy that prevents applications from reading/writing/modifying/deleting files in the S3 Bucket outside of the path that is specific to their app/version. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsProps.property.signingMode">signingMode</a></code> | <code>string</code> | Requires IAM auth on the API Gateway origin if not set to 'none'. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsProps.property.table">table</a></code> | <code>aws-cdk-lib.aws_dynamodb.ITable \| aws-cdk-lib.aws_dynamodb.ITableV2</code> | Existing table for apps/versions/rules. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsProps.property.tableNameForEdgeToOrigin">tableNameForEdgeToOrigin</a></code> | <code>string</code> | Pre-set table name for apps/versions/rules. |

---

##### `appEnv`<sup>Required</sup> <a name="appEnv" id="@pwrdrvr/microapps-cdk.MicroAppsProps.property.appEnv"></a>

```typescript
public readonly appEnv: string;
```

- *Type:* string
- *Default:* dev

Passed to NODE_ENV of Router and Deployer Lambda functions.

---

##### `addXForwardedHostHeader`<sup>Optional</sup> <a name="addXForwardedHostHeader" id="@pwrdrvr/microapps-cdk.MicroAppsProps.property.addXForwardedHostHeader"></a>

```typescript
public readonly addXForwardedHostHeader: boolean;
```

- *Type:* boolean
- *Default:* true

Adds an X-Forwarded-Host-Header when calling API Gateway.

Can only be trusted if `signingMode` is enabled, which restricts
access to API Gateway to only IAM signed requests.

Note: if true, creates OriginRequest Lambda @ Edge function for API Gateway Origin

---

##### `allowedFunctionUrlAccounts`<sup>Optional</sup> <a name="allowedFunctionUrlAccounts" id="@pwrdrvr/microapps-cdk.MicroAppsProps.property.allowedFunctionUrlAccounts"></a>

```typescript
public readonly allowedFunctionUrlAccounts: string[];
```

- *Type:* string[]
- *Default:* []

Account IDs allowed for cross-account Function URL invocations.

---

##### `allowedLocalePrefixes`<sup>Optional</sup> <a name="allowedLocalePrefixes" id="@pwrdrvr/microapps-cdk.MicroAppsProps.property.allowedLocalePrefixes"></a>

```typescript
public readonly allowedLocalePrefixes: string[];
```

- *Type:* string[]
- *Default:* none

List of allowed locale prefixes for pages.

---

*Example*

```typescript
: ['en', 'fr', 'es']
```


##### `assetNameRoot`<sup>Optional</sup> <a name="assetNameRoot" id="@pwrdrvr/microapps-cdk.MicroAppsProps.property.assetNameRoot"></a>

```typescript
public readonly assetNameRoot: string;
```

- *Type:* string
- *Default:* resource names auto assigned

Optional asset name root.

---

*Example*

```typescript
microapps
```


##### `assetNameSuffix`<sup>Optional</sup> <a name="assetNameSuffix" id="@pwrdrvr/microapps-cdk.MicroAppsProps.property.assetNameSuffix"></a>

```typescript
public readonly assetNameSuffix: string;
```

- *Type:* string
- *Default:* none

Optional asset name suffix.

---

*Example*

```typescript
-dev-pr-12
```


##### `certEdge`<sup>Optional</sup> <a name="certEdge" id="@pwrdrvr/microapps-cdk.MicroAppsProps.property.certEdge"></a>

```typescript
public readonly certEdge: ICertificate;
```

- *Type:* aws-cdk-lib.aws_certificatemanager.ICertificate

Certificate in US-East-1 for the CloudFront distribution.

---

##### `certOrigin`<sup>Optional</sup> <a name="certOrigin" id="@pwrdrvr/microapps-cdk.MicroAppsProps.property.certOrigin"></a>

```typescript
public readonly certOrigin: ICertificate;
```

- *Type:* aws-cdk-lib.aws_certificatemanager.ICertificate

Certificate in deployed region for the API Gateway.

---

##### `createAPIGateway`<sup>Optional</sup> <a name="createAPIGateway" id="@pwrdrvr/microapps-cdk.MicroAppsProps.property.createAPIGateway"></a>

```typescript
public readonly createAPIGateway: boolean;
```

- *Type:* boolean
- *Default:* false

Create API Gateway for non-edge invocation.

---

##### `createAPIPathRoute`<sup>Optional</sup> <a name="createAPIPathRoute" id="@pwrdrvr/microapps-cdk.MicroAppsProps.property.createAPIPathRoute"></a>

```typescript
public readonly createAPIPathRoute: boolean;
```

- *Type:* boolean
- *Default:* true

Create an extra Behavior (Route) for /api/ that allows API routes to have a period in them.

When false API routes with a period in the path will get routed to S3.

When true API routes that contain /api/ in the path will get routed to API Gateway
even if they have a period in the path.

---

##### `createNextDataPathRoute`<sup>Optional</sup> <a name="createNextDataPathRoute" id="@pwrdrvr/microapps-cdk.MicroAppsProps.property.createNextDataPathRoute"></a>

```typescript
public readonly createNextDataPathRoute: boolean;
```

- *Type:* boolean
- *Default:* true

Create an extra Behavior (Route) for /_next/data/ This route is used by Next.js to load data from the API Gateway on `getServerSideProps` calls.  The requests can end in `.json`, which would cause them to be routed to S3 if this route is not created.

When false API routes with a period in the path will get routed to S3.

When true API routes that contain /_next/data/ in the path will get routed to API Gateway
even if they have a period in the path.

---

##### `domainNameEdge`<sup>Optional</sup> <a name="domainNameEdge" id="@pwrdrvr/microapps-cdk.MicroAppsProps.property.domainNameEdge"></a>

```typescript
public readonly domainNameEdge: string;
```

- *Type:* string
- *Default:* auto-assigned

Optional custom domain name for the CloudFront distribution.

---

*Example*

```typescript
apps.pwrdrvr.com
```


##### `domainNameOrigin`<sup>Optional</sup> <a name="domainNameOrigin" id="@pwrdrvr/microapps-cdk.MicroAppsProps.property.domainNameOrigin"></a>

```typescript
public readonly domainNameOrigin: string;
```

- *Type:* string
- *Default:* auto-assigned

Optional custom domain name for the API Gateway HTTPv2 API.

---

*Example*

```typescript
apps-origin.pwrdrvr.com
```


##### `edgeLambdas`<sup>Optional</sup> <a name="edgeLambdas" id="@pwrdrvr/microapps-cdk.MicroAppsProps.property.edgeLambdas"></a>

```typescript
public readonly edgeLambdas: EdgeLambda[];
```

- *Type:* aws-cdk-lib.aws_cloudfront.EdgeLambda[]

Additional edge lambda functions.

---

##### `edgeToOriginRoleARNs`<sup>Optional</sup> <a name="edgeToOriginRoleARNs" id="@pwrdrvr/microapps-cdk.MicroAppsProps.property.edgeToOriginRoleARNs"></a>

```typescript
public readonly edgeToOriginRoleARNs: string[];
```

- *Type:* string[]

Additional IAM Role ARNs that should be allowed to invoke apps in child accounts.

---

##### `originRegion`<sup>Optional</sup> <a name="originRegion" id="@pwrdrvr/microapps-cdk.MicroAppsProps.property.originRegion"></a>

```typescript
public readonly originRegion: string;
```

- *Type:* string
- *Default:* undefined

Origin region that API Gateway or Lambda function will be deployed to, used for the config.yml on the Edge function to sign requests for the correct region.

---

##### `originShieldRegion`<sup>Optional</sup> <a name="originShieldRegion" id="@pwrdrvr/microapps-cdk.MicroAppsProps.property.originShieldRegion"></a>

```typescript
public readonly originShieldRegion: string;
```

- *Type:* string
- *Default:* originRegion if specified, otherwise undefined

Optional Origin Shield Region.

This should be the region where the DynamoDB is located so the
EdgeToOrigin calls have the lowest latency (~1 ms).

---

##### `r53Zone`<sup>Optional</sup> <a name="r53Zone" id="@pwrdrvr/microapps-cdk.MicroAppsProps.property.r53Zone"></a>

```typescript
public readonly r53Zone: IHostedZone;
```

- *Type:* aws-cdk-lib.aws_route53.IHostedZone

Route53 zone in which to create optional `domainNameEdge` record.

---

##### `removalPolicy`<sup>Optional</sup> <a name="removalPolicy" id="@pwrdrvr/microapps-cdk.MicroAppsProps.property.removalPolicy"></a>

```typescript
public readonly removalPolicy: RemovalPolicy;
```

- *Type:* aws-cdk-lib.RemovalPolicy
- *Default:* per resource default

RemovalPolicy override for child resources.

Note: if set to DESTROY the S3 buckes will have `autoDeleteObjects` set to `true`

---

##### `replaceHostHeader`<sup>Optional</sup> <a name="replaceHostHeader" id="@pwrdrvr/microapps-cdk.MicroAppsProps.property.replaceHostHeader"></a>

```typescript
public readonly replaceHostHeader: boolean;
```

- *Type:* boolean
- *Default:* true

Replaces Host header (which will be the Edge domain name) with the Origin domain name when enabled.

This is necessary when API Gateway has not been configured
with a custom domain name that matches the exact domain name used by the CloudFront
Distribution AND when the OriginRequestPolicy.HeadersBehavior is set
to pass all headers to the origin.

Note: if true, creates OriginRequest Lambda @ Edge function for API Gateway Origin

---

##### `rootPathPrefix`<sup>Optional</sup> <a name="rootPathPrefix" id="@pwrdrvr/microapps-cdk.MicroAppsProps.property.rootPathPrefix"></a>

```typescript
public readonly rootPathPrefix: string;
```

- *Type:* string

Path prefix on the root of the CloudFront distribution.

---

*Example*

```typescript
dev/
```


##### `s3PolicyBypassAROAs`<sup>Optional</sup> <a name="s3PolicyBypassAROAs" id="@pwrdrvr/microapps-cdk.MicroAppsProps.property.s3PolicyBypassAROAs"></a>

```typescript
public readonly s3PolicyBypassAROAs: string[];
```

- *Type:* string[]

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

> [s3StrictBucketPolicy](s3StrictBucketPolicy)

---

*Example*

```typescript
[ 'AROA1234567890123' ]
```


##### `s3PolicyBypassPrincipalARNs`<sup>Optional</sup> <a name="s3PolicyBypassPrincipalARNs" id="@pwrdrvr/microapps-cdk.MicroAppsProps.property.s3PolicyBypassPrincipalARNs"></a>

```typescript
public readonly s3PolicyBypassPrincipalARNs: string[];
```

- *Type:* string[]

Applies when using s3StrictBucketPolicy = true.

IAM Role or IAM User names to exclude from the DENY rules on the S3 Bucket Policy.

Roles that are Assumed must instead have their AROA added to `s3PolicyBypassAROAs`.

Typically any admin roles / users that need to view or manage the S3 Bucket
would be added to this list.

> [s3PolicyBypassAROAs](s3PolicyBypassAROAs)

---

*Example*

```typescript
['arn:aws:iam::1234567890123:role/AdminAccess', 'arn:aws:iam::1234567890123:user/MyAdminUser']
```


##### `s3StrictBucketPolicy`<sup>Optional</sup> <a name="s3StrictBucketPolicy" id="@pwrdrvr/microapps-cdk.MicroAppsProps.property.s3StrictBucketPolicy"></a>

```typescript
public readonly s3StrictBucketPolicy: boolean;
```

- *Type:* boolean
- *Default:* false

Use a strict S3 Bucket Policy that prevents applications from reading/writing/modifying/deleting files in the S3 Bucket outside of the path that is specific to their app/version.

This setting should be used when applications are less than
fully trusted.

---

##### `signingMode`<sup>Optional</sup> <a name="signingMode" id="@pwrdrvr/microapps-cdk.MicroAppsProps.property.signingMode"></a>

```typescript
public readonly signingMode: string;
```

- *Type:* string
- *Default:* 'sign'

Requires IAM auth on the API Gateway origin if not set to 'none'.

'sign' - Uses request headers for auth.
'presign' - Uses query string for auth.

If enabled,

Note: if 'sign' or 'presign', creates OriginRequest Lambda @ Edge function for API Gateway Origin

---

##### `table`<sup>Optional</sup> <a name="table" id="@pwrdrvr/microapps-cdk.MicroAppsProps.property.table"></a>

```typescript
public readonly table: ITable | ITableV2;
```

- *Type:* aws-cdk-lib.aws_dynamodb.ITable | aws-cdk-lib.aws_dynamodb.ITableV2
- *Default:* created by construct

Existing table for apps/versions/rules.

---

##### `tableNameForEdgeToOrigin`<sup>Optional</sup> <a name="tableNameForEdgeToOrigin" id="@pwrdrvr/microapps-cdk.MicroAppsProps.property.tableNameForEdgeToOrigin"></a>

```typescript
public readonly tableNameForEdgeToOrigin: string;
```

- *Type:* string

Pre-set table name for apps/versions/rules.

This is required when using v2 routing

---

### MicroAppsS3Props <a name="MicroAppsS3Props" id="@pwrdrvr/microapps-cdk.MicroAppsS3Props"></a>

Properties to initialize an instance of `MicroAppsS3`.

#### Initializer <a name="Initializer" id="@pwrdrvr/microapps-cdk.MicroAppsS3Props.Initializer"></a>

```typescript
import { MicroAppsS3Props } from '@pwrdrvr/microapps-cdk'

const microAppsS3Props: MicroAppsS3Props = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsS3Props.property.assetNameRoot">assetNameRoot</a></code> | <code>string</code> | Optional asset name root. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsS3Props.property.assetNameSuffix">assetNameSuffix</a></code> | <code>string</code> | Optional asset name suffix. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsS3Props.property.bucketAppsName">bucketAppsName</a></code> | <code>string</code> | S3 deployed apps bucket name. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsS3Props.property.bucketAppsStagingName">bucketAppsStagingName</a></code> | <code>string</code> | S3 staging apps bucket name. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsS3Props.property.bucketLogsName">bucketLogsName</a></code> | <code>string</code> | S3 logs bucket name. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsS3Props.property.originShieldRegion">originShieldRegion</a></code> | <code>string</code> | Optional Origin Shield Region. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsS3Props.property.removalPolicy">removalPolicy</a></code> | <code>aws-cdk-lib.RemovalPolicy</code> | RemovalPolicy override for child resources. |

---

##### `assetNameRoot`<sup>Optional</sup> <a name="assetNameRoot" id="@pwrdrvr/microapps-cdk.MicroAppsS3Props.property.assetNameRoot"></a>

```typescript
public readonly assetNameRoot: string;
```

- *Type:* string
- *Default:* resource names auto assigned

Optional asset name root.

---

*Example*

```typescript
microapps
```


##### `assetNameSuffix`<sup>Optional</sup> <a name="assetNameSuffix" id="@pwrdrvr/microapps-cdk.MicroAppsS3Props.property.assetNameSuffix"></a>

```typescript
public readonly assetNameSuffix: string;
```

- *Type:* string
- *Default:* none

Optional asset name suffix.

---

*Example*

```typescript
-dev-pr-12
```


##### `bucketAppsName`<sup>Optional</sup> <a name="bucketAppsName" id="@pwrdrvr/microapps-cdk.MicroAppsS3Props.property.bucketAppsName"></a>

```typescript
public readonly bucketAppsName: string;
```

- *Type:* string
- *Default:* auto-assigned

S3 deployed apps bucket name.

---

##### `bucketAppsStagingName`<sup>Optional</sup> <a name="bucketAppsStagingName" id="@pwrdrvr/microapps-cdk.MicroAppsS3Props.property.bucketAppsStagingName"></a>

```typescript
public readonly bucketAppsStagingName: string;
```

- *Type:* string
- *Default:* auto-assigned

S3 staging apps bucket name.

---

##### `bucketLogsName`<sup>Optional</sup> <a name="bucketLogsName" id="@pwrdrvr/microapps-cdk.MicroAppsS3Props.property.bucketLogsName"></a>

```typescript
public readonly bucketLogsName: string;
```

- *Type:* string
- *Default:* auto-assigned

S3 logs bucket name.

---

##### `originShieldRegion`<sup>Optional</sup> <a name="originShieldRegion" id="@pwrdrvr/microapps-cdk.MicroAppsS3Props.property.originShieldRegion"></a>

```typescript
public readonly originShieldRegion: string;
```

- *Type:* string
- *Default:* none

Optional Origin Shield Region.

This should be the region where the DynamoDB is located so the
EdgeToOrigin calls have the lowest latency (~1 ms).

---

##### `removalPolicy`<sup>Optional</sup> <a name="removalPolicy" id="@pwrdrvr/microapps-cdk.MicroAppsS3Props.property.removalPolicy"></a>

```typescript
public readonly removalPolicy: RemovalPolicy;
```

- *Type:* aws-cdk-lib.RemovalPolicy
- *Default:* per resource default

RemovalPolicy override for child resources.

Note: if set to DESTROY the S3 buckets will have `autoDeleteObjects` set to `true`

---

### MicroAppsSvcsProps <a name="MicroAppsSvcsProps" id="@pwrdrvr/microapps-cdk.MicroAppsSvcsProps"></a>

Properties to initialize an instance of `MicroAppsSvcs`.

#### Initializer <a name="Initializer" id="@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.Initializer"></a>

```typescript
import { MicroAppsSvcsProps } from '@pwrdrvr/microapps-cdk'

const microAppsSvcsProps: MicroAppsSvcsProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.property.appEnv">appEnv</a></code> | <code>string</code> | Application environment, passed as `NODE_ENV` to the Router and Deployer Lambda functions. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.property.bucketApps">bucketApps</a></code> | <code>aws-cdk-lib.aws_s3.IBucket</code> | S3 bucket for deployed applications. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.property.bucketAppsOAI">bucketAppsOAI</a></code> | <code>aws-cdk-lib.aws_cloudfront.OriginAccessIdentity</code> | CloudFront Origin Access Identity for the deployed applications bucket. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.property.bucketAppsStaging">bucketAppsStaging</a></code> | <code>aws-cdk-lib.aws_s3.IBucket</code> | S3 bucket for staged applications (prior to deploy). |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.property.assetNameRoot">assetNameRoot</a></code> | <code>string</code> | Optional asset name root. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.property.assetNameSuffix">assetNameSuffix</a></code> | <code>string</code> | Optional asset name suffix. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.property.deployerTimeout">deployerTimeout</a></code> | <code>aws-cdk-lib.Duration</code> | Deployer timeout. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.property.edgeToOriginRoleARN">edgeToOriginRoleARN</a></code> | <code>string[]</code> | ARN of the IAM Role for the Edge to Origin Lambda Function. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.property.removalPolicy">removalPolicy</a></code> | <code>aws-cdk-lib.RemovalPolicy</code> | RemovalPolicy override for child resources. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.property.requireIAMAuthorization">requireIAMAuthorization</a></code> | <code>boolean</code> | Require IAM auth on API Gateway and Lambda Function URLs. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.property.rootPathPrefix">rootPathPrefix</a></code> | <code>string</code> | Path prefix on the root of the deployment. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.property.s3PolicyBypassAROAs">s3PolicyBypassAROAs</a></code> | <code>string[]</code> | Applies when using s3StrictBucketPolicy = true. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.property.s3PolicyBypassPrincipalARNs">s3PolicyBypassPrincipalARNs</a></code> | <code>string[]</code> | Applies when using s3StrictBucketPolicy = true. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.property.s3StrictBucketPolicy">s3StrictBucketPolicy</a></code> | <code>boolean</code> | Use a strict S3 Bucket Policy that prevents applications from reading/writing/modifying/deleting files in the S3 Bucket outside of the path that is specific to their app/version. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.property.table">table</a></code> | <code>aws-cdk-lib.aws_dynamodb.ITable</code> | Existing table for apps/versions/rules. |

---

##### `appEnv`<sup>Required</sup> <a name="appEnv" id="@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.property.appEnv"></a>

```typescript
public readonly appEnv: string;
```

- *Type:* string

Application environment, passed as `NODE_ENV` to the Router and Deployer Lambda functions.

---

##### `bucketApps`<sup>Required</sup> <a name="bucketApps" id="@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.property.bucketApps"></a>

```typescript
public readonly bucketApps: IBucket;
```

- *Type:* aws-cdk-lib.aws_s3.IBucket

S3 bucket for deployed applications.

---

##### `bucketAppsOAI`<sup>Required</sup> <a name="bucketAppsOAI" id="@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.property.bucketAppsOAI"></a>

```typescript
public readonly bucketAppsOAI: OriginAccessIdentity;
```

- *Type:* aws-cdk-lib.aws_cloudfront.OriginAccessIdentity

CloudFront Origin Access Identity for the deployed applications bucket.

---

##### `bucketAppsStaging`<sup>Required</sup> <a name="bucketAppsStaging" id="@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.property.bucketAppsStaging"></a>

```typescript
public readonly bucketAppsStaging: IBucket;
```

- *Type:* aws-cdk-lib.aws_s3.IBucket

S3 bucket for staged applications (prior to deploy).

---

##### `assetNameRoot`<sup>Optional</sup> <a name="assetNameRoot" id="@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.property.assetNameRoot"></a>

```typescript
public readonly assetNameRoot: string;
```

- *Type:* string
- *Default:* resource names auto assigned

Optional asset name root.

---

*Example*

```typescript
microapps
```


##### `assetNameSuffix`<sup>Optional</sup> <a name="assetNameSuffix" id="@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.property.assetNameSuffix"></a>

```typescript
public readonly assetNameSuffix: string;
```

- *Type:* string
- *Default:* none

Optional asset name suffix.

---

*Example*

```typescript
-dev-pr-12
```


##### `deployerTimeout`<sup>Optional</sup> <a name="deployerTimeout" id="@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.property.deployerTimeout"></a>

```typescript
public readonly deployerTimeout: Duration;
```

- *Type:* aws-cdk-lib.Duration
- *Default:* 2 minutes

Deployer timeout.

For larger applications this needs to be set up to 2-5 minutes for the S3 copy

---

##### `edgeToOriginRoleARN`<sup>Optional</sup> <a name="edgeToOriginRoleARN" id="@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.property.edgeToOriginRoleARN"></a>

```typescript
public readonly edgeToOriginRoleARN: string[];
```

- *Type:* string[]

ARN of the IAM Role for the Edge to Origin Lambda Function.

---

##### `removalPolicy`<sup>Optional</sup> <a name="removalPolicy" id="@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.property.removalPolicy"></a>

```typescript
public readonly removalPolicy: RemovalPolicy;
```

- *Type:* aws-cdk-lib.RemovalPolicy
- *Default:* per resource default

RemovalPolicy override for child resources.

Note: if set to DESTROY the S3 buckes will have `autoDeleteObjects` set to `true`

---

##### `requireIAMAuthorization`<sup>Optional</sup> <a name="requireIAMAuthorization" id="@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.property.requireIAMAuthorization"></a>

```typescript
public readonly requireIAMAuthorization: boolean;
```

- *Type:* boolean
- *Default:* true

Require IAM auth on API Gateway and Lambda Function URLs.

---

##### `rootPathPrefix`<sup>Optional</sup> <a name="rootPathPrefix" id="@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.property.rootPathPrefix"></a>

```typescript
public readonly rootPathPrefix: string;
```

- *Type:* string
- *Default:* none

Path prefix on the root of the deployment.

---

*Example*

```typescript
dev/
```


##### `s3PolicyBypassAROAs`<sup>Optional</sup> <a name="s3PolicyBypassAROAs" id="@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.property.s3PolicyBypassAROAs"></a>

```typescript
public readonly s3PolicyBypassAROAs: string[];
```

- *Type:* string[]

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

> [s3StrictBucketPolicy](s3StrictBucketPolicy)

---

*Example*

```typescript
[ 'AROA1234567890123' ]
```


##### `s3PolicyBypassPrincipalARNs`<sup>Optional</sup> <a name="s3PolicyBypassPrincipalARNs" id="@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.property.s3PolicyBypassPrincipalARNs"></a>

```typescript
public readonly s3PolicyBypassPrincipalARNs: string[];
```

- *Type:* string[]

Applies when using s3StrictBucketPolicy = true.

IAM Role or IAM User names to exclude from the DENY rules on the S3 Bucket Policy.

Roles that are Assumed must instead have their AROA added to `s3PolicyBypassAROAs`.

Typically any admin roles / users that need to view or manage the S3 Bucket
would be added to this list.

> [s3PolicyBypassAROAs](s3PolicyBypassAROAs)

---

*Example*

```typescript
['arn:aws:iam::1234567890123:role/AdminAccess', 'arn:aws:iam::1234567890123:user/MyAdminUser']
```


##### `s3StrictBucketPolicy`<sup>Optional</sup> <a name="s3StrictBucketPolicy" id="@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.property.s3StrictBucketPolicy"></a>

```typescript
public readonly s3StrictBucketPolicy: boolean;
```

- *Type:* boolean
- *Default:* false

Use a strict S3 Bucket Policy that prevents applications from reading/writing/modifying/deleting files in the S3 Bucket outside of the path that is specific to their app/version.

This setting should be used when applications are less than
fully trusted.

---

##### `table`<sup>Optional</sup> <a name="table" id="@pwrdrvr/microapps-cdk.MicroAppsSvcsProps.property.table"></a>

```typescript
public readonly table: ITable;
```

- *Type:* aws-cdk-lib.aws_dynamodb.ITable
- *Default:* created by construct

Existing table for apps/versions/rules.

---

### MicroAppsTableProps <a name="MicroAppsTableProps" id="@pwrdrvr/microapps-cdk.MicroAppsTableProps"></a>

Properties to initialize an instance of `MicroAppsTable`.

#### Initializer <a name="Initializer" id="@pwrdrvr/microapps-cdk.MicroAppsTableProps.Initializer"></a>

```typescript
import { MicroAppsTableProps } from '@pwrdrvr/microapps-cdk'

const microAppsTableProps: MicroAppsTableProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsTableProps.property.assetNameRoot">assetNameRoot</a></code> | <code>string</code> | Optional asset name root. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsTableProps.property.assetNameSuffix">assetNameSuffix</a></code> | <code>string</code> | Optional asset name suffix. |
| <code><a href="#@pwrdrvr/microapps-cdk.MicroAppsTableProps.property.removalPolicy">removalPolicy</a></code> | <code>aws-cdk-lib.RemovalPolicy</code> | RemovalPolicy override for child resources. |

---

##### `assetNameRoot`<sup>Optional</sup> <a name="assetNameRoot" id="@pwrdrvr/microapps-cdk.MicroAppsTableProps.property.assetNameRoot"></a>

```typescript
public readonly assetNameRoot: string;
```

- *Type:* string
- *Default:* resource names auto assigned

Optional asset name root.

---

*Example*

```typescript
microapps
```


##### `assetNameSuffix`<sup>Optional</sup> <a name="assetNameSuffix" id="@pwrdrvr/microapps-cdk.MicroAppsTableProps.property.assetNameSuffix"></a>

```typescript
public readonly assetNameSuffix: string;
```

- *Type:* string
- *Default:* none

Optional asset name suffix.

---

*Example*

```typescript
-dev-pr-12
```


##### `removalPolicy`<sup>Optional</sup> <a name="removalPolicy" id="@pwrdrvr/microapps-cdk.MicroAppsTableProps.property.removalPolicy"></a>

```typescript
public readonly removalPolicy: RemovalPolicy;
```

- *Type:* aws-cdk-lib.RemovalPolicy
- *Default:* per resource default

RemovalPolicy override for child resources.

Note: if set to DESTROY the S3 buckes will have `autoDeleteObjects` set to `true`

---


## Protocols <a name="Protocols" id="Protocols"></a>

### IMicroApps <a name="IMicroApps" id="@pwrdrvr/microapps-cdk.IMicroApps"></a>

- *Implemented By:* <a href="#@pwrdrvr/microapps-cdk.MicroApps">MicroApps</a>, <a href="#@pwrdrvr/microapps-cdk.IMicroApps">IMicroApps</a>

Represents a MicroApps.


#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.IMicroApps.property.cf">cf</a></code> | <code><a href="#@pwrdrvr/microapps-cdk.IMicroAppsCF">IMicroAppsCF</a></code> | {@inheritdoc IMicroAppsCF}. |
| <code><a href="#@pwrdrvr/microapps-cdk.IMicroApps.property.s3">s3</a></code> | <code><a href="#@pwrdrvr/microapps-cdk.IMicroAppsS3">IMicroAppsS3</a></code> | {@inheritdoc IMicroAppsS3}. |
| <code><a href="#@pwrdrvr/microapps-cdk.IMicroApps.property.svcs">svcs</a></code> | <code><a href="#@pwrdrvr/microapps-cdk.IMicroAppsSvcs">IMicroAppsSvcs</a></code> | {@inheritdoc IMicroAppsSvcs}. |
| <code><a href="#@pwrdrvr/microapps-cdk.IMicroApps.property.edgeToOrigin">edgeToOrigin</a></code> | <code><a href="#@pwrdrvr/microapps-cdk.IMicroAppsEdgeToOrigin">IMicroAppsEdgeToOrigin</a></code> | {@inheritdoc IMicroAppsEdgeToOrigin}. |

---

##### `cf`<sup>Required</sup> <a name="cf" id="@pwrdrvr/microapps-cdk.IMicroApps.property.cf"></a>

```typescript
public readonly cf: IMicroAppsCF;
```

- *Type:* <a href="#@pwrdrvr/microapps-cdk.IMicroAppsCF">IMicroAppsCF</a>

{@inheritdoc IMicroAppsCF}.

---

##### `s3`<sup>Required</sup> <a name="s3" id="@pwrdrvr/microapps-cdk.IMicroApps.property.s3"></a>

```typescript
public readonly s3: IMicroAppsS3;
```

- *Type:* <a href="#@pwrdrvr/microapps-cdk.IMicroAppsS3">IMicroAppsS3</a>

{@inheritdoc IMicroAppsS3}.

---

##### `svcs`<sup>Required</sup> <a name="svcs" id="@pwrdrvr/microapps-cdk.IMicroApps.property.svcs"></a>

```typescript
public readonly svcs: IMicroAppsSvcs;
```

- *Type:* <a href="#@pwrdrvr/microapps-cdk.IMicroAppsSvcs">IMicroAppsSvcs</a>

{@inheritdoc IMicroAppsSvcs}.

---

##### `edgeToOrigin`<sup>Optional</sup> <a name="edgeToOrigin" id="@pwrdrvr/microapps-cdk.IMicroApps.property.edgeToOrigin"></a>

```typescript
public readonly edgeToOrigin: IMicroAppsEdgeToOrigin;
```

- *Type:* <a href="#@pwrdrvr/microapps-cdk.IMicroAppsEdgeToOrigin">IMicroAppsEdgeToOrigin</a>

{@inheritdoc IMicroAppsEdgeToOrigin}.

---

### IMicroAppsCF <a name="IMicroAppsCF" id="@pwrdrvr/microapps-cdk.IMicroAppsCF"></a>

- *Implemented By:* <a href="#@pwrdrvr/microapps-cdk.MicroAppsCF">MicroAppsCF</a>, <a href="#@pwrdrvr/microapps-cdk.IMicroAppsCF">IMicroAppsCF</a>

Represents a MicroApps CloudFront.


#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.IMicroAppsCF.property.cloudFrontDistro">cloudFrontDistro</a></code> | <code>aws-cdk-lib.aws_cloudfront.Distribution</code> | The CloudFront distribution. |

---

##### `cloudFrontDistro`<sup>Required</sup> <a name="cloudFrontDistro" id="@pwrdrvr/microapps-cdk.IMicroAppsCF.property.cloudFrontDistro"></a>

```typescript
public readonly cloudFrontDistro: Distribution;
```

- *Type:* aws-cdk-lib.aws_cloudfront.Distribution

The CloudFront distribution.

---

### IMicroAppsChildDeployer <a name="IMicroAppsChildDeployer" id="@pwrdrvr/microapps-cdk.IMicroAppsChildDeployer"></a>

- *Implemented By:* <a href="#@pwrdrvr/microapps-cdk.MicroAppsChildDeployer">MicroAppsChildDeployer</a>, <a href="#@pwrdrvr/microapps-cdk.IMicroAppsChildDeployer">IMicroAppsChildDeployer</a>

Represents a MicroApps Child Deployer.


#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.IMicroAppsChildDeployer.property.deployerFunc">deployerFunc</a></code> | <code>aws-cdk-lib.aws_lambda.IFunction</code> | Lambda function for the Deployer. |

---

##### `deployerFunc`<sup>Required</sup> <a name="deployerFunc" id="@pwrdrvr/microapps-cdk.IMicroAppsChildDeployer.property.deployerFunc"></a>

```typescript
public readonly deployerFunc: IFunction;
```

- *Type:* aws-cdk-lib.aws_lambda.IFunction

Lambda function for the Deployer.

---

### IMicroAppsEdgeToOrigin <a name="IMicroAppsEdgeToOrigin" id="@pwrdrvr/microapps-cdk.IMicroAppsEdgeToOrigin"></a>

- *Implemented By:* <a href="#@pwrdrvr/microapps-cdk.MicroAppsEdgeToOrigin">MicroAppsEdgeToOrigin</a>, <a href="#@pwrdrvr/microapps-cdk.IMicroAppsEdgeToOrigin">IMicroAppsEdgeToOrigin</a>

Represents a MicroApps Edge to Origin Function.


#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.IMicroAppsEdgeToOrigin.property.edgeToOriginFunction">edgeToOriginFunction</a></code> | <code>aws-cdk-lib.aws_lambda.Function \| aws-cdk-lib.aws_cloudfront.experimental.EdgeFunction</code> | The edge to origin function for API Gateway Request Origin Edge Lambda. |
| <code><a href="#@pwrdrvr/microapps-cdk.IMicroAppsEdgeToOrigin.property.edgeToOriginLambdas">edgeToOriginLambdas</a></code> | <code>aws-cdk-lib.aws_cloudfront.EdgeLambda[]</code> | Configuration of the edge to origin lambda functions. |
| <code><a href="#@pwrdrvr/microapps-cdk.IMicroAppsEdgeToOrigin.property.edgeToOriginRole">edgeToOriginRole</a></code> | <code>aws-cdk-lib.aws_iam.Role</code> | The IAM Role for the edge to origin function. |

---

##### `edgeToOriginFunction`<sup>Required</sup> <a name="edgeToOriginFunction" id="@pwrdrvr/microapps-cdk.IMicroAppsEdgeToOrigin.property.edgeToOriginFunction"></a>

```typescript
public readonly edgeToOriginFunction: Function | EdgeFunction;
```

- *Type:* aws-cdk-lib.aws_lambda.Function | aws-cdk-lib.aws_cloudfront.experimental.EdgeFunction

The edge to origin function for API Gateway Request Origin Edge Lambda.

The generated `config.yml` is included in the Lambda's code.

---

##### `edgeToOriginLambdas`<sup>Required</sup> <a name="edgeToOriginLambdas" id="@pwrdrvr/microapps-cdk.IMicroAppsEdgeToOrigin.property.edgeToOriginLambdas"></a>

```typescript
public readonly edgeToOriginLambdas: EdgeLambda[];
```

- *Type:* aws-cdk-lib.aws_cloudfront.EdgeLambda[]

Configuration of the edge to origin lambda functions.

---

##### `edgeToOriginRole`<sup>Required</sup> <a name="edgeToOriginRole" id="@pwrdrvr/microapps-cdk.IMicroAppsEdgeToOrigin.property.edgeToOriginRole"></a>

```typescript
public readonly edgeToOriginRole: Role;
```

- *Type:* aws-cdk-lib.aws_iam.Role

The IAM Role for the edge to origin function.

---

### IMicroAppsS3 <a name="IMicroAppsS3" id="@pwrdrvr/microapps-cdk.IMicroAppsS3"></a>

- *Implemented By:* <a href="#@pwrdrvr/microapps-cdk.MicroAppsS3">MicroAppsS3</a>, <a href="#@pwrdrvr/microapps-cdk.IMicroAppsS3">IMicroAppsS3</a>

Represents a MicroApps S3.


#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.IMicroAppsS3.property.bucketApps">bucketApps</a></code> | <code>aws-cdk-lib.aws_s3.IBucket</code> | S3 bucket for deployed applications. |
| <code><a href="#@pwrdrvr/microapps-cdk.IMicroAppsS3.property.bucketAppsOAI">bucketAppsOAI</a></code> | <code>aws-cdk-lib.aws_cloudfront.OriginAccessIdentity</code> | CloudFront Origin Access Identity for the deployed applications bucket. |
| <code><a href="#@pwrdrvr/microapps-cdk.IMicroAppsS3.property.bucketAppsOriginApp">bucketAppsOriginApp</a></code> | <code>aws-cdk-lib.aws_cloudfront_origins.S3Origin</code> | CloudFront Origin for the deployed applications bucket Marked with `x-microapps-origin: app` so the OriginRequest function knows to send the request to the application origin first, if configured for a particular application. |
| <code><a href="#@pwrdrvr/microapps-cdk.IMicroAppsS3.property.bucketAppsOriginS3">bucketAppsOriginS3</a></code> | <code>aws-cdk-lib.aws_cloudfront_origins.S3Origin</code> | CloudFront Origin for the deployed applications bucket Marked with `x-microapps-origin: s3` so the OriginRequest function knows to NOT send the request to the application origin and instead let it fall through to the S3 bucket. |
| <code><a href="#@pwrdrvr/microapps-cdk.IMicroAppsS3.property.bucketAppsStaging">bucketAppsStaging</a></code> | <code>aws-cdk-lib.aws_s3.IBucket</code> | S3 bucket for staged applications (prior to deploy). |
| <code><a href="#@pwrdrvr/microapps-cdk.IMicroAppsS3.property.bucketLogs">bucketLogs</a></code> | <code>aws-cdk-lib.aws_s3.IBucket</code> | S3 bucket for CloudFront logs. |

---

##### `bucketApps`<sup>Required</sup> <a name="bucketApps" id="@pwrdrvr/microapps-cdk.IMicroAppsS3.property.bucketApps"></a>

```typescript
public readonly bucketApps: IBucket;
```

- *Type:* aws-cdk-lib.aws_s3.IBucket

S3 bucket for deployed applications.

---

##### `bucketAppsOAI`<sup>Required</sup> <a name="bucketAppsOAI" id="@pwrdrvr/microapps-cdk.IMicroAppsS3.property.bucketAppsOAI"></a>

```typescript
public readonly bucketAppsOAI: OriginAccessIdentity;
```

- *Type:* aws-cdk-lib.aws_cloudfront.OriginAccessIdentity

CloudFront Origin Access Identity for the deployed applications bucket.

---

##### `bucketAppsOriginApp`<sup>Required</sup> <a name="bucketAppsOriginApp" id="@pwrdrvr/microapps-cdk.IMicroAppsS3.property.bucketAppsOriginApp"></a>

```typescript
public readonly bucketAppsOriginApp: S3Origin;
```

- *Type:* aws-cdk-lib.aws_cloudfront_origins.S3Origin

CloudFront Origin for the deployed applications bucket Marked with `x-microapps-origin: app` so the OriginRequest function knows to send the request to the application origin first, if configured for a particular application.

---

##### `bucketAppsOriginS3`<sup>Required</sup> <a name="bucketAppsOriginS3" id="@pwrdrvr/microapps-cdk.IMicroAppsS3.property.bucketAppsOriginS3"></a>

```typescript
public readonly bucketAppsOriginS3: S3Origin;
```

- *Type:* aws-cdk-lib.aws_cloudfront_origins.S3Origin

CloudFront Origin for the deployed applications bucket Marked with `x-microapps-origin: s3` so the OriginRequest function knows to NOT send the request to the application origin and instead let it fall through to the S3 bucket.

---

##### `bucketAppsStaging`<sup>Required</sup> <a name="bucketAppsStaging" id="@pwrdrvr/microapps-cdk.IMicroAppsS3.property.bucketAppsStaging"></a>

```typescript
public readonly bucketAppsStaging: IBucket;
```

- *Type:* aws-cdk-lib.aws_s3.IBucket

S3 bucket for staged applications (prior to deploy).

---

##### `bucketLogs`<sup>Required</sup> <a name="bucketLogs" id="@pwrdrvr/microapps-cdk.IMicroAppsS3.property.bucketLogs"></a>

```typescript
public readonly bucketLogs: IBucket;
```

- *Type:* aws-cdk-lib.aws_s3.IBucket

S3 bucket for CloudFront logs.

---

### IMicroAppsSvcs <a name="IMicroAppsSvcs" id="@pwrdrvr/microapps-cdk.IMicroAppsSvcs"></a>

- *Implemented By:* <a href="#@pwrdrvr/microapps-cdk.MicroAppsSvcs">MicroAppsSvcs</a>, <a href="#@pwrdrvr/microapps-cdk.IMicroAppsSvcs">IMicroAppsSvcs</a>

Represents a MicroApps Services.


#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.IMicroAppsSvcs.property.deployerFunc">deployerFunc</a></code> | <code>aws-cdk-lib.aws_lambda.Function</code> | Lambda function for the Deployer. |
| <code><a href="#@pwrdrvr/microapps-cdk.IMicroAppsSvcs.property.table">table</a></code> | <code>aws-cdk-lib.aws_dynamodb.ITable</code> | DynamoDB table used by Router, Deployer, and Release console app. |
| <code><a href="#@pwrdrvr/microapps-cdk.IMicroAppsSvcs.property.routerFunc">routerFunc</a></code> | <code>aws-cdk-lib.aws_lambda.Function</code> | Lambda function for the Router. |

---

##### `deployerFunc`<sup>Required</sup> <a name="deployerFunc" id="@pwrdrvr/microapps-cdk.IMicroAppsSvcs.property.deployerFunc"></a>

```typescript
public readonly deployerFunc: Function;
```

- *Type:* aws-cdk-lib.aws_lambda.Function

Lambda function for the Deployer.

---

##### `table`<sup>Required</sup> <a name="table" id="@pwrdrvr/microapps-cdk.IMicroAppsSvcs.property.table"></a>

```typescript
public readonly table: ITable;
```

- *Type:* aws-cdk-lib.aws_dynamodb.ITable

DynamoDB table used by Router, Deployer, and Release console app.

---

##### `routerFunc`<sup>Optional</sup> <a name="routerFunc" id="@pwrdrvr/microapps-cdk.IMicroAppsSvcs.property.routerFunc"></a>

```typescript
public readonly routerFunc: Function;
```

- *Type:* aws-cdk-lib.aws_lambda.Function

Lambda function for the Router.

---

### IMicroAppsTable <a name="IMicroAppsTable" id="@pwrdrvr/microapps-cdk.IMicroAppsTable"></a>

- *Implemented By:* <a href="#@pwrdrvr/microapps-cdk.MicroAppsTable">MicroAppsTable</a>, <a href="#@pwrdrvr/microapps-cdk.IMicroAppsTable">IMicroAppsTable</a>

Represents a MicroAppsTable.


#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@pwrdrvr/microapps-cdk.IMicroAppsTable.property.table">table</a></code> | <code>aws-cdk-lib.aws_dynamodb.Table</code> | DynamoDB table used by Router, Deployer, and Release console app. |

---

##### `table`<sup>Required</sup> <a name="table" id="@pwrdrvr/microapps-cdk.IMicroAppsTable.property.table"></a>

```typescript
public readonly table: Table;
```

- *Type:* aws-cdk-lib.aws_dynamodb.Table

DynamoDB table used by Router, Deployer, and Release console app.

---

