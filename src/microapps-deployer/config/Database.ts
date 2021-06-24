import { Property } from 'ts-convict';

export class Database implements config.IDatabase {
  @Property({
    doc: 'The database host',
    default: 'localhost',
    format: 'url',
    env: 'DATABASE_HOST',
  })
  public host!: string;

  @Property({
    doc: 'The database port',
    default: 5432,
    format: 'port',
    env: 'DATABASE_PORT',
  })
  public port!: number;

  @Property({
    doc: 'The database db',
    default: 'my_db',
    env: 'DATABASE_DB',
  })
  public database!: string;

  @Property({
    doc: 'The database user',
    default: 'magik',
    env: 'DATABASE_USER',
  })
  public user!: string;

  @Property({
    doc: 'The database pass',
    default: 'secretpassword',
    sensitive: true,
    env: 'DATABASE_PASS',
  })
  public password!: string;
}
