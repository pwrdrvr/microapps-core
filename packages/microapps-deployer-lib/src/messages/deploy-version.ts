import { AppStartupType, AppType, IRequestBase } from './base';

/**
 * Represents a Deploy Version Base Request
 */
export interface IDeployVersionRequestBase extends IRequestBase {
  /**
   * Name of the application
   */
  readonly appName: string;

  /**
   * SemVer being published
   */
  readonly semVer: string;

  /**
   * Allow overwrite of existing version
   *
   * @default false;
   */
  readonly overwrite?: boolean;
}

/**
 * Represents a Deploy Version Request
 */
export interface IDeployVersionRequest extends IDeployVersionRequestBase {
  readonly type: 'deployVersion';
  /**
   * Type of the app (which implies how it's routed)
   */
  readonly appType?: AppType;
  /**
   * Render the `/appName` route as an iframe pointing to `/appName/semVer`
   * or proxy directly to `/appName/semVer` and render the app at `/appName`
   *
   * @default 'iframe'
   */
  readonly startupType?: AppStartupType;
  /**
   * LambdaARN
   * - With Alias suffix, used directly
   * - With Version suffix, Alias will be updated or created for semVer
   *
   * Used for `lambda` and `lambda-url` apps
   */
  readonly lambdaARN?: string;
  /**
   * Default file or path
   * Typically used for `static` apps, but can be used for non-static apps
   */
  readonly defaultFile: string;
  /**
   * Used for `url` not for `lambda-url` (as the Function URL is created by the
   * DeployVersion action in that case)
   */
  readonly url?: string;
}
