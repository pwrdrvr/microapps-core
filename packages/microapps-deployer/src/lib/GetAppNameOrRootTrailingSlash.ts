import type { IDeployVersionRequestBase } from '@pwrdrvr/microapps-deployer-lib';

export function GetAppNameOrRootTrailingSlash(
  request: Pick<IDeployVersionRequestBase, 'appName'>,
): string {
  const isRootApp = request.appName === '[root]';
  return isRootApp ? '' : `${request.appName}/`;
}
