import { IDeployVersionRequestBase } from './deploy-version';
import { IDeployerResponse } from './deployer';

/**
 * Represents a Get Version Request
 */
export interface IGetVersionRequest extends Pick<IDeployVersionRequestBase, 'appName' | 'semVer'> {
  readonly type: 'getVersion';
}

/**
 * Represents a Get Version Response
 */
export interface IGetVersionResponse extends IDeployerResponse {
  readonly type: 'getVersion';

  readonly version?: {
    readonly appName: string;
    readonly semVer: string;

    readonly type: 'lambda' | 'lambda-url' | 'url' | 'static';

    readonly lambdaArn?: string;
  };
}
