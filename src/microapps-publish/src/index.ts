#!/usr/bin/env npx ts-node -T --project ./bin/tsconfig.json

import * as Program from 'commander';
import * as util from 'util';
import { exec } from 'child_process';
import * as fs from 'fs/promises';
const asyncSetTimeout = util.promisify(setTimeout);
const asyncExec = util.promisify(exec);

Program.version('1.0.0')
  .option('-n, --newversion <version>', 'New version to apply')
  .option('-l, --leave', 'Leave a copy of the modifed files as .modified')
  .parse(process.argv);

interface IDeployConfig {
  AppName: string;
  SemVer: string;
  DefaultFile: string;
  StaticAssetsPath: string;
  LambdaARN: string;
  AWSAccountID: string;
  AWSRegion: string;
  ServerlessNextRouterPath: string;
  DeployToolCommand: string;
}

interface IVersions {
  version: string;
  alias?: string;
}

interface ILambdaPublishResponse {
  FunctionName: string;
  FunctionArn: string;
  Role: string;
  CodeSize: number;
  Description: string;
  Timeout: number;
  MemorySize: number;
  LastModified: string;
  CodeSha256: string;
  Version: string;
  TracingConfig: {
    Mode: 'PassThrough';
  };
  RevisionId: string;
  State: 'Active';
  LastUpdateStatus: 'Successful' | 'InProgress';
  PackageType: 'Image';
}

interface ILambdaUpdateConfigurationResponse {
  FunctionName: string;
  FunctionArn: string;
  Role: string;
  CodeSize: number;
  Description: string;
  Timeout: number;
  MemorySize: number;
  LastModified: string;
  CodeSha256: string;
  Version: string;
  TracingConfig: {
    Mode: string;
  };
  RevisionId: string;
  // "RevisionId": "482af8c0-71a8-4b44-8e0f-813def1afc77",
  State: 'Active' | string;
  LastUpdateStatus: 'Successful' | 'InProgress'; // Successful
  LastUpdateStatusReason: 'The function is being created.' | string;
  LastUpdateStatusReasonCode: 'Creating' | string;
  PackageType: 'Image' | string;
}

interface ILambdaUpdateResponse {
  Configuration: ILambdaUpdateConfigurationResponse;
  Code: {
    RepositoryType: 'ECR' | string;
    ImageUri: string;
    ResolvedImageUri: string;
  };
}

interface ILambdaAliasResponse {
  AliasArn: string;
  Name: string;
  FunctionVersion: string;
  Description: string;
  RevisionId: string;
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

async function UpdateVersion(): Promise<void> {
  const options = Program.opts();
  const version = options.newversion as string;
  const leaveFiles = options.leave as boolean;
  const versionAndAlias = createVersions(version);
  const versionOnly = { version: versionAndAlias.version };

  const filesToModify = [
    { path: 'package.json', versions: versionOnly },
    { path: 'deploy.json', versions: versionAndAlias },
    { path: 'next.config.js', versions: versionOnly },
  ] as { path: string; versions: IVersions }[];

  try {
    // Modify the existing files with the new version
    for (const fileToModify of filesToModify) {
      console.log(`Patching version (${versionAndAlias.version}) into ${fileToModify.path}`);
      if (!(await writeNewVersions(fileToModify.path, fileToModify.versions, leaveFiles))) {
        console.log(`Failed modifying file: ${fileToModify.path}`);
      }
    }

    // Read in the deploy.json config file for DeployTool
    const deployConfig = JSON.parse(await fs.readFile('deploy.json', 'utf8')) as IDeployConfig;

    console.log(`Invoking serverless next.js build for ${deployConfig.AppName}/${version}`);

    // Run the serverless next.js build
    await asyncExec('npx serverless');

    if (deployConfig.ServerlessNextRouterPath !== undefined) {
      console.log('Copying Serverless Next.js router to build output directory');
      await fs.copyFile(deployConfig.ServerlessNextRouterPath, './.serverless_nextjs/index.js');
    }

    // Docker, build, tag, push to ECR
    // Note: Need to already have AWS env vars set
    await publishToECR(deployConfig, versionAndAlias);

    // Update the Lambda function
    await deployToLambda(deployConfig, versionAndAlias);

    // Invoke DeployTool
    console.log('Invoking DeployTool to deploy MicroApp version');
    const { stdout, stderr } = await asyncExec(deployConfig.DeployToolCommand);
    console.log(stdout);
    console.log(stderr);
  } catch (error) {
    console.log(`Caught exception: ${error.message}`);
  } finally {
    // Put the old files back when succeeded or failed
    for (const fileToModify of filesToModify) {
      const stats = await fs.stat(`${fileToModify.path}.original`);
      if (stats.isFile()) {
        // Remove the possibly modified file
        await fs.unlink(fileToModify.path);

        // Move the original file back
        await fs.rename(`${fileToModify.path}.original`, fileToModify.path);
      }
    }
  }
}

function createVersions(version: string): IVersions {
  return { version, alias: `v${version.replace(/\./g, '_')}` };
}

async function writeNewVersions(
  path: string,
  requiredVersions: IVersions,
  leaveFiles: boolean,
): Promise<boolean> {
  const stats = await fs.stat(path);
  if (!stats.isFile) {
    return false;
  }

  // Make a backup of the file
  await fs.copyFile(path, `${path}.original`);

  // File exists, check that it has the required version strings
  let fileText = await fs.readFile(path, 'utf8');

  for (const key of Object.keys(requiredVersions)) {
    const placeHolder = key === 'version' ? '0.0.0' : 'v0_0_0';
    if (fileText.indexOf(placeHolder) === -1) {
      // The required placeholder is missing
      return false;
    } else {
      const regExp = new RegExp(escapeRegExp(placeHolder), 'g');
      fileText = fileText.replace(
        regExp,
        key === 'version' ? requiredVersions.version : (requiredVersions.alias as string),
      );
    }
  }

  // Write the updated file contents
  await fs.writeFile(path, fileText, 'utf8');

  // Leave a copy of the modified file if requested
  if (leaveFiles) {
    // This copy will overwrite an existing file
    await fs.copyFile(path, `${path}.modified`);
  }

  return true;
}

async function publishToECR(deployConfig: IDeployConfig, versions: IVersions): Promise<void> {
  const ECR_HOST = `${deployConfig.AWSAccountID}.dkr.ecr.${deployConfig.AWSRegion}.amazonaws.com`;
  const ECR_REPO = `app-${deployConfig.AppName}`;
  const IMAGE_TAG = `${ECR_REPO}:${versions.version}`;

  // Make sure we're logged into ECR for the Docker push
  console.log('Logging into ECR');
  await asyncExec(
    `aws ecr get-login-password --region ${deployConfig.AWSRegion} | docker login --username AWS --password-stdin ${ECR_HOST}`,
  );

  console.log('Starting Docker build');
  await asyncExec(`docker build -f Dockerfile -t ${IMAGE_TAG}  .`);
  await asyncExec(`docker tag ${IMAGE_TAG} ${ECR_HOST}/${IMAGE_TAG}`);
  await asyncExec(`docker tag ${IMAGE_TAG} ${ECR_HOST}/${ECR_REPO}:latest`);
  console.log('Starting Docker push to ECR');
  await asyncExec(`docker push ${ECR_HOST}/${IMAGE_TAG}`);
  await asyncExec(`docker push ${ECR_HOST}/${ECR_REPO}:latest`);
}

async function deployToLambda(deployConfig: IDeployConfig, versions: IVersions): Promise<void> {
  const ECR_HOST = `${deployConfig.AWSAccountID}.dkr.ecr.${deployConfig.AWSRegion}.amazonaws.com`;
  const ECR_REPO = `app-${deployConfig.AppName}`;
  const IMAGE_TAG = `${ECR_REPO}:${versions.version}`;
  const IMAGE_URI = `${ECR_HOST}/${IMAGE_TAG}`;

  // Create Lambda version
  console.log(`Updating Lambda code to point to new Docker image`);
  const { stdout: stdoutUpdate } = await asyncExec(
    `aws lambda update-function-code --function-name ${ECR_REPO} --image-uri ${IMAGE_URI} --region=${deployConfig.AWSRegion} --output json`,
  );
  let lambdaUpdateResponse = JSON.parse(stdoutUpdate) as ILambdaUpdateResponse;
  let lambdaVersion = '';
  if (lambdaUpdateResponse.Configuration === undefined) {
    lambdaUpdateResponse.Configuration = (lambdaUpdateResponse as unknown) as ILambdaUpdateConfigurationResponse;
  }
  for (let i = 0; i < 5; i++) {
    if (lambdaUpdateResponse.Configuration.LastUpdateStatus === 'Successful') {
      if (lambdaUpdateResponse.Code.ImageUri !== IMAGE_URI) {
        throw new Error(
          `Lambda function updated, but had wrong image URI: ${lambdaUpdateResponse.Code.ImageUri}`,
        );
      }
      // This will usually be "$LATEST" - So we have to get the version after publish
      lambdaVersion = lambdaUpdateResponse.Configuration.Version;
      // console.log(`Lambda function updated, version: ${lambdaVersion}`);
      break;
    }

    // If it didn't work, wait and try again
    await asyncSetTimeout(5000);
    const { stdout } = await asyncExec(
      `aws lambda get-function --function-name ${ECR_REPO} --output json`,
    );
    lambdaUpdateResponse = JSON.parse(stdout) as ILambdaUpdateResponse;
  }

  // Create Lambda alias pointing to version
  console.log(`Publishing the new lambda version`);
  const { stdout: stdoutPublish } = await asyncExec(
    `aws lambda publish-version --function-name ${ECR_REPO} --output json`,
  );
  const lambdaPublishResponse = JSON.parse(stdoutPublish) as ILambdaPublishResponse;

  // Save the version created
  lambdaVersion = lambdaPublishResponse.Version;

  console.log(`Creating the lambda alias for the new version: ${lambdaVersion}`);
  const { stdout: stdoutAlias } = await asyncExec(
    `aws lambda create-alias --function-name ${ECR_REPO} --name ${versions.alias} --function-version '${lambdaVersion}' --region=${deployConfig.AWSRegion} --output json`,
  );
  let lambdaAliasResponse = JSON.parse(stdoutAlias) as ILambdaAliasResponse;
  for (let i = 0; i < 5; i++) {
    if (lambdaAliasResponse !== undefined && lambdaAliasResponse.FunctionVersion !== undefined) {
      if (lambdaAliasResponse.FunctionVersion !== lambdaVersion) {
        throw new Error(
          `Alias created but points to wrong version, expected: ${lambdaVersion}, got: ${lambdaAliasResponse.FunctionVersion}`,
        );
      }
      lambdaVersion = lambdaAliasResponse.FunctionVersion;
      console.log(`Lambda alias created, name: ${versions.alias}`);
      break;
    }

    // If it didn't work, wait and try again
    await asyncSetTimeout(5000);
    const { stdout } = await asyncExec(
      `aws lambda get-alias --function-name ${ECR_REPO} --name ${versions.alias} --output json`,
    );
    lambdaAliasResponse = JSON.parse(stdout) as ILambdaAliasResponse;
  }

  // # Capture the Revision ID of the newly published code
  // @echo "Creating new alias, ${LAMBDA_ALIAS}, pointing to ${ECR_HOST}/${IMAGE_TAG}"
  // @aws lambda update-function-code --function-name ${ECR_REPO} \
  // 	--image-uri ${ECR_HOST}/${IMAGE_TAG} --region=${REGION} \
  // 	--output json > /dev/null
  // @sleep 10
  // $(eval VERSION:=$$(shell aws lambda publish-version --function-name ${ECR_REPO} \
  // 	--region=${REGION} \
  // 	--output json --publish \
  // 	| jq -r ".Version"))
  // @echo "New Lambda Version: ${ECR_REPO}/${VERSION}"
  // @sleep 10
  // @aws lambda create-alias --function-name ${ECR_REPO} \
  // 	--name ${LAMBDA_ALIAS} --function-version '${VERSION}' --region=${REGION}
}

Promise.all([UpdateVersion()]);
