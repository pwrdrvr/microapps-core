# API Reference <a name="API Reference"></a>

## Constructs <a name="Constructs"></a>

### MicroApps <a name="@pwrdrvr/microapps-cdk.MicroApps"></a>

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





## Structs <a name="Structs"></a>

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



