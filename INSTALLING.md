# Overview

This document provides instructions to install the core infrastructure for the MicroApps framework.

# Prerequisites

- `nvm`
- `node 15` installed with `nvm`
- `make`
- `npm i -g aws-cdk`

# Installing NPM Packages

- `npm run preinstall`
  - This will create a file that allows the `npm i` to succeed
- `npm i`

# Bootstrapping a Stack

Bringing up a MicroApps stack requires creating the ECR repositories first, then pushing an image to the ECR repos, and finally creating the remaining stacks that contain Lambda functions that depend on the ECR repositories (AWS will refuse to create a Lambda function against an empty repository or missing image tag).

Note: passing `CODEBUILD_SOURCE_VERSION=pr/NN`, where NN is a number, will cause the stack to get marked as ephemeral which will set the removal policy for the AWS assets to destroy.

## All-In-One Bootstrap with Make

- `AWS_REGION=us-east-2 CODEBUILD_SOURCE_VERSION=pr/42 NODE_ENV=dev ENV=dev make codebuild-deploy`

## Manual Steps

- `CODEBUILD_SOURCE_VERSION=pr/42 NODE_ENV=dev cdk deploy microapps-repos-dev-pr-42`
- [TBC] - Publish the docker images
- `CODEBUILD_SOURCE_VERSION=pr/42 NODE_ENV=dev cdk deploy microapps-r53-dev-pr-42`
