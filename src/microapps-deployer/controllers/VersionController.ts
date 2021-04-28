import { manager, IDeployVersionRequest, ICheckVersionExistsRequest } from '..';
import * as lambda from '@aws-sdk/client-lambda';
import * as s3 from '@aws-sdk/client-s3';
import * as apigwy from '@aws-sdk/client-apigatewayv2';
import GatewayInfo from '../lib/GatewayInfo';

const lambdaClient = new lambda.LambdaClient({});
const s3Client = new s3.S3Client({});
const apigwyClient = new apigwy.ApiGatewayV2Client({});

export default class VersionController {
  static const destinationBucket = "pwrdrvr-apps";

  static async public CheckVersionExists({appName, semVer }: ICheckVersionExistsRequest): Promise<void> {
    try {
      // Check if the version exists
      var record = await manager.GetAppVersion(appName, semVer);
      if (record != null && record.Status != "pending") {
        Response.StatusCode = 200;
        console.log(`App/Version already exists: ${appName}/${semVer}`);
        return;
      } else {
        Response.StatusCode = 404;
        console.log(`App/Version does not exist: ${appName}/${semVer}`);
        return;
      }
    } catch (err: Error) {
      console.log(`Caught unexpected exception: ${err.message}`);
    }
  }

 static async public DeployVersion(request: IDeployVersionRequest): Promise<void> {
    try {
      console.log(`Got Body:`, request);

      const destinationPrefix = `${request.appName}/${request.semVer}`;

      // Check if the version exists
      var record = await manager.GetAppVersion(request.appName, request.semVer);
      if (record != null && record.Status == "routed") {
        Response.StatusCode = 409;
        console.log(`App/Version already exists: ${request.appName}/${request.semVer}`);
        return;
      }

      // Create the version record
      if (record == null) {
        record = new DataLib.Models.Version() {
          AppName : request.appName,
          SemVer : request.semVer,
          Type : "lambda",
          Status : "pending",
          DefaultFile : request.defaultFile,
        };

        // Save record with pending status
        await manager.CreateVersion(record);
      }

      // Only copy the files if not copied yet
      if (record.Status == "pending") {
        // Parse the S3 Source URI
        var uri = new Uri(request.s3SourceURI);

        var sourceBucket = uri.Host;
        var sourcePrefix = uri.AbsolutePath.Length >= 1 ? uri.AbsolutePath.Substring(1) : null;

        // Example Source: s3://pwrdrvr-apps-staging/release/1.0.0/
        var paginator = s3Client.Paginators.ListObjectsV2(new Amazon.S3.Model.ListObjectsV2Request() {
          BucketName = uri.Host,
          Prefix = sourcePrefix,
        });

        // Loop through all S3 source assets and copy to the destination
        await foreach (var obj in paginator.S3Objects) {
          var sourceKeyRootless = obj.Key.Remove(0, sourcePrefix.Length);
          // Console.WriteLine("object: ${0}", obj.Key);
          await s3Client.CopyObjectAsync(sourceBucket, obj.Key,
          destinationBucket, string.Format("{0}/{1}", destinationPrefix, sourceKeyRootless));
        }

        // Update status to assets-copied
        record.Status = "assets-copied";
        await manager.CreateVersion(record);
      }

      // TODO: Confirm the Lambda Function exists

      // Get the API Gateway
      const api = await GatewayInfo.GetAPI(apigwyClient);

      if (record.Status == "assets-copied") {
        // Get the account ID
        var lambdaArnParts = request.lambdaARN.split(':');
        var accountId = lambdaArnParts[4];
        var region = lambdaArnParts[3];

        // Ensure that the Lambda function allows API Gateway to invoke
        try {
          await lambdaClient.send(new lambda.RemovePermissionCommand({
            FunctionName = request.lambdaARN,
            StatementId = "microapps-version-root",
          }));
        } catch {
          // Don't care if this remove throws
        }
        try {
          await lambdaClient.send(new lambda.RemovePermissionCommand({
            FunctionName = request.lambdaARN,
            StatementId = "microapps-version",
          }));
        } catch {
          // Don't care if this remove throws
        }
        await lambdaClient.send(new lambda.AddPermissionCommand({
          Principal = "apigateway.amazonaws.com",
          StatementId = "microapps-version-root",
          Action = "lambda:InvokeFunction",
          FunctionName = request.lambdaARN,
          SourceArn = `arn:aws:execute-api:${region}:${accountId}:${api.ApiId}/*/*/${request.appName}/${request.semVer}`,
        }));
        await lambdaClient.send(new lambda.AddPermissionCommand({
          Principal = "apigateway.amazonaws.com",
          StatementId = "microapps-version",
          Action = "lambda:InvokeFunction",
          FunctionName = request.lambdaARN,
          SourceArn = `arn:aws:execute-api:${region}:${accountId}:${api.ApiId}/*/*/${request.appName}/${request.semVer}/{{proxy+}}`
        }));
        record.Status = "permissioned";
        await manager.CreateVersion(record);
      }

      // Add Integration pointing to Lambda Function Alias
      let integrationId = "";
      if (record.Status == "permissioned") {
        if (record.IntegrationID !== undefined && record.IntegrationID !== '') {
          integrationId = record.IntegrationID;
        } else {
          const integration = await apigwyClient.send(new apigwy.CreateIntegrationCommand({
            ApiId = api.ApiId,
            IntegrationType = apigwy.IntegrationType.AWS_PROXY,
            IntegrationMethod = "POST",
            PayloadFormatVersion = "2.0",
            IntegrationUri = request.lambdaARN,
          }));

          integrationId = integration.IntegrationId;

          // Save the created IntegrationID
          record.IntegrationID = integration.IntegrationId;
          record.Status = "integrated";
          await manager.CreateVersion(record);
        }
      }

      if (record.Status == "integrated") {
        // Add the routes to API Gateway for appName/version/{proxy+}
        try {
          await apigwyClient.send(new apigwy.CreateRouteCommand({
            ApiId = api.ApiId,
            Target = `integrations/${integrationId}`,
            RouteKey = `ANY /${request.appName}/${request.semVer}`,
          }));
        } catch {
          // Don't care
        }
        try {
          await apigwyClient.send(new apigwy.CreateRouteCommand({
            ApiId = api.ApiId,
            Target = `integrations/${integrationId}`,
            RouteKey =`ANY /${request.appName}/${request.semVer}/{{proxy+}}`,
          }));
        } catch {
          // Don't care
        }

        // Update the status - Final status
        record.Status = "routed";
        await manager.CreateVersion(record);
      }

      // Check if there are any release rules
      // If no rules record, create one pointing to this version by default
      var rules = await manager.GetRules(request.appName);
      if (rules == null) {
        rules = new Rules() {
          AppName: request.appName,
        };
        rules.RuleSet.Add("default", new Rule() {
          SemVer: request.semVer,
        });
        await manager.UpdateRules(rules);
      }
    } catch (err: Error) {
      Response.StatusCode = 500;
      // TODO: Log it
    }
  }
}
