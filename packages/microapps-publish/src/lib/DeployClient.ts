import * as lambda from '@aws-sdk/client-lambda';
import {
  IDeployVersionPreflightRequest,
  IDeployVersionPreflightResponse,
  ICreateApplicationRequest,
  IDeployerResponse,
  IDeployVersionRequest,
  IDeleteVersionRequest,
} from '@pwrdrvr/microapps-deployer-lib';
import { IConfig } from '../config/Config';

/**
 * Represents a Deploy Version Preflight Result
 */
export interface IDeployVersionPreflightResult {
  exists: boolean;
  response: IDeployVersionPreflightResponse;
}

export default class DeployClient {
  static readonly _client = new lambda.LambdaClient({
    maxAttempts: 8,
  });
  static readonly _decoder = new TextDecoder('utf-8');

  /**
   * Create an application
   * @param opts
   */
  public static async CreateApp(opts: { config: IConfig }): Promise<void> {
    const { config } = opts;
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

  /**
   * Delete version
   * @param config
   * @param output
   * @returns
   */
  public static async DeleteVersion(opts: {
    config: IConfig;
    output: (message: string) => void;
  }): Promise<IDeployerResponse> {
    const { config, output } = opts;

    const request = {
      type: 'deleteVersion',
      appName: config.app.name,
      semVer: config.app.semVer,
    } as IDeleteVersionRequest;
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
        output(`App/Version does not exist: ${config.app.name}/${config.app.semVer}`);
        return dResponse;
      } else {
        output(`App/Version deleted: ${config.app.name}/${config.app.semVer}`);
        return dResponse;
      }
    } else {
      throw new Error(`Lambda call to DeleteVersion failed: ${JSON.stringify(response)}`);
    }
  }

  /**
   * Check if version exists.
   * Optionally get S3 creds for static asset upload.
   * @param config
   * @param output
   * @returns
   */
  public static async DeployVersionPreflight(opts: {
    config: IConfig;
    needS3Creds?: boolean;
    overwrite: boolean;
    output: (message: string) => void;
  }): Promise<IDeployVersionPreflightResult> {
    const { config, needS3Creds = true, overwrite, output } = opts;

    const request = {
      type: 'deployVersionPreflight',
      appName: config.app.name,
      semVer: config.app.semVer,
      overwrite,
      needS3Creds,
    } as IDeployVersionPreflightRequest;
    const response = await this._client.send(
      new lambda.InvokeCommand({
        FunctionName: config.deployer.lambdaName,
        Payload: Buffer.from(JSON.stringify(request)),
      }),
    );

    if (response.$metadata.httpStatusCode === 200 && response.Payload !== undefined) {
      const dResponse = JSON.parse(
        Buffer.from(response.Payload).toString('utf-8'),
      ) as IDeployVersionPreflightResponse;
      if (dResponse.statusCode === 404) {
        output(`App/Version does not exist: ${config.app.name}/${config.app.semVer}`);
        return { exists: false, response: dResponse };
      } else {
        output(`App/Version exists: ${config.app.name}/${config.app.semVer}`);
        return { exists: true, response: dResponse };
      }
    } else {
      throw new Error(`Lambda call to DeployVersionPreflight failed: ${JSON.stringify(response)}`);
    }
  }

  /**
   * Copy S3 static assets from staging to live bucket.
   * Create API Gateway Integration for app (if needed).
   * Give API Gateway permission to call the Lambda.
   * Create API Gateway routes for this specific version.
   * @param config
   * @param task
   */
  public static async DeployVersion(opts: {
    config: IConfig;
    appType: 'lambda' | 'static' | 'lambda-url' | 'url';
    overwrite: boolean;
    output: (message: string) => void;
  }): Promise<void> {
    const { config, appType, overwrite, output } = opts;
    const request = {
      type: 'deployVersion',
      appType,
      appName: config.app.name,
      semVer: config.app.semVer,
      defaultFile: config.app.defaultFile,
      lambdaARN: ['lambda', 'lambda-url'].includes(appType) ? config.app.lambdaARN : undefined,
      overwrite,
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
        output(`Deploy succeeded: ${config.app.name}/${config.app.semVer}`);
      } else {
        output(`Deploy failed with: ${dResponse.statusCode}`);
        throw new Error(`Lambda call to DeployVersionfailed with: ${dResponse.statusCode}`);
      }
    } else {
      throw new Error(`Lambda call to DeployVersion failed: ${JSON.stringify(response)}`);
    }
  }
}
