declare namespace config {
  export interface IConfig {
    name: string;
    subConfig: ISubConfig;
    db: IDatabase;
  }
  export interface ISubConfig {
    bar: number;
  }
  export interface IDatabase {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  }
}
