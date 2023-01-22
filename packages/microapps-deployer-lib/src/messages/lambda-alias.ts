// import { AppType } from './base';
import { IDeployVersionRequestBase } from './deploy-version';
import { IDeployerResponse } from './deployer';

/**
 * Represents a Lambda Alias Request
 */
export interface ILambdaAliasRequest extends IDeployVersionRequestBase {
  readonly type: 'lambdaAlias';

  /**
   * Type of the app (which implies how it's routed)
   */
  // readonly appType: Extract<AppType, 'lambda' | 'lambda-url'>;

  /**
   * LambdaARN
   * - With Alias suffix, used directly
   * - With Version suffix, Alias will be updated or created for semVer
   *
   * Used for `lambda` and `lambda-url` apps
   */
  readonly lambdaARN: string;
}

/**
 * Represents a Lambda Alias Response
 */
export interface ILambdaAliasResponse extends IDeployerResponse {
  readonly type: 'lambdaAlias';

  /**
   * Full ARN of the Lambda Alias for this version
   */
  readonly lambdaAliasARN: string;

  /**
   * Action taken by the deployer
   * - `created` - Alias was created
   * - `updated` - Alias was updated to point to a new version
   * - `verified` - Alias already points to the correct version
   */
  readonly actionTaken: 'created' | 'updated' | 'verified';

  /**
   * URL of the Lambda function version alias
   */
  readonly functionUrl?: string;
}
