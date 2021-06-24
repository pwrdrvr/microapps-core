import { Property } from 'ts-convict';

export interface IDatabase {
  tableName: string;
}

export class Database implements IDatabase {
  @Property({
    doc: 'DynamoDB Table Name',
    default: 'MicroApps',
    format: 'url',
    env: 'DATABASE_TABLE_NAME',
  })
  public tableName!: string;
}
