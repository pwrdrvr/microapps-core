import * as apigwy from '@aws-sdk/client-apigatewayv2';
import * as lambda from '@aws-sdk/client-lambda';
import * as s3 from '@aws-sdk/client-s3';
import { DBManager, Version } from '@pwrdrvr/microapps-datalib';
import { IConfig } from '../../config/Config';
import type { IDeleteVersionRequest, IDeployerResponse } from '@pwrdrvr/microapps-deployer-lib';
import Log from '../../lib/Log';
import { ExtractARNandAlias } from '../../lib/ExtractLambdaArn';
import { GetBucketPrefix } from '../../lib/GetBucketPrefix';

const lambdaClient = new lambda.LambdaClient({
  maxAttempts: 8,
});
const s3Client = new s3.S3Client({
  maxAttempts: 16,
});
const apigwyClient = new apigwy.ApiGatewayV2Client({
  maxAttempts: 8,
});

/**
 * Delete a version of an app
 * @param opts
 * @returns
 */
export async function DeleteVersion(opts: {
  dbManager: DBManager;
  request: IDeleteVersionRequest;
  config: IConfig;
}): Promise<IDeployerResponse> {
  const { dbManager, request, config } = opts;

  Log.Instance.debug('Got Body:', request);

  // Check if the version exists
  const record = await Version.LoadVersion({
    dbManager,
    key: { AppName: request.appName, SemVer: request.semVer },
  });
  if (record === undefined) {
    Log.Instance.info('Error: App/Version does not exist', {
      appName: request.appName,
      semVer: request.semVer,
    });

    return { statusCode: 404 };
  }

  // Delete files in destinationBucket
  const destinationPrefix = GetBucketPrefix(request, config) + '/';
  await DeleteFromDestinationBucket(destinationPrefix, config);

  if (record.Type === 'lambda') {
    // Get the API Gateway
    const apiId = config.apigwy.apiId;

    //
    // Remove the routes to API Gateway for appName/version/{proxy+}
    //
    if (record.RouteIDAppVersion === '' && record.RouteIDAppVersionSplat === '') {
      Log.Instance.warn('no RouteIDs to delete');
    } else {
      for (const routeId of [record.RouteIDAppVersion, record.RouteIDAppVersionSplat]) {
        try {
          await apigwyClient.send(
            new apigwy.DeleteRouteCommand({
              ApiId: apiId,
              RouteId: routeId,
            }),
          );
        } catch (err: any) {
          if (err.name === 'AccessDeniedException') {
            Log.Instance.error('AccessDeniedException removing route from API Gateway', {
              error: err,
              apiId,
              routeId,
            });
            return { statusCode: 401 };
          }

          // Don't care
          Log.Instance.error('Caught unexpected error on app/ver route remove', {
            error: err,
            apiId,
            routeId,
          });
        }
      }

      //
      // Remove Integration pointing to Lambda Function Alias
      //
      if (record.IntegrationID !== undefined && record.IntegrationID !== '') {
        try {
          await apigwyClient.send(
            new apigwy.DeleteIntegrationCommand({
              ApiId: apiId,
              IntegrationId: record.IntegrationID,
            }),
          );
        } catch (error: any) {
          if (error.name === 'AccessDeniedException') {
            Log.Instance.error('AccessDeniedException removing integration from API Gateway', {
              error,
              apiId,
              integrationId: record.IntegrationID,
            });
            return { statusCode: 401 };
          }

          Log.Instance.error('Caught unexpected error removing integration from API Gateway', {
            error: error,
            apiId,
            integrationId: record.IntegrationID,
          });
        }
      }
    }
  }

  if ((record.Type === 'lambda' || record.Type === 'lambda-url') && record.LambdaARN) {
    // Get base of lambda arn
    const { lambdaARNBase, lambdaAlias } = ExtractARNandAlias({
      lambdaARN: record.LambdaARN,
      config,
    });

    // Get info about the Alias
    try {
      // Get info about which Version the Alias is pointing to
      const aliasInfo = await lambdaClient.send(
        new lambda.GetAliasCommand({
          FunctionName: lambdaARNBase,
          Name: lambdaAlias,
        }),
      );

      // Remove the Alias from the Lambda Function
      await lambdaClient.send(
        new lambda.DeleteAliasCommand({
          FunctionName: lambdaARNBase,
          Name: lambdaAlias,
        }),
      );

      // Remove the Version from the Lambda Function
      if (aliasInfo.FunctionVersion) {
        try {
          await lambdaClient.send(
            new lambda.DeleteFunctionCommand({
              FunctionName: lambdaARNBase,
              Qualifier: aliasInfo.FunctionVersion,
            }),
          );
        } catch (error: any) {
          if (error.name !== 'ResourceConflictException') {
            throw error;
          }

          Log.Instance.info('Version is still in use by another alias, not deleting');
        }
      }
    } catch (error: any) {
      // It's ok if the Alias or Version is already gone
      if (error.name !== 'ResourceNotFoundException') {
        throw error;
      }
    }
  }

  // Delete DynamoDB record
  await Version.DeleteVersion({
    dbManager,
    key: { AppName: request.appName, SemVer: request.semVer },
  });

  Log.Instance.info('finished request');

  return { statusCode: 200 };
}

/**
 * List files in the Destination bucket and each chunk of the list
 * to the Destination bucket
 * @param sourcePrefix
 * @param destinationPrefix
 * @param config
 */
async function DeleteFromDestinationBucket(
  destinationPrefix: string,
  config: IConfig,
): Promise<void> {
  let list: s3.ListObjectsV2CommandOutput | undefined;
  do {
    const optionals =
      list?.NextContinuationToken !== undefined
        ? { ContinuationToken: list.NextContinuationToken }
        : ({} as s3.ListObjectsV2CommandInput);
    list = await s3Client.send(
      new s3.ListObjectsV2Command({
        Bucket: config.filestore.destinationBucket,
        Prefix: destinationPrefix,
        ...optionals,
      }),
    );

    const objectIds: s3.ObjectIdentifier[] = [];
    list.Contents?.map((item) => {
      objectIds.push({ Key: item.Key });
    });

    if (objectIds.length > 0) {
      // Remove the files from the Destination bucket
      await s3Client.send(
        new s3.DeleteObjectsCommand({
          Bucket: config.filestore.destinationBucket,
          Delete: {
            Objects: objectIds,
          },
        }),
      );
    }
  } while (list.IsTruncated);
}
