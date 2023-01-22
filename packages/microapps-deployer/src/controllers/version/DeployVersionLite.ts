import { DBManager, Rules, Version } from '@pwrdrvr/microapps-datalib';
import { IConfig } from '../../config/Config';
import type { IDeployVersionRequest, IDeployerResponse } from '@pwrdrvr/microapps-deployer-lib';
import Log from '../../lib/Log';
import { GetBucketPrefix } from '../../lib/GetBucketPrefix';
import { CopyToProdBucket } from '../../lib/S3';

/**
 * Deploy a version of an app, but do not touch the app Lambda or API Gateway
 *
 * - lambda (apigwy)
 *   - Copy S3 files from Staging bucket to Destination bucket
 *   - Create or Update App and Version records
 * - lambda-url
 *   - Copy S3 files from Staging bucket to Destination bucket
 *   - Create or Update App and Version records
 * @param opts
 * @returns
 */
export async function DeployVersionLite(opts: {
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
    // Update the status - Final status
    record.Status = 'routed';
    await record.Save(dbManager);
  } else if (appType === 'lambda-url') {
    if (!request.url) {
      throw new Error('Missing url for lambda-url app type');
    }

    // Update the status - Final status
    record.Status = 'routed';

    // Save the Function URL
    record.URL = request.url;
    await record.Save(dbManager);
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
