import * as convict from 'ts-convict';
import * as yaml from 'js-yaml';
import { url, ipaddress } from 'convict-format-with-validator';
import { FilesExist } from '../lib/FilesExist';
import { TSConvict } from 'ts-convict';

export interface IDeployConfig {
  AppName: string;
  SemVer: string;
  DefaultFile: string;
  StaticAssetsPath: string;
  LambdaARN: string;
  AWSAccountID: string;
  AWSRegion: string;
  ServerlessNextRouterPath: string;
}

@convict.Config({
  // optional default file to load, no errors if it doesn't exist
  file: 'microapps.yml', // relative to NODE_PATH or cwd()

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
export default class DeployConfig implements IDeployConfig {
  private static _instance: IDeployConfig;
  public static get instance(): IDeployConfig {
    if (DeployConfig._instance === undefined) {
      const configLoader = new TSConvict<DeployConfig>(DeployConfig);
      DeployConfig._instance = configLoader.load(DeployConfig.configFiles());
    }
    return DeployConfig._instance;
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
      './configs/config.yaml',
      './configs/config.yml',
      `./configs/config-${DeployConfig.envLevel}.yaml`,
      `./configs/config-${DeployConfig.envLevel}.yml`,
    ];
    return FilesExist.getExistingFilesSync(possibleFiles);
  }

  private _appName: string;
  public get AppName(): string {
    return this._appName;
  }
  @convict.Property({
    doc: 'Name microapps app',
    default: 'microapps-my-app',
    env: 'APP_NAME',
  })
  public set AppName(value: string) {
    this._appName = value.toLowerCase();
  }

  @convict.Property({
    doc: 'SemVer this version is to be published as',
    default: '0.0.1',
    env: 'APP_SEMVER',
  })
  public SemVer: string;

  @convict.Property({
    doc: 'Default file to reference when loading the app with no version',
    default: '',
    env: 'APP_DEFAULT_FILE',
  })
  public DefaultFile: string;

  public StaticAssetsPath: string;

  public LambdaARN: string;

  public AWSAccountID: string;
  public AWSRegion: string;

  @convict.Property({
    doc: 'Path to the serverless-nextjs-router index.js file',
    default: './node_modules/@pwrdrvr/serverless-nextjs-router/dist/index.js',
    env: 'SERVERLESS_NEXTJS_ROUTER_INDEX_JS',
  })
  public ServerlessNextRouterPath: string;
}
