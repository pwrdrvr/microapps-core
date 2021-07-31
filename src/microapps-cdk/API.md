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

##### `s3PolicyBypassAROA`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.s3PolicyBypassAROA"></a>

- *Type:* `string`

AROA of the IAM Role to exclude from the DENY rules on the S3 Bucket Policy.

This allows sessions that assume the IAM Role to be excluded from the
DENY rules on the S3 Bucket Policy.

---

##### `s3PolicyBypassRoleName`<sup>Required</sup> <a name="@pwrdrvr/microapps-cdk.MicroAppsProps.s3PolicyBypassRoleName"></a>

- *Type:* `string`
- *Default:* AdminAccess

IAM Role name to exclude from the DENY rules on the S3 Bucket Policy.

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



