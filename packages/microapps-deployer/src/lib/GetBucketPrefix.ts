import { IConfig } from '../config/Config';
import type { IDeployVersionRequestBase } from '@pwrdrvr/microapps-deployer-lib';
import { GetAppNameOrRootTrailingSlash } from './GetAppNameOrRootTrailingSlash';

/**
 * Get the prefix that the app version resources will be stored under
 *
 * @param request
 * @param config
 * @returns
 */
export function GetBucketPrefix(
  request: Pick<IDeployVersionRequestBase, 'appName' | 'semVer'>,
  config: IConfig,
): string {
  const pathPrefix = config.rootPathPrefix === '' ? '' : `${config.rootPathPrefix}/`;
  return `${pathPrefix}${GetAppNameOrRootTrailingSlash(request)}${request.semVer}`.toLowerCase();
}
