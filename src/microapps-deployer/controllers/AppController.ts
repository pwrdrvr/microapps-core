import { Application } from '@pwrdrvr/microapps-datalib';
import { manager, ICreateApplicationRequest, IDeployerResponse } from '../index';

export default class AppController {
  public static async CreateApp(app: ICreateApplicationRequest): Promise<IDeployerResponse> {
    // Save info in DynamoDB - Status Pending
    const item = new Application({
      AppName: app.appName,
      DisplayName: app.appName,
    });
    await item.SaveAsync(manager.DBDocClient);

    // TODO: Update DynamoDB status to indicate integration has been
    // created
    return { statusCode: 200 };
  }
}
