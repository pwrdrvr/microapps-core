import { DBManager, Version } from '@pwrdrvr/microapps-datalib';
import { IConfig } from '../../config/Config';
import type { IGetVersionRequest, IGetVersionResponse } from '@pwrdrvr/microapps-deployer-lib';
import Log from '../../lib/Log';

/**
 * Get a version of an app
 * @param opts
 * @returns
 */
export async function GetVersion(opts: {
  dbManager: DBManager;
  request: IGetVersionRequest;
  config: IConfig;
}): Promise<IGetVersionResponse> {
  const { dbManager, request } = opts;

  Log.Instance.debug('Got Body:', request);

  // Check if the version exists
  const record = await Version.LoadVersion({
    dbManager,
    key: { AppName: request.appName, SemVer: request.semVer },
  });
  if (record === undefined) {
    Log.Instance.info('Error: App/Version does not exist', {
      appName: request.appName,
      semVer: request.semVer,
    });

    return { type: 'getVersion', statusCode: 404 };
  }

  return {
    type: 'getVersion',
    statusCode: 200,
    version: {
      appName: record.AppName,
      semVer: record.SemVer,
      type: record.Type,
      lambdaArn: record.LambdaARN,
    },
  };
}
