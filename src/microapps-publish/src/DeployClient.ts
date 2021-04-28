import * as lambda from '@aws-sdk/client-lambda';

import {
  CheckVersionExistsRequest,
  CreateApplicationRequest,
  DeployVersionRequest,
} from '@pwrdrvr/microapps-deployer';
import DeployConfig from './DeployConfig';

export default class DeployClient {
  static readonly _client: lambda.LambdaClient;
  static readonly _deployerFunctionName = 'TODO';

  public static async CreateApp(config: DeployConfig): Promise<void> {
    const request = {
      type: 'createApp',
      appName: config.AppName,
    } as CreateApplicationRequest;
    const response = await this._client.send(
      new lambda.InvokeCommand({
        FunctionName: this._deployerFunctionName,
        Payload: Buffer.from(JSON.stringify(request)),
      }),
    );

    if (response.StatusCode !== 200) {
      throw new Error('App create failed');
    }
  }

  public static async CheckVersionExists(config: DeployConfig): Promise<boolean> {
    const request = {
      type: 'checkVersionExists',
      appName: config.AppName,
      semVer: config.SemVer,
    } as CheckVersionExistsRequest;
    const response = await this._client.send(
      new lambda.InvokeCommand({
        FunctionName: this._deployerFunctionName,
        Payload: Buffer.from(JSON.stringify(request)),
      }),
    );

    if (response.StatusCode === 200) {
      return true;
    } else {
      return false;
    }
  }

  public static async DeployVersion(config: DeployConfig): Promise<void> {
    const request = {
      type: 'deployVersion',
      appName: config.AppName,
      semVer: config.SemVer,
      defaultFile: config.DefaultFile,
      lambdaARN: config.LambdaARN,
      s3SourceURI: `s3://pwrdrvr-apps-staging/${config.AppName}/${config.SemVer}/`,
    } as DeployVersionRequest;
    const response = await this._client.send(
      new lambda.InvokeCommand({
        FunctionName: this._deployerFunctionName,
        Payload: Buffer.from(JSON.stringify(request)),
      }),
    );

    if (response.StatusCode !== 200) {
      throw new Error('Failed to deploy version');
    }
  }
}
