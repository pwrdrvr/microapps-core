import { IDeployVersionRequestBase } from './deploy-version';

/**
 * Represents a Delete Version Request
 */
export interface IDeleteVersionRequest
  extends Pick<IDeployVersionRequestBase, 'appName' | 'semVer'> {
  readonly type: 'deleteVersion';

  /**
   * When true the Lambda is not cleaned up (as it resides in a child account)
   * but all other tasks are perfomed.
   *
   * @default false
   */
  readonly requestFromChildAccount?: boolean;
}
