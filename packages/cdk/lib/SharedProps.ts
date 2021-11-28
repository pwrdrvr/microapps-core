import * as cdk from '@aws-cdk/core';
import { Env } from './Types';

export class SharedProps {
  // input like 'example.com.' will return as 'com.example'
  private static reverseDomain(domain: string): string {
    let parts = domain.split('.').reverse();
    if (parts[0] === '') {
      parts = parts.slice(1);
    }
    return parts.join('.');
  }

  private _ttlBase = cdk.Duration.hours(6);
  public get ttlBase(): cdk.Duration {
    return this._ttlBase;
  }

  private _env: Env | '' = 'dev';
  public get env(): Env | '' {
    if (this._env === '' || this._env == undefined) return '';
    return this._env;
  }
  public get envSuffix(): string {
    if (this._env === '' || this._env == undefined) return '';
    return `-${this._env}`;
  }
  public get envDomainSuffix(): string {
    if (this._env === '' || this._env == undefined || this._env === 'prod') return '';
    return `-${this._env}`;
  }

  private _pr: string;
  public get pr(): string {
    return this._pr;
  }
  public get prSuffix(): string {
    if (this._pr === undefined) return '';
    return `-pr-${this._pr}`;
  }
  public get isPR(): boolean {
    if (this._pr === undefined) return false;
    return true;
  }

  private _stackName: string;
  public get stackName(): string {
    return this._stackName;
  }

  private _reverseDomainName;
  public get reverseDomainName(): string {
    return this._reverseDomainName;
  }

  private _domainName;
  public get domainName(): string {
    return this._domainName;
  }

  private _r53ZoneName;
  public get r53ZoneName(): string {
    return this._r53ZoneName;
  }

  private _r53ZoneID;
  public get r53ZoneID(): string {
    return this._r53ZoneID;
  }

  private _certIDEdge: string;
  public get certARNEdge(): string {
    // CloudFront cert is always us-east-1
    return `arn:aws:acm:us-east-1:${this._account}:certificate/${this._certIDEdge}`;
  }

  private _certIDOrigin: string;
  public get certARNOrigin(): string {
    return `arn:aws:acm:${this._region}:${this._account}:certificate/${this._certIDOrigin}`;
  }

  private _s3PolicyBypassRoleName;
  public get s3PolicyBypassRoleName(): string {
    return this._s3PolicyBypassRoleName;
  }

  private _s3PolicyBypassAROA;
  public get s3PolicyBypassAROA(): string {
    return this._s3PolicyBypassAROA;
  }

  private _account;
  public get account(): string {
    return this._account;
  }

  private _region;
  public get region(): string {
    return this._region;
  }

  constructor(scope: cdk.Construct) {
    this._r53ZoneName = scope.node.tryGetContext('@pwrdrvr/microapps:r53ZoneName');
    this._reverseDomainName = SharedProps.reverseDomain(this._r53ZoneName);
    this._domainName = SharedProps.reverseDomain(this._reverseDomainName);
    this._r53ZoneID = scope.node.tryGetContext('@pwrdrvr/microapps:r53ZoneID');
    this._certIDEdge = scope.node.tryGetContext('@pwrdrvr/microapps:certIDEdge');
    this._certIDOrigin = scope.node.tryGetContext('@pwrdrvr/microapps:certIDOrigin');
    this._s3PolicyBypassRoleName = scope.node.tryGetContext(
      '@pwrdrvr/microapps:s3PolicyBypassRoleName',
    );
    this._s3PolicyBypassAROA = scope.node.tryGetContext('@pwrdrvr/microapps:s3PolicyBypassAROA');
    this._account =
      scope.node.tryGetContext('@pwrdrvr/microapps:account') || process.env.CDK_DEFAULT_ACCOUNT;
    this._region =
      scope.node.tryGetContext('@pwrdrvr/microapps:region') || process.env.CDK_DEFAULT_REGION;
    this._stackName = scope.node.tryGetContext('@pwrdrvr/microapps:stackName') || 'microapps';

    // Determine if we have a PR number
    if (process.env.CODEBUILD_SOURCE_VERSION !== undefined) {
      const prPrefix = 'pr/';
      const sourceVersion = process.env.CODEBUILD_SOURCE_VERSION;
      const isPR = sourceVersion?.indexOf(prPrefix) === 0;
      if (isPR) {
        this._pr = sourceVersion?.slice(prPrefix.length) as string;
      }
    } else if (process.env.PR_NUMBER !== undefined && process.env.PR_NUMBER !== '') {
      this._pr = process.env.PR_NUMBER;
    }

    // Determine the env from NODE_ENV
    const env = process.env.NODE_ENV;
    if (env !== undefined && env !== '') {
      if (env.startsWith('prod')) {
        this._env = 'prod';
      } else if (env === 'qa') {
        this._env = 'qa';
      }
    }
  }
}