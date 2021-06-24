import { Property } from 'ts-convict';

export interface IDeployer {
  tableName: string;
}

export class Deployer implements IDeployer {
  @Property({
    doc: 'DynamoDB Table Name',
    default: 'MicroApps',
    format: 'url',
    env: 'DATABASE_TABLE_NAME',
  })
  public tableName!: string;
}
