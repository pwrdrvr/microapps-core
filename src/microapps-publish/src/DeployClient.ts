import * as lambda from '@aws-sdk/client-lambda';

import {
  ICheckVersionExistsRequest,
  ICreateApplicationRequest,
  IDeployerResponse,
  IDeployVersionRequest,
} from '@pwrdrvr/microapps-deployer';
import { IDeployConfig } from './deployConfig/DeployConfig';
import { Config } from './config/Config';

export default class DeployClient {
  static readonly _client = new lambda.LambdaClient({});
  static readonly _deployerFunctionName = Config.instance.deployer.lambdaName;
  static readonly _decoder = new TextDecoder('utf-8');

  public static async CreateApp(config: IDeployConfig): Promise<void> {
    const request = {
      type: 'createApp',
      appName: config.AppName,
      displayName: config.AppName,
    } as ICreateApplicationRequest;
    const response = await this._client.send(
      new lambda.InvokeCommand({
        FunctionName: this._deployerFunctionName,
        Payload: Buffer.from(JSON.stringify(request)),
      }),
    );

    if (response.$metadata.httpStatusCode === 200 && response.Payload !== undefined) {
      const dResponse = JSON.parse(
        Buffer.from(response.Payload).toString('utf-8'),
      ) as IDeployerResponse;
      if (!(dResponse.statusCode === 201 || dResponse.statusCode === 200)) {
        throw new Error(`App create failed: ${JSON.stringify(dResponse)}`);
      }
    } else {
      throw new Error(`App Create - Lambda Invoke Failed: ${JSON.stringify(response)}`);
    }
  }

  public static async CheckVersionExists(config: IDeployConfig): Promise<boolean> {
    const request = {
      type: 'checkVersionExists',
      appName: config.AppName,
      semVer: config.SemVer,
    } as ICheckVersionExistsRequest;
    const response = await this._client.send(
      new lambda.InvokeCommand({
        FunctionName: this._deployerFunctionName,
        Payload: Buffer.from(JSON.stringify(request)),
      }),
    );

    if (response.$metadata.httpStatusCode === 200 && response.Payload !== undefined) {
      const dResponse = JSON.parse(
        Buffer.from(response.Payload).toString('utf-8'),
      ) as IDeployerResponse;
      if (dResponse.statusCode === 404) {
        console.log(`App/Version do not exist: ${config.AppName}/${config.SemVer}`);
        return false;
      } else {
        return true;
      }
    } else {
      throw new Error(`Lambda call to CheckVersionExists failed: ${JSON.stringify(response)}`);
    }
  }

  public static async DeployVersion(config: IDeployConfig): Promise<void> {
    const request = {
      type: 'deployVersion',
      appName: config.AppName,
      semVer: config.SemVer,
      defaultFile: config.DefaultFile,
      lambdaARN: config.LambdaName,
      s3SourceURI: `s3://${Config.instance.filestore.stagingBucket}/${config.AppName}/${config.SemVer}/`,
    } as IDeployVersionRequest;
    const response = await this._client.send(
      new lambda.InvokeCommand({
        FunctionName: this._deployerFunctionName,
        Payload: Buffer.from(JSON.stringify(request)),
      }),
    );

    if (response.$metadata.httpStatusCode === 200 && response.Payload !== undefined) {
      const dResponse = JSON.parse(
        Buffer.from(response.Payload).toString('utf-8'),
      ) as IDeployerResponse;
      if (dResponse.statusCode === 201) {
        console.log(`Deploy succeeded: ${config.AppName}/${config.SemVer}`);
      } else {
        console.log(`Deploy failed with: ${dResponse.statusCode}`);
      }
    } else {
      throw new Error(`Lambda call to DeployVersion failed: ${JSON.stringify(response)}`);
    }
  }
}
