import { PhysicalName, RemovalPolicy } from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

/**
 * Properties to initialize an instance of `MicroAppsTable`.
 */
export interface MicroAppsTableProps {
  /**
   * RemovalPolicy override for child resources
   *
   * Note: if set to DESTROY the S3 buckes will have `autoDeleteObjects` set to `true`
   *
   * @default - per resource default
   */
  readonly removalPolicy?: RemovalPolicy;

  /**
   * Application environment, passed as `NODE_ENV`
   * to the Router and Deployer Lambda functions
   */
  readonly appEnv: string;

  /**
   * Optional asset name root
   *
   * @example microapps
   * @default - resource names auto assigned
   */
  readonly assetNameRoot?: string;

  /**
   * Optional asset name suffix
   *
   * @example -dev-pr-12
   * @default none
   */
  readonly assetNameSuffix?: string;

  /**
   * Path prefix on the root of the deployment
   *
   * @example dev/
   * @default none
   */
  readonly rootPathPrefix?: string;
}

/**
 * Represents a MicroAppsTable
 */
export interface IMicroAppsTable {
  /**
   * DynamoDB table used by Router, Deployer, and Release console app
   */
  readonly table: dynamodb.Table;
}

/**
 * Create a new MicroApps Table for apps / versions / rules
 *
 * @warning This construct is not intended for production use.
 * In a production stack the DynamoDB Table, API Gateway, S3 Buckets,
 * etc. should be created in a "durable" stack where the IDs will not
 * change and where changes to the MicroApps construct will not
 * cause failures to deploy or data to be deleted.
 */
export class MicroAppsTable extends Construct implements IMicroAppsTable {
  private _table: dynamodb.Table;
  public get table(): dynamodb.Table {
    return this._table;
  }

  constructor(scope: Construct, id: string, props?: MicroAppsTableProps) {
    super(scope, id);

    if (props === undefined) {
      throw new Error('props cannot be undefined');
    }

    const { removalPolicy, assetNameRoot, assetNameSuffix } = props;

    //
    // DynamoDB Table
    //
    this._table = new dynamodb.Table(this, 'table', {
      tableName: assetNameRoot
        ? `${assetNameRoot}${assetNameSuffix}`
        : PhysicalName.GENERATE_IF_NEEDED,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING,
      },
      removalPolicy,
    });
  }
}
