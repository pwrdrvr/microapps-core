import { manager, ICreateApplicationRequest } from '..';

export default class AppController {
  public static async CreateApp(app: ICreateApplicationRequest): Promise<void> {
    // Save info in DynamoDB - Status Pending
    await manager.CreateApp({
      AppName: app.appName,
      DisplayName: app.appName,
    });

    // TODO: Update DynamoDB status to indicate integration has been
    // created
  }
}
