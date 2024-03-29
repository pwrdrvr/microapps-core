import { url, ipaddress } from 'convict-format-with-validator';
import * as yaml from 'js-yaml';
import * as convict from 'ts-convict';
import { TSConvict } from 'ts-convict';
import { FilesExist } from '../lib/FilesExist';
import { Database, IDatabase } from './Database';

/**
 * Represents a Config
 */
export interface IConfig {
  readonly db: IDatabase;
  readonly rootPathPrefix: string;
}

/**
 * MicroApps Router Config
 */
@convict.Config({
  // optional default file to load, no errors if it doesn't exist
  file: 'config.yml', // relative to NODE_PATH or cwd()

  // optional parameter. Defaults to 'strict', can also be 'warn'
  validationMethod: 'strict',

  // optionally add parsers like yaml or toml
  parser: {
    extension: ['yml', 'yaml'],
    parse: yaml.load,
  },

  //optional extra formats to use in validation
  formats: {
    url,
    ipaddress,
  },
})
export class Config implements IConfig {
  public static configFiles(): string[] {
    const possibleFiles = [
      './configs/config.yaml',
      './configs/config.yml',
      `./configs/config-${Config.envLevel}.yaml`,
      `./configs/config-${Config.envLevel}.yml`,
    ];
    return FilesExist.getExistingFilesSync(possibleFiles);
  }

  private static _instance: IConfig;
  public static get instance(): IConfig {
    if (Config._instance === undefined) {
      const configLoader = new TSConvict<Config>(Config);
      Config._instance = configLoader.load(Config.configFiles());
    }
    return Config._instance;
  }

  public static get envLevel(): 'dev' | 'qa' | 'prod' | 'local' {
    const nodeEnv = process.env.NODE_ENV || 'dev';
    if (nodeEnv.startsWith('prod')) {
      return 'prod';
    } else if (nodeEnv === 'qa') {
      return 'qa';
    } else if (nodeEnv === 'local') {
      return 'local';
    }
    return 'dev';
  }

  // ts-convict will use the Typescript type if no format given
  // @convict.Property({
  //   doc: 'The name of the thing',
  //   default: 'Convict',
  //   env: 'MY_CONFIG_NAME',
  // })
  // public name!: string;

  @convict.Property(Database)
  public db!: IDatabase;

  @convict.Property({
    doc: 'Path prefix for this deployment',
    default: '',
    env: 'ROOT_PATH_PREFIX',
  })
  public rootPathPrefix!: string;
}
