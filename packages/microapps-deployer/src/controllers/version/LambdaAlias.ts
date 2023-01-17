import * as lambda from '@aws-sdk/client-lambda';
import { DBManager, Version } from '@pwrdrvr/microapps-datalib';
import { IConfig } from '../../config/Config';
import {
  createVersions,
  ILambdaAliasRequest,
  ILambdaAliasResponse,
  IVersions,
} from '@pwrdrvr/microapps-deployer-lib';
import { promisify } from 'util';
import Log from '../../lib/Log';
import { ExtractARNandAlias } from '../../lib/ExtractLambdaArn';

const sleep = promisify(setTimeout);

const lambdaClient = new lambda.LambdaClient({});

export async function LambdaAlias(opts: {
  dbManager: DBManager;
  request: ILambdaAliasRequest;
  config: IConfig;
}): Promise<ILambdaAliasResponse> {
  const { config, dbManager, request } = opts;
  const { appName, lambdaARN, overwrite = false, semVer } = request;

  const parsedLambdaARN = ExtractARNandAlias(lambdaARN);

  if (parsedLambdaARN.lambdaVersion === '$LATEST') {
    throw new Error(`Lambda version cannot be $LATEST, must be a version number: ${lambdaARN}`);
  }

  if (parsedLambdaARN.lambdaARNType === 'alias') {
    throw new Error(`Lambda version cannot be an alias: ${lambdaARN}`);
  }

  if (parsedLambdaARN.lambdaARNType === 'function') {
    Log.Instance.warn(
      'Lambda version is a function, not a version - It is safer to publish a version using IaC and to pass that version to `microapps-publish publish`',
      {
        lambdaARN,
      },
    );
  }

  // if (!parsedLambdaARN.lambdaVersion) {
  //   throw new Error(`Missing lambda version: ${lambdaARN}`);
  // }

  // 2023-01-16 - This is not strictly necessary and is not able to be done
  // when the lambda is in a child account
  if (!config.parentDeployerLambdaARN) {
    // Get the version record
    const record = await Version.LoadVersion({
      dbManager,
      key: {
        AppName: appName,
        SemVer: semVer,
      },
    });
    if (record !== undefined && record.Status !== 'pending' && record.LambdaARN) {
      if (!overwrite) {
        //
        // Version exists and has moved beyond pending status
        // No need to create S3 upload credentials
        // NOTE: This may change in the future if we allow
        // mutability of versions (at own risk)
        //
        Log.Instance.info('Error: App/Version already exists', {
          appName,
          semVer,
        });

        return {
          statusCode: 200,
          type: 'lambdaAlias',
          actionTaken: 'verified',
          lambdaAliasARN: record.LambdaARN,
        };
      } else {
        Log.Instance.info('Warning: App/Version already exists', {
          appName,
          semVer,
        });
      }
    }
  }

  // Create Lambda version
  let lambdaVersion: string | undefined = parsedLambdaARN.lambdaVersion;
  if (parsedLambdaARN.lambdaARNType === 'function') {
    Log.Instance.info('Creating version for Lambda $LATEST');
    const resultUpdate = await lambdaClient.send(
      new lambda.PublishVersionCommand({
        FunctionName: parsedLambdaARN.lambdaARNBase,
      }),
    );
    lambdaVersion = resultUpdate.Version;
    Log.Instance.info(`Lambda version created: ${resultUpdate.Version}`);

    let lastUpdateStatus = resultUpdate.LastUpdateStatus;
    for (let i = 0; i < 5; i++) {
      // When the function is created the status will be "Pending"
      // and we have to wait until it's done creating
      // before we can point an alias to it
      if (lastUpdateStatus === 'Successful') {
        Log.Instance.info(`Lambda function updated, version: ${lambdaVersion}`);
        break;
      }

      // If it didn't work, wait and try again
      await sleep(1000 * i);

      const resultGet = await lambdaClient.send(
        new lambda.GetFunctionCommand({
          FunctionName: parsedLambdaARN.lambdaARNBase,
          Qualifier: lambdaVersion,
        }),
      );

      // Save the last update status so we can check on re-loop
      lastUpdateStatus = resultGet?.Configuration?.LastUpdateStatus;
    }
  }

  if (!lambdaVersion) {
    throw new Error(`Lambda version not found: ${lambdaVersion}, for lambda: ${lambdaARN}`);
  }

  const versions = createVersions(semVer);

  return CreateOrUpdateLambdaAlias({
    lambdaArnBase: parsedLambdaARN.lambdaARNBase,
    lambdaVersion,
    overwrite,
    versions,
  });
}

/**
 * Only called if an `alias` is not passed into the publish tool.
 * If the service receives a `version`, then it checks if an alias
 * exists for that version. If it does, it updates the alias to point
 * to the new version and returns it, otherwise
 * it creates a new alias and returns that.
 *
 * @param opts
 * @returns
 */
async function CreateOrUpdateLambdaAlias(opts: {
  lambdaArnBase: string;
  lambdaVersion: string;
  overwrite: boolean;
  versions: IVersions;
}): Promise<ILambdaAliasResponse> {
  // Create Lambda alias
  const { lambdaArnBase, lambdaVersion, overwrite, versions } = opts;

  try {
    const resultGetAlias = await lambdaClient.send(
      new lambda.GetAliasCommand({ FunctionName: lambdaArnBase, Name: versions.alias }),
    );

    if (
      lambdaVersion &&
      resultGetAlias.FunctionVersion === lambdaVersion &&
      resultGetAlias.AliasArn
    ) {
      Log.Instance.info(
        `Lambda alias already exists and already points to the desired version: ${lambdaVersion}`,
      );
      return {
        statusCode: 200,
        type: 'lambdaAlias',
        lambdaAliasARN: resultGetAlias.AliasArn,
        actionTaken: 'verified',
      };
    }

    if (!overwrite && resultGetAlias.FunctionVersion !== lambdaVersion) {
      Log.Instance.info(
        `Lambda alias already exists and does not point to the desired version: ${lambdaVersion}`,
      );
      throw new Error('Lambda alias already exists, points to wrong version');
    }

    Log.Instance.info(`Updating the lambda alias for the desired version: ${lambdaVersion}`);
    const resultLambdaAlias = await lambdaClient.send(
      new lambda.UpdateAliasCommand({
        FunctionName: lambdaArnBase,
        Name: versions.alias,
        FunctionVersion: lambdaVersion,
      }),
    );

    Log.Instance.info(
      `Lambda alias updated, name: ${resultLambdaAlias.Name}, arn: ${resultLambdaAlias.AliasArn}`,
    );

    if (!resultLambdaAlias.AliasArn) {
      throw new Error('AliasArn failed to create');
    }

    return {
      statusCode: 200,
      type: 'lambdaAlias',
      lambdaAliasARN: resultLambdaAlias.AliasArn,
      actionTaken: 'updated',
    };
  } catch (error: any) {
    if (error.name !== 'ResourceNotFoundException') {
      throw error;
    }

    // Alias does not exist, create it by falling through
  }

  Log.Instance.info(`Creating the lambda alias for the desired version: ${lambdaVersion}`);

  const resultCreateAlias = await lambdaClient.send(
    new lambda.CreateAliasCommand({
      FunctionName: lambdaArnBase,
      Name: versions.alias,
      FunctionVersion: lambdaVersion,
    }),
  );
  Log.Instance.info(
    `Lambda alias created, name: ${resultCreateAlias.Name}, arn: ${resultCreateAlias.AliasArn}, points to version: ${resultCreateAlias.FunctionVersion}`,
  );

  if (!resultCreateAlias.AliasArn) {
    throw new Error('AliasArn failed to create');
  }

  return {
    statusCode: 201,
    type: 'lambdaAlias',
    lambdaAliasARN: resultCreateAlias.AliasArn,
    actionTaken: 'created',
  };
}
