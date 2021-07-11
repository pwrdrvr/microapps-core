// eslint-disable-next-line import/no-extraneous-dependencies
import Manager, { Application } from '@pwrdrvr/microapps-datalib';
import { ICreateApplicationRequest, IDeployerResponse } from '../index';

export default class AppController {
  public static async CreateApp(app: ICreateApplicationRequest): Promise<IDeployerResponse> {
    const response = await Application.LoadAsync(Manager.DBDocClient, app.appName);

    if (response !== undefined) {
      // Indicate that record already existed
      return { statusCode: 200 };
    }

    // Save info in DynamoDB - Status Pending
    const item = new Application({
      AppName: app.appName,
      DisplayName: app.displayName,
    });
    await item.SaveAsync(Manager.DBDocClient);

    // Indicate that record was created
    return { statusCode: 201 };
  }
}
