import * as convict from 'ts-convict';
import { SubConfig } from './SubConfig';
import { Database } from './Database';
import * as yaml from 'js-yaml';
import { url, ipaddress } from 'convict-format-with-validator';
import { FilesExist } from '../lib/FilesExist';

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
export class Config implements config.IConfig {
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
      'config.yaml',
      'config.yml',
      `config-${Config.envLevel}.yaml`,
      `config-${Config.envLevel}.yml`,
    ];
    return FilesExist.getExistingFilesSync(possibleFiles);
  }

  // ts-convict will use the Typescript type if no format given
  // ts-convict will use the Typescript type if no format given
  @convict.Property({
    doc: 'The name of the thing',
    default: 'Convict',
    env: 'MY_CONFIG_NAME',
  })
  public name!: string;

  @convict.Property(SubConfig)
  public subConfig!: config.ISubConfig;

  @convict.Property(Database)
  public db!: config.IDatabase;
}
