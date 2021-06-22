import { Env } from './Types';

export default class SharedProps {
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

  constructor() {
    // TODO: Set some values using env vars

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
}
