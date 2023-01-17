import * as apigwy from '@aws-sdk/client-apigatewayv2';
import * as lambda from '@aws-sdk/client-lambda';
import * as s3 from '@aws-sdk/client-s3';
import { DBManager, Rules, Version } from '@pwrdrvr/microapps-datalib';
import pMap from 'p-map';
import { IConfig } from '../../config/Config';
import { IDeployVersionRequest, IDeployerResponse } from '@pwrdrvr/microapps-deployer-lib';
import Log from '../../lib/Log';
import { ExtractARNandAlias } from '../../lib/ExtractLambdaArn';
import { GetBucketPrefix } from '../../lib/GetBucketPrefix';

const lambdaClient = new lambda.LambdaClient({});
const s3Client = new s3.S3Client({
  maxAttempts: 16,
});
const apigwyClient = new apigwy.ApiGatewayV2Client({});

/**
 * Deploy a version of an app
 * - lambda (apigwy)
 *   - Create API Gateway Integration
 *   - Create API Gateway Route
 *   - Add API Gateway permissions to Lambda Alias
 *   - Copy S3 files from Staging bucket to Destination bucket
 * - lambda-url
 *   - Create Function URL on Alias
 *   - Add EdgeToOrigin function permisions to Lambda Alias
 *   - Copy S3 files from Staging bucket to Destination bucket
 * @param opts
 * @returns
 */
export async function DeployVersion(opts: {
  dbManager: DBManager;
  request: IDeployVersionRequest;
  config: IConfig;
}): Promise<IDeployerResponse> {
  const { dbManager, request, config } = opts;
  const { appType = 'lambda', overwrite = false, startupType = 'iframe' } = request;

  Log.Instance.debug('Got Body:', request);

  // Check if the version exists
  let record = await Version.LoadVersion({
    dbManager,
    key: { AppName: request.appName, SemVer: request.semVer },
  });
  if (record !== undefined && record.Status === 'routed') {
    if (!overwrite) {
      Log.Instance.info('Error: App/Version already exists', {
        appName: request.appName,
        semVer: request.semVer,
      });

      return { statusCode: 409 };
    } else {
      Log.Instance.info('Warning: App/Version already exists', {
        appName: request.appName,
        semVer: request.semVer,
      });
    }
  }

  // Check for incompatible app types and startup types
  if (startupType === 'direct' && ['lambda'].includes(appType)) {
    // 'lambda' (aka 'apigwy') cannot have direct routing because
    // we don't deploy a proxy to API Gateway on the /appName routes
    Log.Instance.info('Error: Incompatible app type and startup type', {
      appType,
      startupType,
    });

    return { statusCode: 400 };
  }

  // Update the version record if overwriting
  if (overwrite && record) {
    record.DefaultFile = request.defaultFile;
    record.Type = appType;
    record.StartupType = startupType;
    request.lambdaARN && (record.LambdaARN = request.lambdaARN);
  }

  // Create the version record
  if (record === undefined) {
    record = new Version({
      AppName: request.appName,
      SemVer: request.semVer,
      Type: appType,
      Status: 'pending',
      DefaultFile: request.defaultFile,
      StartupType: startupType,
      ...(request.lambdaARN ? { LambdaARN: request.lambdaARN } : {}),
    });

    // Save record with pending status
    await record.Save(dbManager);
  }

  // Only copy the files if not copied yet
  if ((overwrite || record.Status === 'pending') && appType !== 'url') {
    const { stagingBucket } = config.filestore;
    const sourcePrefix = GetBucketPrefix(request, config) + '/';

    // Example Source: s3://pwrdrvr-apps-staging/release/1.0.0/
    // Loop through all S3 source assets and copy to the destination
    await CopyToProdBucket(stagingBucket, sourcePrefix, GetBucketPrefix(request, config), config);

    // Set defaultFile again in-case this is an overwrite
    record.DefaultFile = request.defaultFile;

    // Update status to assets-copied
    record.Status = 'assets-copied';
    await record.Save(dbManager);
  }

  //
  // BEGIN: Type-specific handling
  //
  if (appType === 'lambda') {
    // TODO: Confirm the Lambda Function exists

    // Get the API Gateway
    const apiId = config.apigwy.apiId;

    if (overwrite || record.Status === 'assets-copied') {
      // Get the account ID and region for API Gateway to Lambda permissions
      const accountId = config.awsAccountID;
      const region = config.awsRegion;

      //
      // Confirm API Gateway is already allowed to execute this alias
      // from the specific route for this version
      //
      let addStatements = true;
      try {
        const existingPolicy = await lambdaClient.send(
          new lambda.GetPolicyCommand({
            FunctionName: request.lambdaARN,
          }),
        );
        if (existingPolicy.Policy !== undefined) {
          interface IPolicyDocument {
            Version: string;
            Id: string;
            Statement: { Sid: string }[];
          }
          const policyDoc = JSON.parse(existingPolicy.Policy) as IPolicyDocument;

          if (policyDoc.Statement !== undefined) {
            const foundStatements = policyDoc.Statement.filter(
              (value) =>
                value.Sid === 'microapps-version-root' || value.Sid === 'microapps-version',
            );
            if (foundStatements.length === 2) {
              addStatements = false;
            }
          }
        }
      } catch (error: any) {
        if (error.name !== 'ResourceNotFoundException') {
          throw error;
        }
      }

      // Add statements if they do not already exist
      if (addStatements) {
        await lambdaClient.send(
          new lambda.AddPermissionCommand({
            Principal: 'apigateway.amazonaws.com',
            StatementId: 'microapps-version-root',
            Action: 'lambda:InvokeFunction',
            FunctionName: request.lambdaARN,
            SourceArn: `arn:aws:execute-api:${region}:${accountId}:${apiId}/*/*/${request.appName}/${request.semVer}`,
          }),
        );
        await lambdaClient.send(
          new lambda.AddPermissionCommand({
            Principal: 'apigateway.amazonaws.com',
            StatementId: 'microapps-version',
            Action: 'lambda:InvokeFunction',
            FunctionName: request.lambdaARN,
            SourceArn: `arn:aws:execute-api:${region}:${accountId}:${apiId}/*/*/${request.appName}/${request.semVer}/{proxy+}`,
          }),
        );
      }
      record.Status = 'permissioned';
      await record.Save(dbManager);
    }

    // Add Integration pointing to Lambda Function Alias
    let integrationId = '';
    if (overwrite || record.Status === 'permissioned') {
      if (record.IntegrationID !== undefined && record.IntegrationID !== '') {
        // Skip the creation if the Integration was already created
        integrationId = record.IntegrationID;
        Log.Instance.info('integration already created, skipping creation', {
          IntegrationId: integrationId,
        });
      } else {
        try {
          const integration = await apigwyClient.send(
            new apigwy.CreateIntegrationCommand({
              ApiId: apiId,
              IntegrationType: apigwy.IntegrationType.AWS_PROXY,
              IntegrationMethod: 'POST',
              PayloadFormatVersion: '2.0',
              // For a Lambda function the IntegrationUri is the full
              // ARN of the Lambda function
              IntegrationUri: request.lambdaARN,
            }),
          );

          integrationId = integration.IntegrationId as string;
        } catch (error: any) {
          if (error.name === 'AccessDeniedException') {
            Log.Instance.error('AccessDeniedException adding integration to API Gateway', {
              error,
            });
            return { statusCode: 401 };
          }
        }

        // Save the created IntegrationID
        record.IntegrationID = integrationId;
        record.Status = 'integrated';
        await record.Save(dbManager);
      }
    }

    if (overwrite || record.Status === 'integrated') {
      if (record.RouteIDAppVersion !== undefined && record.RouteIDAppVersion !== '') {
        // Skip the creation if the Route was already created
        Log.Instance.info('route app/version already created, skipping creation', {
          IntegrationId: integrationId,
          RouteIDAppVersion: record.RouteIDAppVersion,
        });
      } else {
        // Add the routes to API Gateway for appName/version
        try {
          const result = await apigwyClient.send(
            new apigwy.CreateRouteCommand({
              ApiId: apiId,
              Target: `integrations/${integrationId}`,
              RouteKey: `ANY /${request.appName}/${request.semVer}`,
              AuthorizationType: config.requireIAMAuthorization
                ? apigwy.AuthorizationType.AWS_IAM
                : apigwy.AuthorizationType.NONE,
            }),
          );
          Log.Instance.info('created RouteIDAppVersion', { result });
          record.RouteIDAppVersion = `${result.RouteId}`;
        } catch (err: any) {
          if (err.name === 'AccessDeniedException') {
            Log.Instance.error('AccessDeniedException adding route to API Gateway', {
              error: err,
            });
            return { statusCode: 401 };
          }

          // Don't care
          Log.Instance.error('Caught unexpected error on app/ver route add');
          Log.Instance.error(err);
        }
      }
      // Add the route to API Gateway for appName/version/{proxy+}
      if (record.RouteIDAppVersionSplat !== undefined && record.RouteIDAppVersionSplat !== '') {
        // Skip the creation if the Route was already created
        Log.Instance.info('route app/version/* already created, skipping creation', {
          IntegrationId: integrationId,
          RouteIDAppVersionSplat: record.RouteIDAppVersionSplat,
        });
      } else {
        try {
          const result = await apigwyClient.send(
            new apigwy.CreateRouteCommand({
              ApiId: apiId,
              Target: `integrations/${integrationId}`,
              RouteKey: `ANY /${request.appName}/${request.semVer}/{proxy+}`,
              AuthorizationType: config.requireIAMAuthorization
                ? apigwy.AuthorizationType.AWS_IAM
                : apigwy.AuthorizationType.NONE,
            }),
          );
          Log.Instance.info('created RouteIDAppVersionSplat', { result });
          record.RouteIDAppVersionSplat = `${result.RouteId}`;
        } catch (err: any) {
          if (err.name === 'AccessDeniedException') {
            Log.Instance.error('AccessDeniedException adding route to API Gateway', {
              error: err,
            });
            return { statusCode: 401 };
          }

          // Don't care
          Log.Instance.error('Caught unexpected error on {proxy+} route add');
          Log.Instance.error(err);
        }
      }

      // Update the status - Final status
      record.Status = 'routed';
      await record.Save(dbManager);
    }
  } else if (appType === 'lambda-url') {
    if (!request.lambdaARN) {
      throw new Error('Missing lambdaARN for lambda-url app type');
    }

    // Get base of lambda arn
    const { lambdaARNBase, lambdaAlias } = ExtractARNandAlias(request.lambdaARN);

    if (overwrite || record.Status === 'assets-copied') {
      // Check if the lambda function has the microapp-managed tag
      const tags = await lambdaClient.send(
        new lambda.ListTagsCommand({
          Resource: lambdaARNBase,
        }),
      );
      // Add the tag if it is missing
      if (tags.Tags === undefined || tags.Tags['microapp-managed'] !== 'true') {
        await lambdaClient.send(
          new lambda.TagResourceCommand({
            Resource: lambdaARNBase,
            Tags: {
              'microapp-managed': 'true',
            },
          }),
        );
      }

      record.Status = 'permissioned';
      await record.Save(dbManager);
    }

    if (overwrite || record.Status === 'permissioned') {
      let url: string | undefined = undefined;
      let functionUrl: lambda.GetFunctionUrlConfigResponse | undefined = undefined;
      try {
        functionUrl = await lambdaClient.send(
          new lambda.GetFunctionUrlConfigCommand({
            FunctionName: lambdaARNBase,
            Qualifier: lambdaAlias,
          }),
        );
        // Create the FunctionUrl if it doesn't already exist
        if (functionUrl.FunctionUrl) {
          url = functionUrl.FunctionUrl;
        }
      } catch (error: any) {
        if (error.name !== 'ResourceNotFoundException') {
          throw error;
        }
      }

      // Create the FunctionUrl if it doesn't already exist
      if (!functionUrl?.FunctionUrl) {
        const functionUrlNew = await lambdaClient.send(
          new lambda.CreateFunctionUrlConfigCommand({
            FunctionName: lambdaARNBase,
            Qualifier: lambdaAlias,
            AuthType: 'AWS_IAM',
          }),
        );
        url = functionUrlNew.FunctionUrl;
      }

      // Update the status - Final status
      record.Status = 'routed';
      if (url) {
        record.URL = url;
      }
      await record.Save(dbManager);
    }
  } else if (appType === 'static') {
    // static app
    if (record.Status === 'assets-copied') {
      // Update the status - Final status
      record.Status = 'routed';
      await record.Save(dbManager);
    }
  } else if (appType === 'url') {
    if (!request.url) {
      throw new Error('Missing url for url app type');
    }

    // Update the status - Final status
    record.URL = request.url;
    record.Status = 'routed';
    await record.Save(dbManager);
  } else {
    throw new Error(`Unknown app type: ${appType}`);
  }

  // Check if there are any release rules
  // If no rules record, create one pointing to this version by default
  let rules = await Rules.Load({ dbManager, key: { AppName: request.appName } });
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
    await rules.Save(dbManager);
  }

  Log.Instance.info('finished request');

  return { statusCode: 201 };
}

/**
 * Copy a list of files from the Staging bucket to the Destination bucket
 * @param list
 * @param stagingBucket
 * @param sourcePrefix
 * @param destinationPrefix
 * @param config
 * @returns
 */
async function CopyFilesInList(
  list: s3.ListObjectsV2CommandOutput,
  stagingBucket: string,
  sourcePrefix: string,
  destinationPrefix: string,
  config: IConfig,
): Promise<void> {
  if (list === undefined || list.Contents === undefined) {
    return;
  }

  await pMap(
    list.Contents,
    async (obj) => {
      const sourceKeyRootless = obj.Key?.slice(sourcePrefix.length);

      // Copy from the Staging bucket to the Destination bucket
      await s3Client.send(
        new s3.CopyObjectCommand({
          // Source
          CopySource: `${stagingBucket}/${obj.Key}`,
          // Destination
          Bucket: config.filestore.destinationBucket,
          Key: `${destinationPrefix}/${sourceKeyRootless}`,
        }),
      );

      // Remove the file from the Staging bucket
      await s3Client.send(
        new s3.DeleteObjectCommand({
          Bucket: stagingBucket,
          Key: obj.Key,
        }),
      );
    },
    { concurrency: 4 },
  );
}

/**
 * List files in the Staging bucket and each chunk of the list
 * to the Destination bucket
 * @param stagingBucket
 * @param sourcePrefix
 * @param destinationPrefix
 * @param config
 */
async function CopyToProdBucket(
  stagingBucket: string,
  sourcePrefix: string,
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
        Bucket: stagingBucket,
        Prefix: sourcePrefix,
        ...optionals,
      }),
    );
    await CopyFilesInList(list, stagingBucket, sourcePrefix, destinationPrefix, config);
  } while (list.IsTruncated);
}
