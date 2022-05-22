import { url, ipaddress } from 'convict-format-with-validator';
import * as yaml from 'js-yaml';
import * as convict from 'ts-convict';
import { FilesExist } from '../lib/files-exist';

/**
 * Represents a Config
 */
export interface IConfig {
  readonly awsAccountID: number;
  readonly awsRegion: string;
  readonly originRegion: string;
  readonly signingMode: 'sign' | 'presign' | '';
  readonly addXForwardedHostHeader: boolean;
  readonly replaceHostHeader: boolean;
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
  public static configFiles(): string[] {
    const possibleFiles = [
      './config.yaml',
      './config.yml',
      './configs/config.yaml',
      './configs/config.yml',
      `./configs/config-${Config.envLevel}.yaml`,
      `./configs/config-${Config.envLevel}.yml`,
      './configs/config.json',
      `./configs/config-${Config.envLevel}.json`,
    ];
    return FilesExist.getExistingFilesSync(possibleFiles);
  }

  private static _instance: IConfig;
  public static get instance(): IConfig {
    if (Config._instance === undefined) {
      const configLoader = new convict.TSConvict<Config>(Config);
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

  @convict.Property({
    doc: 'AWS Account ID for app Lambda function',
    default: 0,
    env: 'AWS_ACCOUNT_ID',
  })
  public awsAccountID!: number;

  @convict.Property({
    doc: 'AWS Region for app Lambda function',
    default: 'us-east-1',
    env: 'AWS_REGION',
  })
  public awsRegion!: string;

  @convict.Property({
    doc: 'AWS Region where the origin API Gateway is located, used for signing requests',
    default: 'us-east-2',
    env: 'ORIGIN_REGION',
  })
  public originRegion!: string;

  @convict.Property({
    doc: `Signing mode
    - 'sign' - Sign API Gateway origin requests with SigV4 in headers
    - 'presign' - Sign API Gateway origin requsets with SigV4 in query params
    - undefined - Do not sign origin requests`,
    default: '',
    env: 'SIGNING_MODE',
  })
  public signingMode!: 'sign' | 'presign';

  @convict.Property({
    doc: 'Add X-Forwarded-Host header with value of Host header on the Edge',
    default: true,
    env: 'ADD_X_FORWARDED_HOST_HEADER',
  })
  public addXForwardedHostHeader!: boolean;

  @convict.Property({
    doc: `Set the Host header to the Origin host name
    This is useful when the OriginRequestPolicy is set to forward all headers
    API Gateway and Lambda Function URLs will both reject the request if the Host header is set
    to the Edge host name.`,
    default: true,
    env: 'REPLACE_HOST_HEADER',
  })
  public replaceHostHeader!: boolean;
}
