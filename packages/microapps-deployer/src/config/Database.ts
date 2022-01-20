import { Property } from 'ts-convict';

/**
 * Represents a Database Config
 */
export interface IDatabase {
  tableName: string;
}

export class Database implements IDatabase {
  @Property({
    doc: 'DynamoDB Table Name',
    default: 'MicroApps',
    env: 'DATABASE_TABLE_NAME',
  })
  public tableName!: string;
}
