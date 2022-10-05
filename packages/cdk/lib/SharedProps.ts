import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
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

  private static stripTrailingDomainDot(domain: string): string {
    if (domain !== undefined && domain.endsWith('.')) {
      return domain.slice(0, domain.length - 1);
    }
    return domain;
  }

  private _ttlBase = Duration.hours(6);
  public get ttlBase(): Duration {
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

  private _domainName: string;
  public get domainName(): string {
    return this._domainName;
  }

  private _r53ZoneName: string;
  public get r53ZoneName(): string {
    return this._r53ZoneName;
  }

  private _r53ZoneID: string;
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

  private _s3PolicyBypassPrincipalARNs: string[];
  public get s3PolicyBypassPrincipalARNs(): string[] {
    return this._s3PolicyBypassPrincipalARNs;
  }

  private _s3PolicyBypassAROAs: string[];
  public get s3PolicyBypassAROAs(): string[] {
    return this._s3PolicyBypassAROAs;
  }

  private _s3StrictBucketPolicy: boolean;
  public get s3StrictBucketPolicy(): boolean {
    return this._s3StrictBucketPolicy;
  }

  private _account: string;
  public get account(): string {
    return this._account;
  }

  private _region: string;
  public get region(): string {
    return this._region;
  }

  private _deployDemoApp: boolean;
  public get deployDemoApp(): boolean {
    return this._deployDemoApp;
  }

  private _deployNextjsDemoApp: boolean;
  public get deployNextjsDemoApp(): boolean {
    return this._deployNextjsDemoApp;
  }

  private _deployReleaseApp: boolean;
  public get deployReleaseApp(): boolean {
    return this._deployReleaseApp;
  }

  private static stringToBoolOrUndefined(value: string | undefined): boolean | undefined {
    if (value === undefined) return undefined;
    if ((value + '').toLowerCase() === 'true') return true;
    return false;
  }

  constructor(scope: Construct) {
    this._r53ZoneName = scope.node.tryGetContext('@pwrdrvr/microapps:r53ZoneName');
    this._domainName = SharedProps.stripTrailingDomainDot(
      scope.node.tryGetContext('@pwrdrvr/microapps:r53ZoneName'),
    );
    this._r53ZoneID = scope.node.tryGetContext('@pwrdrvr/microapps:r53ZoneID');
    this._certIDEdge = scope.node.tryGetContext('@pwrdrvr/microapps:certIDEdge');
    this._certIDOrigin = scope.node.tryGetContext('@pwrdrvr/microapps:certIDOrigin');
    this._account =
      scope.node.tryGetContext('@pwrdrvr/microapps:account') ?? process.env.CDK_DEFAULT_ACCOUNT;
    this._region =
      scope.node.tryGetContext('@pwrdrvr/microapps:region') ?? process.env.CDK_DEFAULT_REGION;
    this._deployDemoApp =
      SharedProps.stringToBoolOrUndefined(
        scope.node.tryGetContext('@pwrdrvr/microapps:deployDemoApp'),
      ) ?? false;
    this._deployNextjsDemoApp =
      SharedProps.stringToBoolOrUndefined(
        scope.node.tryGetContext('@pwrdrvr/microapps:deployNexjsDemoApp'),
      ) ?? false;
    this._deployReleaseApp =
      SharedProps.stringToBoolOrUndefined(
        scope.node.tryGetContext('@pwrdrvr/microapps:deployReleaseApp'),
      ) ?? false;
    this._s3StrictBucketPolicy =
      SharedProps.stringToBoolOrUndefined(
        scope.node.tryGetContext('@pwrdrvr/microapps:s3StrictBucketPolicy'),
      ) ?? true;

    const s3PolicyBypassPrincipalARNsRaw =
      scope.node.tryGetContext('@pwrdrvr/microapps:s3PolicyBypassPrincipalARNs') ?? [];
    if (Array.isArray(s3PolicyBypassPrincipalARNsRaw)) {
      this._s3PolicyBypassPrincipalARNs = s3PolicyBypassPrincipalARNsRaw;
    } else {
      this._s3PolicyBypassPrincipalARNs = [s3PolicyBypassPrincipalARNsRaw];
    }

    const s3PolicyBypassAROAsRaw =
      scope.node.tryGetContext('@pwrdrvr/microapps:s3PolicyBypassAROAs') ?? [];
    if (Array.isArray(s3PolicyBypassAROAsRaw)) {
      this._s3PolicyBypassAROAs = s3PolicyBypassAROAsRaw;
    } else {
      this._s3PolicyBypassAROAs = [s3PolicyBypassAROAsRaw];
    }

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
