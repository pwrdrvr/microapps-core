import * as convict from 'ts-convict';
import * as yaml from 'js-yaml';
import { url, ipaddress } from 'convict-format-with-validator';
import { FilesExist } from '../lib/FilesExist';
import { FileStoreConfig, IFileStoreRename } from './FileStore';
import { DeployerConfig, IDeployerConfig } from './Deployer';
import { ApplicationConfig, IApplicationConfig } from './Application';
import { TSConvict } from 'ts-convict';

export interface IConfig {
  deployer: IDeployerConfig;
  filestore: IFileStoreRename;
  app: IApplicationConfig;
}

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

  public static configFiles(): string[] {
    const possibleFiles = [
      './microapps.yaml',
      './microapps.yml',
      `./microapps-${Config.envLevel}.yaml`,
      `./microapps-${Config.envLevel}.yml`,
    ];
    return FilesExist.getExistingFilesSync(possibleFiles);
  }

  // ts-convict will use the Typescript type if no format given
  // @convict.Property({
  //   doc: 'The name of the thing',
  //   default: 'Convict',
  //   env: 'MY_CONFIG_NAME',
  // })
  // public name!: string;

  @convict.Property(ApplicationConfig)
  public app!: IApplicationConfig;

  @convict.Property(DeployerConfig)
  public deployer!: IDeployerConfig;

  @convict.Property(FileStoreConfig)
  public filestore!: IFileStoreRename;
}
