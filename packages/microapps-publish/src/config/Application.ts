import { url, ipaddress } from 'convict-format-with-validator';
import * as yaml from 'js-yaml';
import * as convict from 'ts-convict';

/**
 * Represents an Application Config
 */
export interface IApplicationConfig {
  name: string;
  semVer: string;
  defaultFile: string;
  staticAssetsPath: string;
  lambdaName: string;
  lambdaARN: string;
  awsAccountID: string;
  awsRegion: string;
  serverlessNextRouterPath: string;
  ecrHost: string;
  ecrRepoName: string;
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
  public get name(): string {
    return this._name;
  }
  @convict.Property({
    doc: 'Name of microapps app',
    default: '',
    env: 'APP_NAME',
  })
  public set name(value: string) {
    this._name = value.toLowerCase();
  }

  @convict.Property({
    doc: 'SemVer this version is to be published as',
    default: '0.0.1',
    env: 'APP_SEMVER',
  })
  public semVer: string;

  @convict.Property({
    doc: 'Default file to reference when loading the app with no version',
    default: '',
    env: 'APP_DEFAULT_FILE',
  })
  public defaultFile: string;

  private _staticAssetsPath: string;
  @convict.Property({
    doc: 'Local path to static assets path to upload to S3',
    default: '',
    env: 'APP_STATIC_ASSETS_PATH',
  })
  public set staticAssetsPath(value: string) {
    this._staticAssetsPath = value;
  }
  public get staticAssetsPath(): string {
    return this._staticAssetsPath.replace(/\$SEMVER/, this.semVer);
  }

  @convict.Property({
    doc: 'Name of the lambda to deploy to (not full ARN)',
    default: '',
    env: 'APP_LAMBDA_NAME',
  })
  public lambdaName: string;
  public get lambdaARN(): string {
    return this.lambdaName.includes(':')
      ? this.lambdaName
      : `arn:aws:lambda:${this.awsRegion}:${this.awsAccountID}:function:${
          this.lambdaName
        }:v${this.semVer.replace(/\./g, '_')}`;
  }

  @convict.Property({
    doc: 'AWS Account ID to deploy to',
    default: '',
    env: 'AWS_ACCOUNT_ID',
  })
  public awsAccountID: string;

  @convict.Property({
    doc: 'AWS Region to deploy to',
    default: 'us-east-1',
    env: 'AWS_REGION',
  })
  public awsRegion: string;

  @convict.Property({
    doc: 'Path to the serverless-nextjs-router index.js file',
    default: './node_modules/@pwrdrvr/serverless-nextjs-router/lib/index.js',
    env: 'SERVERLESS_NEXTJS_ROUTER_INDEX_JS',
  })
  public serverlessNextRouterPath: string;

  @convict.Property({
    doc: 'ECR Host for app',
    default: '',
    env: 'APP_ECR_HOST',
  })
  public ecrHost: string;

  @convict.Property({
    doc: 'ECR Repo Name for app',
    default: '',
    env: 'APP_ECR_REPO_NAME',
  })
  public ecrRepoName: string;
}
