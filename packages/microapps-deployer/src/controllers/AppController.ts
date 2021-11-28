import { Application, DBManager } from '@pwrdrvr/microapps-datalib';
import { ICreateApplicationRequest, IDeployerResponse } from '@pwrdrvr/microapps-deployer-lib';

export default class AppController {
  public static async CreateApp(opts: {
    dbManager: DBManager;
    app: ICreateApplicationRequest;
  }): Promise<IDeployerResponse> {
    const { dbManager, app } = opts;

    const response = await Application.Load({ dbManager, key: { AppName: app.appName } });

    if (response !== undefined) {
      // Indicate that record already existed
      return { statusCode: 200 };
    }

    // Save info in DynamoDB - Status Pending
    const item = new Application({
      AppName: app.appName,
      DisplayName: app.displayName,
    });
    await item.Save(dbManager);

    // Indicate that record was created
    return { statusCode: 201 };
  }
}
