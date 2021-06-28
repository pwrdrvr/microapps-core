import * as lambda from '@aws-sdk/client-lambda';

import {
  ICheckVersionExistsRequest,
  ICreateApplicationRequest,
  IDeployerResponse,
  IDeployVersionRequest,
} from '@pwrdrvr/microapps-deployer';
import { IConfig } from './config/Config';

export default class DeployClient {
  static readonly _client = new lambda.LambdaClient({});
  static readonly _decoder = new TextDecoder('utf-8');

  public static async CreateApp(config: IConfig): Promise<void> {
    const request = {
      type: 'createApp',
      appName: config.app.name,
      displayName: config.app.name,
    } as ICreateApplicationRequest;
    const response = await this._client.send(
      new lambda.InvokeCommand({
        FunctionName: config.deployer.lambdaName,
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

  public static async CheckVersionExists(config: IConfig): Promise<boolean> {
    const request = {
      type: 'checkVersionExists',
      appName: config.app.name,
      semVer: config.app.semVer,
    } as ICheckVersionExistsRequest;
    const response = await this._client.send(
      new lambda.InvokeCommand({
        FunctionName: config.deployer.lambdaName,
        Payload: Buffer.from(JSON.stringify(request)),
      }),
    );

    if (response.$metadata.httpStatusCode === 200 && response.Payload !== undefined) {
      const dResponse = JSON.parse(
        Buffer.from(response.Payload).toString('utf-8'),
      ) as IDeployerResponse;
      if (dResponse.statusCode === 404) {
        console.log(`App/Version do not exist: ${config.app.name}/${config.app.semVer}`);
        return false;
      } else {
        return true;
      }
    } else {
      throw new Error(`Lambda call to CheckVersionExists failed: ${JSON.stringify(response)}`);
    }
  }

  public static async DeployVersion(config: IConfig): Promise<void> {
    const request = {
      type: 'deployVersion',
      appName: config.app.name,
      semVer: config.app.semVer,
      defaultFile: config.app.defaultFile,
      lambdaARN: config.app.lambdaARN,
      s3SourceURI: `s3://${config.filestore.stagingBucket}/${config.app.name}/${config.app.semVer}/`,
    } as IDeployVersionRequest;
    const response = await this._client.send(
      new lambda.InvokeCommand({
        FunctionName: config.deployer.lambdaName,
        Payload: Buffer.from(JSON.stringify(request)),
      }),
    );

    if (response.$metadata.httpStatusCode === 200 && response.Payload !== undefined) {
      const dResponse = JSON.parse(
        Buffer.from(response.Payload).toString('utf-8'),
      ) as IDeployerResponse;
      if (dResponse.statusCode === 201) {
        console.log(`Deploy succeeded: ${config.app.name}/${config.app.semVer}`);
      } else {
        console.log(`Deploy failed with: ${dResponse.statusCode}`);
      }
    } else {
      throw new Error(`Lambda call to DeployVersion failed: ${JSON.stringify(response)}`);
    }
  }
}
