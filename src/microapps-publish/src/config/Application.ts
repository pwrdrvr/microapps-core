import * as convict from 'ts-convict';
import * as yaml from 'js-yaml';
import { url, ipaddress } from 'convict-format-with-validator';

export interface IApplicationConfig {
  Name: string;
  SemVer: string;
  DefaultFile: string;
  StaticAssetsPath: string;
  LambdaName: string;
  LambdaARN: string;
  AWSAccountID: number;
  AWSRegion: string;
  ServerlessNextRouterPath: string;
}

@convict.Config({
  // optional default file to load, no errors if it doesn't exist
  file: './microapps.yml', // relative to NODE_PATH or cwd()

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
export class ApplicationConfig implements IApplicationConfig {
  private _name: string;
  public get Name(): string {
    return this._name;
  }
  @convict.Property({
    doc: 'Name of microapps app',
    default: 'microapps-my-app',
    env: 'APP_NAME',
  })
  public set Name(value: string) {
    this._name = value.toLowerCase();
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

  private _staticAssetsPath: string;
  @convict.Property({
    doc: 'Local path to static assets path to upload to S3',
    default: './static/',
    env: 'APP_STATIC_ASSETS_PATH',
  })
  public set StaticAssetsPath(value: string) {
    this._staticAssetsPath = value;
  }
  public get StaticAssetsPath(): string {
    return this._staticAssetsPath.replace(/\$SEMVER/, this.SemVer);
  }

  @convict.Property({
    doc: 'Local path to static assets path to upload to S3',
    default: 'microapps-my-app',
    env: 'APP_LAMBDA_NAME',
  })
  public LambdaName: string;
  public get LambdaARN(): string {
    return `arn:aws:lambda:${this.AWSRegion}:${this.AWSAccountID}:function:${
      this.LambdaName
    }:v${this.SemVer.replace(/\./g, '_')}`;
  }

  @convict.Property({
    doc: 'AWS Account ID to deploy to',
    default: 0,
    env: 'AWS_ACCOUNT_ID',
  })
  public AWSAccountID: number;

  @convict.Property({
    doc: 'AWS Region to deploy to',
    default: 'us-east-1',
    env: 'AWS_REGION',
  })
  public AWSRegion: string;

  @convict.Property({
    doc: 'Path to the serverless-nextjs-router index.js file',
    default: './node_modules/@pwrdrvr/serverless-nextjs-router/dist/index.js',
    env: 'SERVERLESS_NEXTJS_ROUTER_INDEX_JS',
  })
  public ServerlessNextRouterPath: string;
}
