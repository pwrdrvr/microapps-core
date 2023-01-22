import * as lambda from '@aws-sdk/client-lambda';
import { IConfig } from '../../config/Config';
import {
  createVersions,
  IDeployerResponse,
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
  request: ILambdaAliasRequest;
  config: IConfig;
}): Promise<ILambdaAliasResponse | IDeployerResponse> {
  const { config, request } = opts;
  const { lambdaARN, overwrite = false, semVer } = request;

  const parsedLambdaARN = ExtractARNandAlias({
    lambdaARN,
    config,
  });

  if (parsedLambdaARN.lambdaVersion === '$LATEST') {
    throw new Error(`Lambda version cannot be $LATEST, must be a version number: ${lambdaARN}`);
  }

  if (parsedLambdaARN.lambdaARNType === 'alias') {
    throw new Error(`Lambda version cannot be an alias: ${lambdaARN}`);
  }

  if (parsedLambdaARN.lambdaARNType === 'function') {
    Log.Instance.warn(
      'Lambda ARN is a function, not a version - It is safer to publish a version using IaC and to pass that version to `microapps-publish publish`',
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
  // if (!config.parentDeployerLambdaARN) {
  //   // Get the version record
  //   const record = await Version.LoadVersion({
  //     dbManager,
  //     key: {
  //       AppName: appName,
  //       SemVer: semVer,
  //     },
  //   });
  //   if (record !== undefined && record.Status !== 'pending' && record.LambdaARN) {
  //     if (!overwrite) {
  //       //
  //       // Version exists and has moved beyond pending status
  //       // No need to create S3 upload credentials
  //       // NOTE: This may change in the future if we allow
  //       // mutability of versions (at own risk)
  //       //
  //       Log.Instance.info('Error: App/Version already exists', {
  //         appName,
  //         semVer,
  //       });

  //       return {
  //         statusCode: 200,
  //         type: 'lambdaAlias',
  //         actionTaken: 'verified',
  //         lambdaAliasARN: record.LambdaARN,
  //       };
  //     } else {
  //       Log.Instance.info('Warning: App/Version already exists', {
  //         appName,
  //         semVer,
  //       });
  //     }
  //   }
  // }

  // Legacy: creating a version is not desired as a concern of the deployer service
  // but it was supported in pre-0.4 versions so it will continue to be for a time
  // and/or forever as it can be helpful for people trying the system for the first time.
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

  // Check if the function and version exist
  try {
    const resultGet = await lambdaClient.send(
      new lambda.GetFunctionCommand({
        FunctionName: parsedLambdaARN.lambdaARNBase,
        Qualifier: lambdaVersion,
      }),
    );
    if (resultGet.Configuration?.FunctionArn === undefined) {
      Log.Instance.error(`Lambda version not found: ${lambdaVersion}, for lambda: ${lambdaARN}`);
      return {
        statusCode: 404,
        errorMessage: `Lambda version not found: ${lambdaVersion}, for lambda: ${lambdaARN}`,
      };
    }
  } catch (error: any) {
    Log.Instance.error('Error getting Lambda version', error);

    if (error.name === 'ResourceNotFoundException') {
      return { statusCode: 404, errorMessage: error.message };
    } else {
      return { statusCode: 500, errorMessage: error.message };
    }
  }

  const versions = createVersions(semVer);

  const aliasInfo = await CreateOrUpdateLambdaAlias({
    lambdaArnBase: parsedLambdaARN.lambdaARNBase,
    lambdaVersion,
    overwrite,
    versions,
  });

  // Check if the Function has the tags we need, add them if needed
  await AddTagToFunction({ lambdaARNBase: parsedLambdaARN.lambdaARNBase });

  // Check if Function URL exists, create it if needed
  const { url } = await AddOrUpdateFunctionUrl({
    lambdaARNBase: parsedLambdaARN.lambdaARNBase,
    lambdaAlias: versions.alias,
  });
  const aliasWithUrl: ILambdaAliasResponse = { ...aliasInfo, functionUrl: url };

  // TODO: For API Gateway, add the permissions to the Lambda alias
  // Actually... do we want to add cross-account permission for API Gateway?  Maybe...

  // For lambda-url, add the permissions to the Lambda alias
  await AddCrossAccountPermissionsToAlias({
    config,
    lambdaBaseARN: parsedLambdaARN.lambdaARNBase,
    lambdaAlias: versions.alias,
  });

  return aliasWithUrl;
}

async function AddTagToFunction({ lambdaARNBase }: { lambdaARNBase: string }) {
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
}

async function AddOrUpdateFunctionUrl({
  lambdaARNBase,
  lambdaAlias,
}: {
  lambdaARNBase: string;
  lambdaAlias: string;
}) {
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

  return { url };
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

  Log.Instance.info(
    `Creating the lambda alias for the desired version: ${lambdaVersion}, lambdaArnBase: ${lambdaArnBase}`,
  );

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

/**
 * Add permissions for the edge-to-origin lambda to invoke this app lambda
 * when the edge-to-origin lambda is deployed into another account.
 *
 * Ideally this is actually handled by the app lambda IaC (e.g. CDK or SAM), but
 * we add the permissions here as a last resort.
 *
 * @param param0
 */
async function AddCrossAccountPermissionsToAlias({
  config,
  lambdaBaseARN,
  lambdaAlias,
}: {
  config: IConfig;
  lambdaBaseARN: string;
  lambdaAlias: string;
}): Promise<void> {
  // Bail if there is no parent account
  if (!config.parentDeployerLambdaARN) {
    return;
  }

  //
  // Confirm edge-to-origin is already allowed to execute this alias
  // from the specific route for this version
  //
  let addStatements = true;
  try {
    const existingPolicy = await lambdaClient.send(
      new lambda.GetPolicyCommand({
        FunctionName: lambdaBaseARN,
        Qualifier: lambdaAlias,
      }),
    );
    if (existingPolicy.Policy !== undefined) {
      interface IPolicyDocument {
        Version: string;
        Id: string;
        Statement: { Sid: string }[];
      }
      const policyDoc = JSON.parse(existingPolicy.Policy) as IPolicyDocument;

      // TODO: Check if any of the statements allow the edge to origin Role ARN
      // to invoke the function via function URL

      if (policyDoc.Statement !== undefined) {
        const foundStatements = policyDoc.Statement.filter(
          (value) => value.Sid === 'microapps-edge-to-origin',
        );
        if (foundStatements.length === 1) {
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
        StatementId: 'microapps-edge-to-origin',
        Action: 'lambda:InvokeFunctionUrl',
        FunctionName: lambdaBaseARN,
        Qualifier: lambdaAlias,
        SourceArn: config.edgeToOriginRoleARN,
      }),
    );
  }
}
