# MicroApps Project

- CDK Stacks
  - Repos
    - Creates the ECR repos for components to be published into
    - Deployer
    - Router
    - ReleaseApp
  - MicroApps
    - Create MicroApps DynamoDB Table
    - Create Deployer Lambda function
      - Listens on https://apps.pwrdrvr.com/deployer/
    - Create Router Lambda function
    - Create S3 bucket
  - CloudfrontStack
    - Creates https://apps.pwrdrvr.com/
- Release App
  - This controls the released versions of applications

# Useful Commands

- `dotnet build src` compile this app
- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template

# Running CDK

## Set AWS Profile

`export AWS_PROFILE=pwrdrvr`

## Set NVM Version

`nvm use`

## Check CDK Status

`cdk diff`

# Release App

## Update HTML for App

Change version in [src/PwrDrvr.MicroApps.Release/deploy.json]

Use the [src/PwrDrvr.MicroApps.DeployTool] to deploy the static assets:

```
cd src/PwrDrvr.MicroApps.Release
dotnet run --project ../../src/PwrDrvr.MicroApps.DeployTool/
```

## Update Lambda Function Code

### Signin to ECR

`make aws-ecr-login`

### Build and Publish Updated Image

`make aws-ecr-publish-release`

### Update Lambda to Use Updated Image

`make aws-lambda-update-release`

## Run Latest Version of App

https://apps.pwrdrvr.com/release/

## Run Specific Version of App

https://apps.pwrdrvr.com/release/1.0.3/
