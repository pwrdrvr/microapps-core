import { IDeployVersionRequest, ICheckVersionExistsRequest, IDeployerResponse } from '../index';
import * as lambda from '@aws-sdk/client-lambda';
import * as s3 from '@aws-sdk/client-s3';
import * as apigwy from '@aws-sdk/client-apigatewayv2';
import GatewayInfo from '../lib/GatewayInfo';
import Manager, { Rules, Version } from '@pwrdrvr/microapps-datalib';
import { Config } from '../config/Config';
import Log from '../lib/Log';
import { URL } from 'url';

const lambdaClient = new lambda.LambdaClient({});
const s3Client = new s3.S3Client({});
const apigwyClient = new apigwy.ApiGatewayV2Client({});

export default class VersionController {
  static destinationBucket = Config.instance.filestore.destinationBucket;

  public static async CheckVersionExists({
    appName,
    semVer,
  }: ICheckVersionExistsRequest): Promise<IDeployerResponse> {
    // Check if the version exists
    const record = await Version.LoadVersionAsync(Manager.DBDocClient, appName, semVer);
    if (record !== undefined && record.Status !== 'pending') {
      Log.Instance.info('App/Version already exists', { appName, semVer });
      return { statusCode: 200 };
    } else {
      Log.Instance.info('App/Version does not exist', { appName, semVer });
      return { statusCode: 404 };
    }
  }

  public static async DeployVersion(request: IDeployVersionRequest): Promise<IDeployerResponse> {
    Log.Instance.debug(`Got Body:`, request);

    const destinationPrefix = `${request.appName}/${request.semVer}`.toLowerCase();

    // Check if the version exists
    let record = await Version.LoadVersionAsync(
      Manager.DBDocClient,
      request.appName,
      request.semVer,
    );
    if (record !== undefined && record.Status === 'routed') {
      Log.Instance.info('App/Version already exists', {
        appName: request.appName,
        semVer: request.semVer,
      });
      return { statusCode: 409 };
    }

    // Create the version record
    if (record === undefined) {
      record = new Version({
        AppName: request.appName,
        SemVer: request.semVer,
        IntegrationID: '',
        Type: 'lambda',
        Status: 'pending',
        DefaultFile: request.defaultFile,
      });

      // Save record with pending status
      await record.SaveAsync(Manager.DBDocClient);
    }

    // Only copy the files if not copied yet
    if (record.Status === 'pending') {
      // Parse the S3 Source URI
      const uri = new URL(request.s3SourceURI);

      const stagingBucket = uri.host;
      const sourcePrefix = uri.pathname.length >= 1 ? uri.pathname.slice(1) : '';

      // Example Source: s3://pwrdrvr-apps-staging/release/1.0.0/
      // Loop through all S3 source assets and copy to the destination
      await VersionController.CopyToProdBucket(stagingBucket, sourcePrefix, destinationPrefix);

      // Update status to assets-copied
      record.Status = 'assets-copied';
      await record.SaveAsync(Manager.DBDocClient);
    }

    // TODO: Confirm the Lambda Function exists

    // Get the API Gateway
    const api = await GatewayInfo.GetAPI(apigwyClient);

    if (record.Status === 'assets-copied') {
      // Get the account ID
      const lambdaArnParts = request.lambdaARN.split(':');
      const accountId = lambdaArnParts[4];
      const region = lambdaArnParts[3];

      // Ensure that the Lambda function allows API Gateway to invoke
      try {
        await lambdaClient.send(
          new lambda.RemovePermissionCommand({
            FunctionName: request.lambdaARN,
            StatementId: 'microapps-version-root',
          }),
        );
      } catch {
        // Don't care if this remove throws
      }
      try {
        await lambdaClient.send(
          new lambda.RemovePermissionCommand({
            FunctionName: request.lambdaARN,
            StatementId: 'microapps-version',
          }),
        );
      } catch {
        // Don't care if this remove throws
      }
      await lambdaClient.send(
        new lambda.AddPermissionCommand({
          Principal: 'apigateway.amazonaws.com',
          StatementId: 'microapps-version-root',
          Action: 'lambda:InvokeFunction',
          FunctionName: request.lambdaARN,
          SourceArn: `arn:aws:execute-api:${region}:${accountId}:${api?.ApiId}/*/*/${request.appName}/${request.semVer}`,
        }),
      );
      await lambdaClient.send(
        new lambda.AddPermissionCommand({
          Principal: 'apigateway.amazonaws.com',
          StatementId: 'microapps-version',
          Action: 'lambda:InvokeFunction',
          FunctionName: request.lambdaARN,
          SourceArn: `arn:aws:execute-api:${region}:${accountId}:${api?.ApiId}/*/*/${request.appName}/${request.semVer}/{proxy+}`,
        }),
      );
      record.Status = 'permissioned';
      await record.SaveAsync(Manager.DBDocClient);
    }

    // Add Integration pointing to Lambda Function Alias
    let integrationId = '';
    if (record.Status === 'permissioned') {
      if (record.IntegrationID !== undefined && record.IntegrationID !== '') {
        integrationId = record.IntegrationID;
      } else {
        const integration = await apigwyClient.send(
          new apigwy.CreateIntegrationCommand({
            ApiId: api?.ApiId,
            IntegrationType: apigwy.IntegrationType.AWS_PROXY,
            IntegrationMethod: 'POST',
            PayloadFormatVersion: '2.0',
            IntegrationUri: request.lambdaARN,
          }),
        );

        integrationId = integration.IntegrationId as string;

        // Save the created IntegrationID
        record.IntegrationID = integration.IntegrationId as string;
        record.Status = 'integrated';
        await record.SaveAsync(Manager.DBDocClient);
      }
    }

    if (record.Status === 'integrated') {
      // Add the routes to API Gateway for appName/version/{proxy+}
      try {
        await apigwyClient.send(
          new apigwy.CreateRouteCommand({
            ApiId: api?.ApiId,
            Target: `integrations/${integrationId}`,
            RouteKey: `ANY /${request.appName}/${request.semVer}`,
          }),
        );
      } catch (err) {
        // Don't care
        Log.Instance.error('Caught unexpected error on app/ver route add');
        Log.Instance.error(err);
      }
      try {
        await apigwyClient.send(
          new apigwy.CreateRouteCommand({
            ApiId: api?.ApiId,
            Target: `integrations/${integrationId}`,
            RouteKey: `ANY /${request.appName}/${request.semVer}/{proxy+}`,
          }),
        );
      } catch (err) {
        // Don't care
        Log.Instance.error('Caught unexpected error on {proxy+} route add');
        Log.Instance.error(err);
      }

      // Update the status - Final status
      record.Status = 'routed';
      await record.SaveAsync(Manager.DBDocClient);
    }

    // Check if there are any release rules
    // If no rules record, create one pointing to this version by default
    let rules = await Rules.LoadAsync(Manager.DBDocClient, request.appName);
    if (rules === undefined) {
      rules = new Rules({
        AppName: request.appName,
        RuleSet: {},
        Version: 1,
      });
      rules.RuleSet.default = {
        SemVer: request.semVer,
        AttributeName: '',
        AttributeValue: '',
      };
      await rules.SaveAsync(Manager.DBDocClient);
    }

    return { statusCode: 201 };
  }

  private static async CopyFilesInList(
    list: s3.ListObjectsV2CommandOutput,
    stagingBucket: string,
    sourcePrefix: string,
    destinationPrefix: string,
  ): Promise<void> {
    if (list === undefined || list.Contents === undefined) {
      return;
    }
    for (const obj of list.Contents) {
      const sourceKeyRootless = obj.Key?.slice(sourcePrefix.length);

      // TODO: Use p-map to parallelize with limit
      await s3Client.send(
        new s3.CopyObjectCommand({
          // Source
          CopySource: `${stagingBucket}/${obj.Key}`,
          // Destination
          Bucket: VersionController.destinationBucket,
          Key: `${destinationPrefix}/${sourceKeyRootless}`,
        }),
      );
    }
  }

  private static async CopyToProdBucket(
    stagingBucket: string,
    sourcePrefix: string,
    destinationPrefix: string,
  ) {
    let list: s3.ListObjectsV2CommandOutput | undefined;
    do {
      const optionals =
        list?.NextContinuationToken !== undefined
          ? {
              ContinuationToken: list.NextContinuationToken,
            }
          : ({} as s3.ListObjectsV2CommandInput);
      list = await s3Client.send(
        new s3.ListObjectsV2Command({
          Bucket: stagingBucket,
          Prefix: sourcePrefix,
          ...optionals,
        }),
      );
      await VersionController.CopyFilesInList(list, stagingBucket, sourcePrefix, destinationPrefix);
    } while (list.IsTruncated);
  }
}