import type { IGetConfigRequest, IGetConfigResponse } from '@pwrdrvr/microapps-deployer-lib';
import { IConfig } from '../config/Config';

export default class ConfigController {
  public static GetConfig(opts: {
    request: IGetConfigRequest;
    config: IConfig;
  }): IGetConfigResponse {
    const { config, request } = opts;

    if (request.type !== 'getConfig') {
      throw new Error('Invalid request type');
    }

    // Return the list of origin request role ARNs
    return {
      statusCode: 200,
      type: 'getConfig',
      originRequestRoleARNs: Array.isArray(config.edgeToOriginRoleARN)
        ? (config.edgeToOriginRoleARN as string[])
        : config.edgeToOriginRoleARN
        ? [config.edgeToOriginRoleARN]
        : [],
    };
  }
}
