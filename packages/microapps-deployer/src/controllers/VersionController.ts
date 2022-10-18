import crypto from 'crypto';
import * as iamCDK from '@aws-cdk/aws-iam';
import * as apigwy from '@aws-sdk/client-apigatewayv2';
import * as lambda from '@aws-sdk/client-lambda';
import * as s3 from '@aws-sdk/client-s3';
import * as sts from '@aws-sdk/client-sts';
import { DBManager, Rules, Version } from '@pwrdrvr/microapps-datalib';
import pMap from 'p-map';
import { IConfig } from '../config/Config';
import {
  IDeleteVersionRequest,
  IDeployVersionRequest,
  IDeployVersionPreflightRequest,
  IDeployerResponse,
  IDeployVersionPreflightResponse,
  IDeployVersionRequestBase,
} from '@pwrdrvr/microapps-deployer-lib';
import Log from '../lib/Log';

const lambdaClient = new lambda.LambdaClient({
  maxAttempts: 8,
});
const s3Client = new s3.S3Client({
  maxAttempts: 16,
});
const stsClient = new sts.STSClient({
  maxAttempts: 8,
});
const apigwyClient = new apigwy.ApiGatewayV2Client({
  maxAttempts: 8,
});

export default class VersionController {
  /**
   * Return temp S3 IAM credentials for static asset uploads
   * when a version does not exist.
   * @param opts
   * @returns
   */
  public static async DeployVersionPreflight(opts: {
    dbManager: DBManager;
    request: IDeployVersionPreflightRequest;
    config: IConfig;
  }): Promise<IDeployVersionPreflightResponse> {
    const { dbManager, request, config } = opts;
    const { appName, semVer, needS3Creds = true, overwrite = false } = request;

    // Check if the version exists
    const record = await Version.LoadVersion({
      dbManager,
      key: { AppName: appName, SemVer: semVer },
    });
    if (record !== undefined && record.Status !== 'pending') {
      if (!overwrite) {
        //
        // Version exists and has moved beyond pending status
        // No need to create S3 upload credentials
        // NOTE: This may change in the future if we allow
        // mutability of versions (at own risk)
        //
        Log.Instance.info('Error: App/Version already exists', {
          appName: request.appName,
          semVer: request.semVer,
        });

        return { statusCode: 200 };
      } else {
        Log.Instance.info('Warning: App/Version already exists', {
          appName: request.appName,
          semVer: request.semVer,
        });
      }
    }

    //
    // Version does not exist
    // Create S3 temp credentials for the static assets upload
    //

    Log.Instance.info('App/Version does not exist', { appName, semVer });

    // Get S3 creds if requested
    if (needS3Creds) {
      // Generate a temp policy for staging bucket app prefix
      const iamPolicyDoc = new iamCDK.PolicyDocument({
        statements: [
          new iamCDK.PolicyStatement({
            effect: iamCDK.Effect.ALLOW,
            actions: ['s3:PutObject', 's3:GetObject', 's3:AbortMultipartUpload'],
            resources: [`arn:aws:s3:::${config.filestore.stagingBucket}/*`],
          }),
          new iamCDK.PolicyStatement({
            effect: iamCDK.Effect.ALLOW,
            actions: ['s3:ListBucket'],
            resources: [`arn:aws:s3:::${config.filestore.stagingBucket}`],
          }),
        ],
      });

      Log.Instance.debug('Temp IAM Policy', { policy: JSON.stringify(iamPolicyDoc.toJSON()) });

      // Assume the upload role with limited S3 permissions
      const stsResult = await stsClient.send(
        new sts.AssumeRoleCommand({
          RoleArn: `arn:aws:iam::${config.awsAccountID}:role/${config.uploadRoleName}`,
          DurationSeconds: 60 * 60,
          RoleSessionName: VersionController.SHA1Hash(
            VersionController.GetBucketPrefix(request, config),
          ),
          Policy: JSON.stringify(iamPolicyDoc.toJSON()),
        }),
      );

      Log.Instance.info('finished request - returning s3 creds');

      return {
        statusCode: 404,
        s3UploadUrl: `s3://${config.filestore.stagingBucket}/${VersionController.GetBucketPrefix(
          request,
          config,
        )}`,

        awsCredentials: {
          accessKeyId: stsResult.Credentials?.AccessKeyId as string,
          secretAccessKey: stsResult.Credentials?.SecretAccessKey as string,
          sessionToken: stsResult.Credentials?.SessionToken as string,
        },
      };
    } else {
      Log.Instance.info('finished request - not returning s3 creds');

      return {
        statusCode: 404,
      };
    }
  }

  /**
   * Deploy a version route to API Gateway
   * @param opts
   * @returns
   */
  public static async DeployVersion(opts: {
    dbManager: DBManager;
    request: IDeployVersionRequest;
    config: IConfig;
  }): Promise<IDeployerResponse> {
    const { dbManager, request, config } = opts;
    const { overwrite = false } = request;

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

    const { appType = 'lambda' } = request;

    // Create the version record
    if (record === undefined) {
      record = new Version({
        AppName: request.appName,
        SemVer: request.semVer,
        IntegrationID: '',
        Type: appType,
        Status: 'pending',
        DefaultFile: request.defaultFile,
      });

      // Save record with pending status
      await record.Save(dbManager);
    }
    // Only copy the files if not copied yet
    if (overwrite || record.Status === 'pending') {
      const { stagingBucket } = config.filestore;
      const sourcePrefix = VersionController.GetBucketPrefix(request, config) + '/';

      // Example Source: s3://pwrdrvr-apps-staging/release/1.0.0/
      // Loop through all S3 source assets and copy to the destination
      await VersionController.CopyToProdBucket(
        stagingBucket,
        sourcePrefix,
        VersionController.GetBucketPrefix(request, config),
        config,
      );

      // Set defaultFile again in-case this is an overwrite
      record.DefaultFile = request.defaultFile;

      // Update status to assets-copied
      record.Status = 'assets-copied';
      await record.Save(dbManager);
    }

    //
    // BEGING: Type-specific handling
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
      if (overwrite || record.Status === 'assets-copied') {
        // Check if the lambda function has the microapp-managed tag
        const tags = await lambdaClient.send(
          new lambda.ListTagsCommand({
            Resource: request.lambdaARN,
          }),
        );
        // Add the tag if it is missing
        if (tags.Tags === undefined || tags.Tags['microapp-managed'] !== 'true') {
          await lambdaClient.send(
            new lambda.TagResourceCommand({
              Resource: request.lambdaARN,
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
        const functionUrl = await lambdaClient.send(
          new lambda.GetFunctionUrlConfigCommand({
            FunctionName: request.lambdaARN,
          }),
        );
        // Create the FunctionUrl if it doesn't already exist
        if (functionUrl.FunctionUrl) {
          url = functionUrl.FunctionUrl;
        } else if (!functionUrl.FunctionUrl) {
          const functionUrlNew = await lambdaClient.send(
            new lambda.CreateFunctionUrlConfigCommand({
              FunctionName: request.lambdaARN,
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
   * Delete a version of an app
   * @param opts
   * @returns
   */
  public static async DeleteVersion(opts: {
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
    const destinationPrefix = VersionController.GetBucketPrefix(request, config) + '/';
    await this.DeleteFromDestinationBucket(destinationPrefix, config);

    if (record.Type === 'lambda') {
      // TODO: Confirm the Lambda Function exists

      // Get the API Gateway
      const apiId = config.apigwy.apiId;

      // Get the account ID and region for API Gateway to Lambda permissions
      // const accountId = config.awsAccountID;
      // const region = config.awsRegion;

      // TODO: Could remove the policy from the lambda version...
      // but typically it will be deleted soon, so no big deal?
      // if (removeStatements) {
      //   await lambdaClient.send(
      //     new lambda.RemovePermissionCommand({
      //       StatementId: 'microapps-version-root',
      //       FunctionName: request.lambdaARN,
      //     }),
      //   );
      //   await lambdaClient.send(
      //     new lambda.RemovePermissionCommand({
      //       StatementId: 'microapps-version',
      //       FunctionName: request.lambdaARN,
      //     }),
      //   );
      // }

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

        // TODO: Remove the Alias from the Lambda Function
      }
    } else if (record.Type === 'lambda-url') {
      // TODO: Remove the Function URL and Alias from the Lambda Function
      throw new Error('Not implemented');
    }

    // Delete DynamoDB record
    await Version.DeleteVersion({
      dbManager,
      key: { AppName: request.appName, SemVer: request.semVer },
    });

    Log.Instance.info('finished request');

    return { statusCode: 200 };
  }

  private static SHA256Hash(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  private static SHA1Hash(input: string): string {
    return crypto.createHash('sha1').update(input).digest('hex');
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
  private static async CopyFilesInList(
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
  private static async CopyToProdBucket(
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
      await VersionController.CopyFilesInList(
        list,
        stagingBucket,
        sourcePrefix,
        destinationPrefix,
        config,
      );
    } while (list.IsTruncated);
  }

  /**
   * List files in the Destination bucket and each chunk of the list
   * to the Destination bucket
   * @param sourcePrefix
   * @param destinationPrefix
   * @param config
   */
  private static async DeleteFromDestinationBucket(
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

  private static GetBucketPrefix(
    request: Pick<IDeployVersionRequestBase, 'appName' | 'semVer'>,
    config: IConfig,
  ): string {
    const pathPrefix = config.rootPathPrefix === '' ? '' : `${config.rootPathPrefix}/`;
    return `${pathPrefix}${request.appName}/${request.semVer}`.toLowerCase();
  }
}
