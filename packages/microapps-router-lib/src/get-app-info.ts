import { DBManager, Rules } from '@pwrdrvr/microapps-datalib';
import { AppVersionCache } from './app-cache';

/**
 * Determine if we have an appname or a catch all app
 */

export async function GetAppInfo(opts: {
  dbManager: DBManager;
  appName: string;
}): Promise<string | undefined> {
  const { dbManager, appName } = opts;

  let rules: Rules | undefined;

  const appVersionCache = AppVersionCache.GetInstance({ dbManager });

  // Check if we got a matching app name
  rules = await appVersionCache.GetRules({ key: { AppName: appName } });
  if (rules && rules.AppName === appName.toLowerCase()) {
    return appName;
  }

  // Check if we have a `[root]` app that is a catch all
  rules = await appVersionCache.GetRules({ key: { AppName: '[root]' } });
  if (rules && rules.AppName === '[root]') {
    return '[root]';
  }

  return undefined;
}
