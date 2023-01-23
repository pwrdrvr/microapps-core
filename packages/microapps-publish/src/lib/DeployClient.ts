import * as lambda from '@aws-sdk/client-lambda';
import type {
  ICreateApplicationRequest,
  IDeployerResponse,
  IDeployVersionPreflightRequest,
  IDeployVersionPreflightResponse,
  IDeployVersionRequest,
  IDeleteVersionRequest,
  ILambdaAliasRequest,
  ILambdaAliasResponse,
} from '@pwrdrvr/microapps-deployer-lib';
import { IConfig } from '../config/Config';

/**
 * Represents a Deploy Version Preflight Result
 */
export interface IDeployVersionPreflightResult {
  exists: boolean;
  response: IDeployVersionPreflightResponse;
}

export type DeployVersionArgs = Parameters<typeof DeployClient.DeployVersionLite>;

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
    const request: ICreateApplicationRequest = {
      type: 'createApp',
      appName: config.app.name,
      displayName: config.app.name,
    };
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

    const request: IDeleteVersionRequest = {
      type: 'deleteVersion',
      appName: config.app.name,
      semVer: config.app.semVer,
    };
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

    const request: IDeployVersionPreflightRequest = {
      type: 'deployVersionPreflight',
      appName: config.app.name,
      semVer: config.app.semVer,
      overwrite,
      needS3Creds,
    };
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
      if (dResponse.statusCode > 299) {
        // @ts-expect-error remove awsCredentials from response
        delete dResponse.awsCredentials;
        output(`DeployVersionPreflight failed: ${JSON.stringify(dResponse)}`);
        throw new Error('DeployVersionPreflight failed');
      } else if (dResponse.statusCode === 404) {
        output(`App/Version does not exist: ${config.app.name}/${config.app.semVer}`);
        return { exists: false, response: dResponse };
      } else {
        output(`App/Version exists: ${config.app.name}/${config.app.semVer}`);
        return { exists: true, response: dResponse };
      }
    } else {
      // @ts-expect-error remove awsCredentials from response
      delete dResponse.awsCredentials;
      throw new Error(`Lambda call to DeployVersionPreflight failed: ${JSON.stringify(response)}`);
    }
  }

  /**
   * Create or update Lambda alias for specified Lambda version
   * @param config
   * @param output
   * @returns
   */
  public static async LambdaAlias(opts: {
    appName: string;
    semVer: string;
    lambdaVersionArn: string;
    overwrite: boolean;
    deployerLambdaName: string;
    output: (message: string) => void;
  }): Promise<{ response: ILambdaAliasResponse }> {
    const { appName, deployerLambdaName, lambdaVersionArn, overwrite, output, semVer } = opts;

    const request: ILambdaAliasRequest = {
      type: 'lambdaAlias',
      appName,
      semVer,
      lambdaARN: lambdaVersionArn,
      overwrite,
    };
    output(`Creating alias for version ARN: ${lambdaVersionArn}`);
    const response = await this._client.send(
      new lambda.InvokeCommand({
        FunctionName: deployerLambdaName,
        Payload: Buffer.from(JSON.stringify(request)),
      }),
    );

    if (response.$metadata.httpStatusCode === 200 && response.Payload !== undefined) {
      const dResponse = JSON.parse(
        Buffer.from(response.Payload).toString('utf-8'),
      ) as ILambdaAliasResponse;
      if (dResponse.statusCode > 299) {
        output(`LambdaAlias failed: ${JSON.stringify(dResponse)}`);
        throw new Error('LambdaAlias failed');
      } else if (!dResponse.functionUrl) {
        output(`LambdaAlias failed to return functionUrl: ${JSON.stringify(dResponse)}`);
        throw new Error('LambdaAlias failed to return functionUrl');
      } else if (dResponse.statusCode === 201) {
        output(`Alias created: ${dResponse.lambdaAliasARN}`);
        return { response: dResponse };
      } else {
        output(`Alias ${dResponse.actionTaken}: ${dResponse.lambdaAliasARN}`);
        return { response: dResponse };
      }
    } else {
      throw new Error(`Lambda call to LambdaAlias failed: ${JSON.stringify(response)}`);
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
    appName: string;
    semVer: string;
    defaultFile?: string;
    lambdaAliasArn?: string;
    deployerLambdaName: string;
    appType: 'lambda' | 'static' | 'lambda-url' | 'url';
    startupType?: 'iframe' | 'direct';
    url?: string;
    overwrite: boolean;
    output: (message: string) => void;
  }): Promise<void> {
    const {
      appName,
      semVer,
      defaultFile,
      lambdaAliasArn,
      deployerLambdaName,
      appType,
      startupType = 'iframe',
      url,
      overwrite,
      output,
    } = opts;
    const request: IDeployVersionRequest = {
      type: 'deployVersion',
      appType,
      startupType,
      appName,
      semVer,
      defaultFile: defaultFile,
      url,
      overwrite,
      ...(['lambda', 'lambda-url'].includes(appType) ? { lambdaARN: lambdaAliasArn } : {}),
    };
    const response = await this._client.send(
      new lambda.InvokeCommand({
        FunctionName: deployerLambdaName,
        Payload: Buffer.from(JSON.stringify(request)),
      }),
    );

    if (response.$metadata.httpStatusCode === 200 && response.Payload !== undefined) {
      const dResponse = JSON.parse(
        Buffer.from(response.Payload).toString('utf-8'),
      ) as IDeployerResponse;
      if (dResponse.statusCode === 201) {
        output(`Deploy succeeded: ${appName}/${semVer}`);
      } else {
        output(`Deploy failed with: ${dResponse.statusCode}`);
        throw new Error(`Lambda call to DeployVersion failed with: ${dResponse.statusCode}`);
      }
    } else {
      throw new Error(`Lambda call to DeployVersion failed: ${JSON.stringify(response)}`);
    }
  }

  /**
   * Copy S3 static assets from staging to live bucket.
   * Create DB records.
   * Proxied to parent account if needed.
   *
   * @param config
   * @param task
   */
  public static async DeployVersionLite(opts: {
    appName: string;
    semVer: string;
    defaultFile?: string;
    lambdaAliasArn?: string;
    deployerLambdaName: string;
    appType: 'lambda' | 'static' | 'lambda-url' | 'url';
    startupType?: 'iframe' | 'direct';
    url?: string;
    overwrite: boolean;
    output: (message: string) => void;
  }): Promise<void> {
    const {
      appName,
      semVer,
      defaultFile,
      lambdaAliasArn,
      deployerLambdaName,
      appType,
      startupType = 'iframe',
      url,
      overwrite,
      output,
    } = opts;
    const request: IDeployVersionRequest = {
      type: 'deployVersionLite',
      appType,
      startupType,
      appName,
      semVer,
      defaultFile: defaultFile,
      url,
      overwrite,
      ...(['lambda', 'lambda-url'].includes(appType) ? { lambdaARN: lambdaAliasArn } : {}),
    };
    const response = await this._client.send(
      new lambda.InvokeCommand({
        FunctionName: deployerLambdaName,
        Payload: Buffer.from(JSON.stringify(request)),
      }),
    );

    if (response.$metadata.httpStatusCode === 200 && response.Payload !== undefined) {
      const dResponse = JSON.parse(
        Buffer.from(response.Payload).toString('utf-8'),
      ) as IDeployerResponse;
      if (dResponse.statusCode === 201) {
        output(`Deploy succeeded: ${appName}/${semVer}`);
      } else {
        output(`Deploy failed with: ${dResponse.statusCode}`);
        throw new Error(`Lambda call to DeployVersionLite failed with: ${dResponse.statusCode}`);
      }
    } else {
      throw new Error(`Lambda call to DeployVersionLite failed: ${JSON.stringify(response)}`);
    }
  }
}
