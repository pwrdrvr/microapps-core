# Overview

The MicroApps project....

# Project Layout

- [src/cdk]() - CDK Stacks
  - MicroAppsS3
    - Creates S3 buckets
  - MicroAppsRepos
    - Creates the ECR repos for components to be published into;
      - Deployer
      - Router
  - MicroAppsSvcs
    - Create DynamoDB table
    - Create Deployer Lambda function
    - Create Router Lambda function
    - Create APIGateway HTTP API
  - MicroAppsCF
    - Creates Cloudfront distribution
  - MicroAppsR53
    - Creates domain names to point to the edge (Cloudfront) and origin (API Gateway)
- [src/microapps-deployer]()
  - Lambda service invoked by `microapps-publish` to record new app/version in the DynamoDB table, create API Gateway integrations, copy S3 assets from staging to prod bucket, etc.
- [src/microapps-publish]()
  - Node executable that updates versions in config files, deploys static assets to the S3 staging bucket, optionally compiles and deploys a new Lambda function version, and invokes `microapps-deployer`
  - Permissions required:
    - Lambda invoke
    - S3 publish to the staging bucket
    - ECR write
    - Lambda version publish
- [src/microapps-router]()
  - Lambda function that determines which version of an app to point a user to on a particular invocation

# Useful Commands

- `npm run build` compiles TypeSript to JavaScript
- `npm run lint` checks TypeScript for compliance with Lint rules
- `cdk list` list the stack names
- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template

# Running CDK

Always run CDK from the root of the git repo, which is the directory containing `cdk.json`.

## Set AWS Profile

`export AWS_PROFILE=pwrdrvr`

## Set NVM Version

`nvm use`

# Deployer Service

Copies static assets from staging to deployed directory, creates record of application / version in DynamoDB Table.

## Build and Deploy Update

```
make aws-ecr-login
make aws-ecr-publish-deployer
make aws-lambda-update-deployer
```

# Notes on Selection of Docker Image Lambdas

The Router and Deployer services are very small (0.5 MB) after tree shaking, minification, and uglification performed by `rollup`. The router has the tightest performance requirement and performed just as well as a docker image vs a zip file. However, docker image start up is up to 2x longer vs the zip file for the router; this should not be a problem for any live system with continuous usage and for demos the router can be initialized or pre-provisioned beforehand. The development benefits of docker images for Lambda outweigh the small init time impact on cold starts.

# Notes on Performance

## Router

For best demo performance (and real user performance), the memory for the Router Lambda should be set to 1024 MB as this gives the fastest cold start at the lowest cost. The cost per warm request is actually lower at 1024 MB than at 128 MB, so 1024 MB is just the ideal size.

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
