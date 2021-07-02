import * as cdk from '@aws-cdk/core';
import { Env } from './Types';

export default class SharedProps {
  private _ttlBase = cdk.Duration.minutes(20); //cdk.Duration.hours(6);
  private _ttlIncrementRepos = cdk.Duration.minutes(30);
  public get ttlBase(): cdk.Duration {
    return this._ttlBase;
  }
  public get ttlIncrementRepos(): cdk.Duration {
    return this._ttlIncrementRepos;
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

  private _stackName = 'microapps';
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

  private _certARNEdge;
  public get certARNEdge(): string {
    return this._certARNEdge;
  }

  private _certARNOrigin;
  public get certARNOrigin(): string {
    return this._certARNOrigin;
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
    this._certARNEdge = scope.node.tryGetContext('@pwrdrvr/microapps:certARNEdge');
    this._certARNOrigin = scope.node.tryGetContext('@pwrdrvr/microapps:certARNOrigin');
    this._s3PolicyBypassRoleName = scope.node.tryGetContext(
      '@pwrdrvr/microapps:s3PolicyBypassRoleName',
    );
    this._s3PolicyBypassAROA = scope.node.tryGetContext('@pwrdrvr/microapps:s3PolicyBypassAROA');
    this._account = scope.node.tryGetContext('@pwrdrvr/microapps:account');
    this._region = scope.node.tryGetContext('@pwrdrvr/microapps:region');

    // Determine if we have a PR number
    const prPrefix = 'pr/';
    const sourceVersion = process.env['CODEBUILD_SOURCE_VERSION'];
    const isPR = sourceVersion?.indexOf(prPrefix) === 0;
    if (isPR) {
      this._pr = sourceVersion?.slice(prPrefix.length) as string;
    }

    // Determine the env from NODE_ENV
    const env = process.env['NODE_ENV'];
    if (env !== undefined && env !== '') {
      if (env.startsWith('prod')) {
        this._env = 'prod';
      } else if (env === 'qa') {
        this._env = 'qa';
      }
    }
  }

  // input like 'example.com.' will return as 'com.example'
  private static reverseDomain(domain: string): string {
    let parts = domain.split('.').reverse();
    if (parts[0] === '') {
      parts = parts.slice(1);
    }
    return parts.join('.');
  }
}
