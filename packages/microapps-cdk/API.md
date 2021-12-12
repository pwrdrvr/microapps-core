# API Reference <a name="API Reference"></a>

## Constructs <a name="Constructs"></a>

### MicroApps <a name="@pwrdrvr/microapps-cdk.MicroApps"></a>

- *Implements:* [`@pwrdrvr/microapps-cdk.IMicroApps`](#@pwrdrvr/microapps-cdk.IMicroApps)

Application deployment and runtime environment.

#### Initializer <a name="@pwrdrvr/microapps-cdk.MicroApps.Initializer"></a>

```typescript
import { MicroApps } from '@pwrdrvr/microapps-cdk'

new MicroApps(scope: Construct, id: string, props?: MicroAppsProps)
```

##### `scope`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroApps.scope"></a>

- *Type:* [`@aws-cdk/core.Construct`](#@aws-cdk/core.Construct)

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

---

##### `s3`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroApps.s3"></a>

- *Type:* [`@pwrdrvr/microapps-cdk.IMicroAppsS3`](#@pwrdrvr/microapps-cdk.IMicroAppsS3)

---

##### `svcs`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroApps.svcs"></a>

- *Type:* [`@pwrdrvr/microapps-cdk.IMicroAppsSvcs`](#@pwrdrvr/microapps-cdk.IMicroAppsSvcs)

---


### MicroAppsCF <a name="@pwrdrvr/microapps-cdk.MicroAppsCF"></a>

- *Implements:* [`@pwrdrvr/microapps-cdk.IMicroAppsCF`](#@pwrdrvr/microapps-cdk.IMicroAppsCF)

#### Initializer <a name="@pwrdrvr/microapps-cdk.MicroAppsCF.Initializer"></a>

```typescript
import { MicroAppsCF } from '@pwrdrvr/microapps-cdk'

new MicroAppsCF(scope: Construct, id: string, props?: MicroAppsCFProps)
```

##### `scope`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCF.scope"></a>

- *Type:* [`@aws-cdk/core.Construct`](#@aws-cdk/core.Construct)

---

##### `id`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCF.id"></a>

- *Type:* `string`

---

##### `props`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCF.props"></a>

- *Type:* [`@pwrdrvr/microapps-cdk.MicroAppsCFProps`](#@pwrdrvr/microapps-cdk.MicroAppsCFProps)

---



#### Properties <a name="Properties"></a>

##### `cloudFrontDistro`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCF.cloudFrontDistro"></a>

- *Type:* [`@aws-cdk/aws-cloudfront.Distribution`](#@aws-cdk/aws-cloudfront.Distribution)

---


### MicroAppsS3 <a name="@pwrdrvr/microapps-cdk.MicroAppsS3"></a>

- *Implements:* [`@pwrdrvr/microapps-cdk.IMicroAppsS3`](#@pwrdrvr/microapps-cdk.IMicroAppsS3)

#### Initializer <a name="@pwrdrvr/microapps-cdk.MicroAppsS3.Initializer"></a>

```typescript
import { MicroAppsS3 } from '@pwrdrvr/microapps-cdk'

new MicroAppsS3(scope: Construct, id: string, props?: MicroAppsS3Props)
```

##### `scope`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsS3.scope"></a>

- *Type:* [`@aws-cdk/core.Construct`](#@aws-cdk/core.Construct)

---

##### `id`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsS3.id"></a>

- *Type:* `string`

---

##### `props`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsS3.props"></a>

- *Type:* [`@pwrdrvr/microapps-cdk.MicroAppsS3Props`](#@pwrdrvr/microapps-cdk.MicroAppsS3Props)

---



#### Properties <a name="Properties"></a>

##### `bucketApps`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsS3.bucketApps"></a>

- *Type:* [`@aws-cdk/aws-s3.IBucket`](#@aws-cdk/aws-s3.IBucket)

---

##### `bucketAppsName`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsS3.bucketAppsName"></a>

- *Type:* `string`

---

##### `bucketAppsOAI`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsS3.bucketAppsOAI"></a>

- *Type:* [`@aws-cdk/aws-cloudfront.OriginAccessIdentity`](#@aws-cdk/aws-cloudfront.OriginAccessIdentity)

---

##### `bucketAppsOrigin`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsS3.bucketAppsOrigin"></a>

- *Type:* [`@aws-cdk/aws-cloudfront-origins.S3Origin`](#@aws-cdk/aws-cloudfront-origins.S3Origin)

---

##### `bucketAppsStaging`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsS3.bucketAppsStaging"></a>

- *Type:* [`@aws-cdk/aws-s3.IBucket`](#@aws-cdk/aws-s3.IBucket)

---

##### `bucketAppsStagingName`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsS3.bucketAppsStagingName"></a>

- *Type:* `string`

---

##### `bucketLogs`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsS3.bucketLogs"></a>

- *Type:* [`@aws-cdk/aws-s3.IBucket`](#@aws-cdk/aws-s3.IBucket)

---


### MicroAppsSvcs <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcs"></a>

- *Implements:* [`@pwrdrvr/microapps-cdk.IMicroAppsSvcs`](#@pwrdrvr/microapps-cdk.IMicroAppsSvcs)

#### Initializer <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcs.Initializer"></a>

```typescript
import { MicroAppsSvcs } from '@pwrdrvr/microapps-cdk'

new MicroAppsSvcs(scope: Construct, id: string, props?: MicroAppsSvcsStackProps)
```

##### `scope`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcs.scope"></a>

- *Type:* [`@aws-cdk/core.Construct`](#@aws-cdk/core.Construct)

---

##### `id`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcs.id"></a>

- *Type:* `string`

---

##### `props`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcs.props"></a>

- *Type:* [`@pwrdrvr/microapps-cdk.MicroAppsSvcsStackProps`](#@pwrdrvr/microapps-cdk.MicroAppsSvcsStackProps)

---



#### Properties <a name="Properties"></a>

##### `dnAppsOrigin`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcs.dnAppsOrigin"></a>

- *Type:* [`@aws-cdk/aws-apigatewayv2.DomainName`](#@aws-cdk/aws-apigatewayv2.DomainName)

---

##### `table`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcs.table"></a>

- *Type:* [`@aws-cdk/aws-dynamodb.ITable`](#@aws-cdk/aws-dynamodb.ITable)

---


## Structs <a name="Structs"></a>

### MicroAppsCFProps <a name="@pwrdrvr/microapps-cdk.MicroAppsCFProps"></a>

#### Initializer <a name="[object Object].Initializer"></a>

```typescript
import { MicroAppsCFProps } from '@pwrdrvr/microapps-cdk'

const microAppsCFProps: MicroAppsCFProps = { ... }
```

##### `assetNameRoot`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCFProps.assetNameRoot"></a>

- *Type:* `string`

---

##### `assetNameSuffix`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCFProps.assetNameSuffix"></a>

- *Type:* `string`

---

##### `autoDeleteEverything`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCFProps.autoDeleteEverything"></a>

- *Type:* `boolean`

---

##### `certEdge`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCFProps.certEdge"></a>

- *Type:* [`@aws-cdk/aws-certificatemanager.ICertificate`](#@aws-cdk/aws-certificatemanager.ICertificate)

---

##### `domainName`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCFProps.domainName"></a>

- *Type:* `string`

---

##### `domainNameEdge`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCFProps.domainNameEdge"></a>

- *Type:* `string`

---

##### `domainNameOrigin`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCFProps.domainNameOrigin"></a>

- *Type:* `string`

---

##### `r53ZoneID`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCFProps.r53ZoneID"></a>

- *Type:* `string`

---

##### `r53ZoneName`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCFProps.r53ZoneName"></a>

- *Type:* `string`

---

##### `reverseDomainName`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCFProps.reverseDomainName"></a>

- *Type:* `string`

---

##### `s3Exports`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsCFProps.s3Exports"></a>

- *Type:* [`@pwrdrvr/microapps-cdk.IMicroAppsS3`](#@pwrdrvr/microapps-cdk.IMicroAppsS3)

---

### MicroAppsProps <a name="@pwrdrvr/microapps-cdk.MicroAppsProps"></a>

Props for MicroApps.

#### Initializer <a name="[object Object].Initializer"></a>

```typescript
import { MicroAppsProps } from '@pwrdrvr/microapps-cdk'

const microAppsProps: MicroAppsProps = { ... }
```

##### `account`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.account"></a>

- *Type:* `string`

AWS Account ID that the stack is being deployed to, this is required for importing the R53 Zone.

---

##### `appEnv`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.appEnv"></a>

- *Type:* `string`
- *Default:* dev

Passed to NODE_ENV of Router and Deployer Lambda functions.

---

##### `assetNameRoot`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.assetNameRoot"></a>

- *Type:* `string`
- *Default:* microapps

Start of asset names.

---

##### `certEdge`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.certEdge"></a>

- *Type:* [`@aws-cdk/aws-certificatemanager.ICertificate`](#@aws-cdk/aws-certificatemanager.ICertificate)

Certificate in US-East-1 for the CloudFront distribution.

---

##### `certOrigin`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.certOrigin"></a>

- *Type:* [`@aws-cdk/aws-certificatemanager.ICertificate`](#@aws-cdk/aws-certificatemanager.ICertificate)

Certificate in deployed region for the API Gateway.

---

##### `domainName`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.domainName"></a>

- *Type:* `string`

Domain name of the zone for the edge host.

Example: 'pwrdrvr.com' for apps.pwrdrvr.com

---

##### `domainNameEdge`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.domainNameEdge"></a>

- *Type:* `string`

CNAME for the CloudFront distribution.

---

##### `domainNameOrigin`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.domainNameOrigin"></a>

- *Type:* `string`

CNAME for the API Gateway HTTPv2 API.

---

##### `r53ZoneID`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.r53ZoneID"></a>

- *Type:* `string`

ID of the zone in R53 to add records to.

---

##### `r53ZoneName`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.r53ZoneName"></a>

- *Type:* `string`

Name of the zone in R53 to add records to.

---

##### `region`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.region"></a>

- *Type:* `string`

AWS Region that the stack is being deployed to, this is required for importing the R53 Zone.

---

##### `assetNameSuffix`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.assetNameSuffix"></a>

- *Type:* `string`
- *Default:* none

Suffix to add to asset names, such as -[env]-pr-[prNum].

---

##### `autoDeleteEverything`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.autoDeleteEverything"></a>

- *Type:* `boolean`
- *Default:* false

Automatically destroy all assets when stack is deleted.

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

#### Initializer <a name="[object Object].Initializer"></a>

```typescript
import { MicroAppsS3Props } from '@pwrdrvr/microapps-cdk'

const microAppsS3Props: MicroAppsS3Props = { ... }
```

##### `assetNameRoot`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsS3Props.assetNameRoot"></a>

- *Type:* `string`

---

##### `assetNameSuffix`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsS3Props.assetNameSuffix"></a>

- *Type:* `string`

---

##### `reverseDomainName`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsS3Props.reverseDomainName"></a>

- *Type:* `string`

---

##### `autoDeleteEverything`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsS3Props.autoDeleteEverything"></a>

- *Type:* `boolean`
- *Default:* false

Duration before stack is automatically deleted.

Requires that autoDeleteEverything be set to true.

---

### MicroAppsSvcsStackProps <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcsStackProps"></a>

#### Initializer <a name="[object Object].Initializer"></a>

```typescript
import { MicroAppsSvcsStackProps } from '@pwrdrvr/microapps-cdk'

const microAppsSvcsStackProps: MicroAppsSvcsStackProps = { ... }
```

##### `account`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcsStackProps.account"></a>

- *Type:* `string`

---

##### `appEnv`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcsStackProps.appEnv"></a>

- *Type:* `string`

---

##### `assetNameRoot`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcsStackProps.assetNameRoot"></a>

- *Type:* `string`

---

##### `assetNameSuffix`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcsStackProps.assetNameSuffix"></a>

- *Type:* `string`

---

##### `autoDeleteEverything`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcsStackProps.autoDeleteEverything"></a>

- *Type:* `boolean`

---

##### `certOrigin`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcsStackProps.certOrigin"></a>

- *Type:* [`@aws-cdk/aws-certificatemanager.ICertificate`](#@aws-cdk/aws-certificatemanager.ICertificate)

---

##### `cfStackExports`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcsStackProps.cfStackExports"></a>

- *Type:* [`@pwrdrvr/microapps-cdk.IMicroAppsCF`](#@pwrdrvr/microapps-cdk.IMicroAppsCF)

---

##### `domainName`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcsStackProps.domainName"></a>

- *Type:* `string`

---

##### `domainNameEdge`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcsStackProps.domainNameEdge"></a>

- *Type:* `string`

---

##### `domainNameOrigin`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcsStackProps.domainNameOrigin"></a>

- *Type:* `string`

---

##### `r53ZoneID`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcsStackProps.r53ZoneID"></a>

- *Type:* `string`

---

##### `r53ZoneName`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcsStackProps.r53ZoneName"></a>

- *Type:* `string`

---

##### `region`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcsStackProps.region"></a>

- *Type:* `string`

---

##### `reverseDomainName`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcsStackProps.reverseDomainName"></a>

- *Type:* `string`

---

##### `s3Exports`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcsStackProps.s3Exports"></a>

- *Type:* [`@pwrdrvr/microapps-cdk.IMicroAppsS3`](#@pwrdrvr/microapps-cdk.IMicroAppsS3)

---

##### `s3PolicyBypassAROAs`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcsStackProps.s3PolicyBypassAROAs"></a>

- *Type:* `string`[]

---

##### `s3PolicyBypassPrincipalARNs`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcsStackProps.s3PolicyBypassPrincipalARNs"></a>

- *Type:* `string`[]

---

##### `s3StrictBucketPolicy`<sup>Optional</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsSvcsStackProps.s3StrictBucketPolicy"></a>

- *Type:* `boolean`

---


## Protocols <a name="Protocols"></a>

### IMicroApps <a name="@pwrdrvr/microapps-cdk.IMicroApps"></a>

- *Implemented By:* [`@pwrdrvr/microapps-cdk.MicroApps`](#@pwrdrvr/microapps-cdk.MicroApps), [`@pwrdrvr/microapps-cdk.IMicroApps`](#@pwrdrvr/microapps-cdk.IMicroApps)


#### Properties <a name="Properties"></a>

##### `cf`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.IMicroApps.cf"></a>

- *Type:* [`@pwrdrvr/microapps-cdk.IMicroAppsCF`](#@pwrdrvr/microapps-cdk.IMicroAppsCF)

---

##### `s3`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.IMicroApps.s3"></a>

- *Type:* [`@pwrdrvr/microapps-cdk.IMicroAppsS3`](#@pwrdrvr/microapps-cdk.IMicroAppsS3)

---

##### `svcs`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.IMicroApps.svcs"></a>

- *Type:* [`@pwrdrvr/microapps-cdk.IMicroAppsSvcs`](#@pwrdrvr/microapps-cdk.IMicroAppsSvcs)

---

### IMicroAppsCF <a name="@pwrdrvr/microapps-cdk.IMicroAppsCF"></a>

- *Implemented By:* [`@pwrdrvr/microapps-cdk.MicroAppsCF`](#@pwrdrvr/microapps-cdk.MicroAppsCF), [`@pwrdrvr/microapps-cdk.IMicroAppsCF`](#@pwrdrvr/microapps-cdk.IMicroAppsCF)


#### Properties <a name="Properties"></a>

##### `cloudFrontDistro`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.IMicroAppsCF.cloudFrontDistro"></a>

- *Type:* [`@aws-cdk/aws-cloudfront.Distribution`](#@aws-cdk/aws-cloudfront.Distribution)

---

### IMicroAppsS3 <a name="@pwrdrvr/microapps-cdk.IMicroAppsS3"></a>

- *Implemented By:* [`@pwrdrvr/microapps-cdk.MicroAppsS3`](#@pwrdrvr/microapps-cdk.MicroAppsS3), [`@pwrdrvr/microapps-cdk.IMicroAppsS3`](#@pwrdrvr/microapps-cdk.IMicroAppsS3)


#### Properties <a name="Properties"></a>

##### `bucketApps`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.IMicroAppsS3.bucketApps"></a>

- *Type:* [`@aws-cdk/aws-s3.IBucket`](#@aws-cdk/aws-s3.IBucket)

---

##### `bucketAppsName`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.IMicroAppsS3.bucketAppsName"></a>

- *Type:* `string`

---

##### `bucketAppsOAI`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.IMicroAppsS3.bucketAppsOAI"></a>

- *Type:* [`@aws-cdk/aws-cloudfront.OriginAccessIdentity`](#@aws-cdk/aws-cloudfront.OriginAccessIdentity)

---

##### `bucketAppsOrigin`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.IMicroAppsS3.bucketAppsOrigin"></a>

- *Type:* [`@aws-cdk/aws-cloudfront-origins.S3Origin`](#@aws-cdk/aws-cloudfront-origins.S3Origin)

---

##### `bucketAppsStaging`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.IMicroAppsS3.bucketAppsStaging"></a>

- *Type:* [`@aws-cdk/aws-s3.IBucket`](#@aws-cdk/aws-s3.IBucket)

---

##### `bucketAppsStagingName`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.IMicroAppsS3.bucketAppsStagingName"></a>

- *Type:* `string`

---

##### `bucketLogs`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.IMicroAppsS3.bucketLogs"></a>

- *Type:* [`@aws-cdk/aws-s3.IBucket`](#@aws-cdk/aws-s3.IBucket)

---

### IMicroAppsSvcs <a name="@pwrdrvr/microapps-cdk.IMicroAppsSvcs"></a>

- *Implemented By:* [`@pwrdrvr/microapps-cdk.MicroAppsSvcs`](#@pwrdrvr/microapps-cdk.MicroAppsSvcs), [`@pwrdrvr/microapps-cdk.IMicroAppsSvcs`](#@pwrdrvr/microapps-cdk.IMicroAppsSvcs)


#### Properties <a name="Properties"></a>

##### `dnAppsOrigin`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.IMicroAppsSvcs.dnAppsOrigin"></a>

- *Type:* [`@aws-cdk/aws-apigatewayv2.DomainName`](#@aws-cdk/aws-apigatewayv2.DomainName)

---

##### `table`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.IMicroAppsSvcs.table"></a>

- *Type:* [`@aws-cdk/aws-dynamodb.ITable`](#@aws-cdk/aws-dynamodb.ITable)

---

