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

# Deployer Service

Copies static assets from staging to deployed directory, creates record of application / version in DynamoDB Table.

## Build and Deploy Update

```
make aws-ecr-login
make aws-ecr-publish-deployer
make aws-lambda-update-deployer
```

# Generating Swagger Clients

https://blog.logrocket.com/generate-typescript-csharp-clients-nswag-api/

- Install All Node and DotNet Dependencies
  - `npm i`
- Start the Deployer Svc in Watch Mode
  - `npm run start:deployer`
- Explore the Swagger Spec
  - `http://localhost:5000/swagger`
- Export the Swagger TypeScript Client
  - `npm run generate-client:deployer`

# Notes on Selection of Docker Image Lambdas

The Router and Deployer services are very small (0.5 MB) after tree shaking, minification, and uglification performed by `rollup`. The router has the tightest performance requirement and performed just as well as a docker image vs a zip file. However, docker image start up is up to 2x longer vs the zip file for the router; this should not be a problem for any live system with continuous usage and for demos the router can be initialized or pre-provisioned beforehand. The development benefits of docker images for Lambda outweigh the small init time impact on cold starts.

# Notes on Performance

## Router

For best demo performance (and real user performance), the memory for the Router Lambda should be set to 1024 MB as this gives the fasted cold start at the lowest cost. The cost per warm request is actually lower at 1024 MB than at 128 MB, so 1024 MB is just the ideal size.

For supremely optimum demo performance the Router Lambda should be deployed as a .zip file as that saves about 50% of the cold start time, or about 200 ms, but once it's the cold start has happened they are equally as fast as each other.

- Lambda Memory (which linearly scales CPU) Speeds
  - Docker Image Lambda
    - Note: All times captured with Rollup ~400 KB Docker Layer
    - 128 MB
      - Duration Warm: 118 ms
      - Duration Cold: 763 ms
      - Init Duration: 518 ms
      - Billed Duration Warm: 119 ms
      - Billed Duration Init: 1,282 ms
      - Warm Cost: 0.025 millicents
      - Init Cost: 0.26 millicents
    - 256 MB
      - Duration Warm: 30 ms
      - Duration Cold: 363 ms
      - Init Duration: 488 ms
      - Billed Duration Warm: 30 ms
      - Billed Duration Init: 853 ms
      - Warm Cost: 0.013 millicents
      - Init Cost: 0.36 millicents
    - 512 MB
      - Duration Warm: 10 ms
      - Duration Cold: 176 ms
      - Init Duration: 572 ms
      - Billed Duration Warm: 10 ms
      - Billed Duration Init: 749 ms
      - Warm Cost: 0.0083 millicents
      - Init Cost: 0.62 millicents
    - 1024 MB
      - Duration Warm: 9 ms
      - Duration Cold: 84.5 ms
      - Init Duration: 497 ms
      - Billed Duration Warm: 9 ms
      - Billed Duration Init: 585 ms
      - Warm Cost: 0.015 millicents
      - Init Cost: 0.97 millicents
      - _Init performance scales linearly up to and including 1024 MB_
    - 1769 MB
      - This is the point at which a Lambda has 100% of 1 CPU
      - https://docs.aws.amazon.com/lambda/latest/dg/configuration-memory.html
      - Duration Warm: 8.31 ms
      - Duration Cold: 73 ms
      - Init Duration: 514 ms
      - Billed Duration Warm: 10 ms
      - Billed Duration Cold: 587 ms
      - Warm Cost: 0.029 millicents
      - Init Cost: 1.7 millicents
    - 2048 MB
      - Duration Warm: 10 ms
      - Duration Cold: 67 ms
      - Init Duration: 497 ms
      - Billed Duration Warm: 11 ms
      - Billed Duration Init: 566 ms
      - Warm Cost: 0.037 millicents
      - Init Cost: 1.89 millicents
  - Zip File Lambda
    - 128 MB
      - Duration Warm: 110 ms
      - Duration Cold: 761 ms
      - Init Duration: 210 ms
      - Billed Duration Warm: 120 ms
      - Billed Duration Init: 762 ms
      - Warm Cost: 0.025 millicents
      - Init Cost: 0.16 millicents
    - 512 MB
      - Duration Warm: 10 ms
      - Duration Cold: 179 ms
      - Init Duration: 201 ms
      - Billed Duration Warm: 12 ms
      - Billed Duration Init: 185 ms
      - Warm Cost: 0.01 millicents
      - Init Cost: 0.15 millicents
    - 1024 MB
      - Duration Warm: 10 ms
      - Duration Cold: 85 ms
      - Init Duration: 185 ms
      - Billed Duration Warm: 12 ms
      - Billed Duration Init: 85 ms
      - Warm Cost: 0.02 millicents
      - Init Cost: 0.14 millicents
