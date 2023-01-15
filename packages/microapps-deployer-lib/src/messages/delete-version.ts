import { IDeployVersionRequestBase } from './deploy-version';

/**
 * Represents a Delete Version Request
 */
export interface IDeleteVersionRequest
  extends Pick<IDeployVersionRequestBase, 'appName' | 'semVer'> {
  readonly type: 'deleteVersion';
}
