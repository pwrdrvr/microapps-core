import * as sts from '@aws-sdk/client-sts';
import { DBManager, Version } from '@pwrdrvr/microapps-datalib';
import { IConfig } from '../../config/Config';
import {
  IDeployVersionPreflightRequest,
  IDeployVersionPreflightResponse,
} from '@pwrdrvr/microapps-deployer-lib';
import Log from '../../lib/Log';
import { GetBucketPrefix } from '../../lib/GetBucketPrefix';
import { SHA1Hash } from '../../lib/ShaHash';

const stsClient = new sts.STSClient({
  maxAttempts: 8,
});

/**
 * Return temp S3 IAM credentials for static asset uploads
 * when a version does not exist.
 * @param opts
 * @returns
 */
export async function DeployVersionPreflight(opts: {
  dbManager: DBManager;
  request: IDeployVersionPreflightRequest;
  config: IConfig;
}): Promise<IDeployVersionPreflightResponse> {
  const { dbManager, request, config } = opts;
  const { appName, semVer, needS3Creds = true, overwrite = false } = request;
  const capabilities = { createAlias: 'true' };

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

      return { statusCode: 200, capabilities };
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

    const iamPolicyDoc = {
      Statement: [
        {
          Effect: 'Allow',
          Action: ['s3:PutObject', 's3:GetObject', 's3:AbortMultipartUpload'],
          Resource: [`arn:aws:s3:::${config.filestore.stagingBucket}/*`],
          // TODO: Add condition to limit to app prefix
        },
        {
          Effect: 'Allow',
          Action: ['s3:ListBucket'],
          Resource: [`arn:aws:s3:::${config.filestore.stagingBucket}`],
        },
      ],
      Version: '2012-10-17',
    };

    Log.Instance.debug('Temp IAM Policy', { policy: JSON.stringify(iamPolicyDoc) });

    // Assume the upload role with limited S3 permissions
    const stsResult = await stsClient.send(
      new sts.AssumeRoleCommand({
        RoleArn: `arn:aws:iam::${config.awsAccountID}:role/${config.uploadRoleName}`,
        DurationSeconds: 60 * 60,
        RoleSessionName: SHA1Hash(GetBucketPrefix(request, config)),
        Policy: JSON.stringify(iamPolicyDoc),
      }),
    );

    Log.Instance.info('finished request - returning s3 creds');

    return {
      statusCode: 404,
      capabilities,
      s3UploadUrl: `s3://${config.filestore.stagingBucket}/${GetBucketPrefix(request, config)}`,

      awsCredentials: {
        accessKeyId: stsResult.Credentials?.AccessKeyId as string,
        secretAccessKey: stsResult.Credentials?.SecretAccessKey as string,
        sessionToken: stsResult.Credentials?.SessionToken as string,
      },
    };
  } else {
    Log.Instance.info('finished request - not returning s3 creds');

    return {
      capabilities,
      statusCode: 404,
    };
  }
}
