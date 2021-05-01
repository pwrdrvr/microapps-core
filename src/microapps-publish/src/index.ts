#!/usr/bin/env node
/* eslint-disable no-console */

import * as lambda from '@aws-sdk/client-lambda';
import commander from 'commander';
import * as util from 'util';
import { exec } from 'child_process';
import * as fs from 'fs/promises';
import DeployConfig, { IDeployConfig } from './DeployConfig';
import S3Uploader from './S3Uploader';
import DeployClient from './DeployClient';
const asyncSetTimeout = util.promisify(setTimeout);
const asyncExec = util.promisify(exec);

const program = new commander.Command();

program
  .version('0.9.3')
  .option('-n, --new-version [version]', 'New version to apply')
  .option('-l, --leave', 'Leave a copy of the modifed files as .modified')
  .parse(process.argv);

const lambdaClient = new lambda.LambdaClient({});

interface IVersions {
  version: string;
  alias?: string;
}

class PublishTool {
  private ECR_HOST = '';
  private ECR_REPO = '';
  private IMAGE_TAG = '';
  private IMAGE_URI = '';

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
  private static escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }

  public async UpdateVersion(): Promise<void> {
    const options = program.opts();
    const version = options.newVersion as string;
    const leaveFiles = options.leave as boolean;

    if (version === undefined) {
      console.log('--new-version <version> is a required parameter');
      process.exit(1);
    }

    const versionAndAlias = this.createVersions(version);
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
        if (!(await this.writeNewVersions(fileToModify.path, fileToModify.versions, leaveFiles))) {
          console.log(`Failed modifying file: ${fileToModify.path}`);
        }
      }

      // Read in the deploy.json config file for DeployTool
      const deployConfig = await DeployConfig.Load();

      if (deployConfig === undefined) {
        console.log('Failed to load the config file');
        process.exit(1);
      }
      if (deployConfig.StaticAssetsPath === undefined) {
        console.log('StaticAssetsPath must be specified in the config file');
        process.exit(1);
      }

      console.log(`Invoking serverless next.js build for ${deployConfig.AppName}/${version}`);

      // Run the serverless next.js build
      await asyncExec('serverless');

      if (deployConfig.ServerlessNextRouterPath !== undefined) {
        console.log('Copying Serverless Next.js router to build output directory');
        await fs.copyFile(deployConfig.ServerlessNextRouterPath, './.serverless_nextjs/index.js');
      }

      // Save settings
      this.ECR_HOST = `${deployConfig.AWSAccountID}.dkr.ecr.${deployConfig.AWSRegion}.amazonaws.com`;
      this.ECR_REPO = `app-${deployConfig.AppName}`;
      this.IMAGE_TAG = `${this.ECR_REPO}:${versionAndAlias.version}`;
      this.IMAGE_URI = `${this.ECR_HOST}/${this.IMAGE_TAG}`;

      // Docker, build, tag, push to ECR
      // Note: Need to already have AWS env vars set
      await this.publishToECR(deployConfig);

      // Update the Lambda function
      await this.deployToLambda(deployConfig, versionAndAlias);

      //
      // Tasks that used to be in DeployTool
      //

      // Check that Static Assets Folder exists
      const staticAssetsStats = await fs.stat(deployConfig.StaticAssetsPath);
      if (!staticAssetsStats.isDirectory()) {
        console.log(`Static asset path does not exist: ${deployConfig.StaticAssetsPath}`);
        process.exit(1);
      }

      // Confirm the Version Does Not Exist in Published State
      const appExists = await DeployClient.CheckVersionExists(deployConfig);
      if (appExists) {
        console.log(
          `Warning: App/Version already exists: ${deployConfig.AppName}/${deployConfig.SemVer}`,
        );
      }

      // Upload Files to S3 Staging AppName/Version Prefix
      console.log('Copying S3 assets');
      await S3Uploader.Upload(deployConfig);

      // Call Deployer to Create App if Not Exists
      console.log(`Creating MicroApp Application: ${deployConfig.AppName}`);
      await DeployClient.CreateApp(deployConfig);

      // Call Deployer to Deploy AppName/Version
      console.log(`Creating MicroApp Version: ${deployConfig.SemVer}`);
      await DeployClient.DeployVersion(deployConfig);

      console.log(`Published: ${deployConfig.AppName}/${deployConfig.SemVer}`);
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

  private createVersions(version: string): IVersions {
    return { version, alias: `v${version.replace(/\./g, '_')}` };
  }

  private async writeNewVersions(
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
        const regExp = new RegExp(PublishTool.escapeRegExp(placeHolder), 'g');
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

  private async publishToECR(deployConfig: IDeployConfig): Promise<void> {
    // Make sure we're logged into ECR for the Docker push
    console.log('Logging into ECR');
    await asyncExec(
      `aws ecr get-login-password --region ${deployConfig.AWSRegion} | docker login --username AWS --password-stdin ${this.ECR_HOST}`,
    );
    console.log('Starting Docker build');
    await asyncExec(`docker build -f Dockerfile -t ${this.IMAGE_TAG}  .`);
    await asyncExec(`docker tag ${this.IMAGE_TAG} ${this.ECR_HOST}/${this.IMAGE_TAG}`);
    console.log('Starting Docker push to ECR');
    await asyncExec(`docker push ${this.ECR_HOST}/${this.IMAGE_TAG}`);
  }

  private async deployToLambda(deployConfig: IDeployConfig, versions: IVersions): Promise<void> {
    // Create Lambda version
    console.log(`Updating Lambda code to point to new Docker image`);
    const resultUpdate = await lambdaClient.send(
      new lambda.UpdateFunctionCodeCommand({
        FunctionName: this.ECR_REPO,
        ImageUri: this.IMAGE_URI,
        Publish: true,
      }),
    );
    const lambdaVersion = resultUpdate.Version;
    console.log('Lambda version created: ', resultUpdate.Version);

    let lastUpdateStatus = resultUpdate.LastUpdateStatus;
    for (let i = 0; i < 5; i++) {
      // When the function is created the status will be "Pending"
      // and we have to wait until it's done creating
      // before we can point an alias to it
      if (lastUpdateStatus === 'Successful') {
        console.log(`Lambda function updated, version: ${lambdaVersion}`);
        break;
      }

      // If it didn't work, wait and try again
      await asyncSetTimeout(1000 * i);

      const resultGet = await lambdaClient.send(
        new lambda.GetFunctionCommand({
          FunctionName: this.ECR_REPO,
          Qualifier: lambdaVersion,
        }),
      );

      // Save the last update status so we can check on re-loop
      lastUpdateStatus = resultGet?.Configuration?.LastUpdateStatus;
    }

    // Create Lambda alias point
    console.log(`Creating the lambda alias for the new version: ${lambdaVersion}`);
    const resultLambdaAlias = await lambdaClient.send(
      new lambda.CreateAliasCommand({
        FunctionName: this.ECR_REPO,
        Name: versions.alias,
        FunctionVersion: lambdaVersion,
      }),
    );
    console.log(`Lambda alias created, name: ${resultLambdaAlias.Name}`);
  }
}

process.chdir('/Users/huntharo/pwrdrvr/microapps-app-release/');
const publishTool = new PublishTool();
publishTool.UpdateVersion();
