import { IDeployerResponse, IDeployerRequest } from './deployer';

/**
 * Represents a Get Config Request
 */
export interface IGetConfigRequest extends IDeployerRequest {
  readonly type: 'getConfig';
}

/**
 * Represents a Get Config Response
 */
export interface IGetConfigResponse extends IDeployerResponse {
  readonly type: 'getConfig';

  /**
   * Origin Request Role ARNs that should be allowed to call
   * all application versions using IAM Auth.
   */
  readonly originRequestRoleARNs: string[];
}
