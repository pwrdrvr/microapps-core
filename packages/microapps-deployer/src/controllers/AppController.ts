import {
  Application,
  ApplicationAliasConflictError,
  InvalidApplicationAliasError,
  DBManager,
} from '@pwrdrvr/microapps-datalib';
import type { ICreateApplicationRequest, IDeployerResponse } from '@pwrdrvr/microapps-deployer-lib';

function isNil(arg: string | undefined | null) {
  if (arg === undefined || arg === null || arg === '') return true;
  return false;
}

export default class AppController {
  public static async CreateApp(opts: {
    dbManager: DBManager;
    app: ICreateApplicationRequest;
  }): Promise<IDeployerResponse> {
    const { dbManager, app } = opts;

    // TODO: Use a schema validator
    if (isNil(app.appName) || isNil(app.displayName) || isNil(app.type)) {
      return { statusCode: 400 };
    }

    const response = await Application.Load({ dbManager, key: { AppName: app.appName } });

    if (response !== undefined && app.extraAppNames === undefined) {
      // Existing clients leave application aliases unchanged.
      return { statusCode: 200 };
    }

    // Save info in DynamoDB - Status Pending
    try {
      const item =
        response ??
        new Application({
          AppName: app.appName,
          DisplayName: app.displayName,
        });
      if (app.extraAppNames !== undefined) item.ExtraAppNames = app.extraAppNames;
      await item.Save(dbManager);
      return { statusCode: response ? 200 : 201 };
    } catch (error) {
      if (error instanceof InvalidApplicationAliasError) {
        return { statusCode: 400, errorMessage: error.message };
      }
      if (error instanceof ApplicationAliasConflictError) {
        return { statusCode: 409, errorMessage: error.message };
      }
      throw error;
    }
  }
}
