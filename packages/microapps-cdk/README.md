[![CI](https://github.com/pwrdrvr/microapps-core/actions/workflows/ci.yml/badge.svg)](https://github.com/pwrdrvr/microapps-core/actions/workflows/ci.yml) [![Merge to Main Build](https://github.com/pwrdrvr/microapps-core/actions/workflows/main-build.yml/badge.svg)](https://github.com/pwrdrvr/microapps-core/actions/workflows/main-build.yml) [![Release Packages](https://github.com/pwrdrvr/microapps-core/actions/workflows/release.yml/badge.svg)](https://github.com/pwrdrvr/microapps-core/actions/workflows/release.yml)

# Overview

The MicroApps project enables rapidly deploying many web apps to AWS on a single shared host name, fronted by a CloudFront Distribution, serving static assets from an S3 Bucket, and routing application requests via API Gateway. MicroApps is delivered as a CDK Construct for deployment, although alternative deployment methods can be used if desired and implemented.

MicroApps allows many versions of an application to be deployed either as ephemeral deploys (e.g. for pull request builds) or as semi-permanent deploys. The `microapps-router` Lambda function handled routing requests to apps to the current version targeted for a particular application start request using rules as complex as one is interested in implementing (e.g. A/B testing integration, canary releases, per-user rules for logged in users, per-group, per-deparment, and default rules).

Users start applications via a URL such as `[/{prefix}]/{appname}/`, which hits the `microapps-router` Lambda@Edge OriginRequest handler that looks up the version of the application to be run, and either forwards the request to the target Lambda Function URL (`--startupType direct` invoke mode) or returns a transparent `iframe` (`--startupType iframe`) with a link to that version.  `direct` mode works with frameworks, like Next.js, that can return pages that have build-time computed relative URLs to static resources and API calls.  `iframe` mode works with frameworks that do not write computed relative URLs at build time and/or that do not use URLs that are completely relative to wherever the applications is rooted at runtime; this mode is primarily for quick prototyping as it has other complications (such as indirect access to query strings). The URL seen by the user in the browser (and available for bookmarking) has no version in it, so subsequent launches (e.g. the next day or just in another tab) will lookup the version again. All relative URL API requests (e.g. `some/api/path`) will go to the corresponding API version that matches the version of the loaded static files, eliminating issues of incompatibility between static files and API deployments.

For development / testing purposes only, each version of an applicaton can be accessed directly via a URL of the patterns `[/{prefix}]/{appname}?appver={semver}` for `direct` mode or `[/{prefix}]/{appname}/{semver}/` for `iframe` mode. These "versioned" URLs are not intended to be advertised to end users as they would cause a user to be stuck on a particular version of the app if the URL was bookmarked. Note that the system does not limit access to particular versions of an application, as of 2023-03-04, but that can be added as a feature.

# Table of Contents <!-- omit in toc -->

- [Overview](#overview)
- [Why MicroApps](#why-microapps)
- [Request Routing for Static Assets / App - Diagram](#request-routing-for-static-assets--app---diagram)
- [Request Dispatch Model for Multi-Account Deployments](#request-dispatch-model-for-multi-account-deployments)
- [Video Preview of the Deploying CDK Construct](#video-preview-of-the-deploying-cdk-construct)
- [Installation / CDK Constructs](#installation--cdk-constructs)
- [Tutorial - Bootstrapping a Deploy](#tutorial---bootstrapping-a-deploy)
- [Limitations / Future Development](#limitations--future-development)
- [Related Projects / Components](#related-projects--components)
- [Why Lambda @ Origin and Not Lambda @ Edge for Apps](#why-lambda--origin-and-not-lambda--edge-for-apps)
- [Architecure Diagram](#architecure-diagram)
- [Project Layout](#project-layout)
- [Creating a MicroApp Using Zip Lambda Functions](#creating-a-microapp-using-zip-lambda-functions)
- [Creating a MicroApp Using Docker Lambda Functions](#creating-a-microapp-using-docker-lambda-functions)
  - [Next.js Apps](#nextjs-apps)
    - [Modify package.json](#modify-packagejson)
    - [Install Dependencies](#install-dependencies)
    - [Dockerfile](#dockerfile)
    - [next.config.js](#nextconfigjs)
- [Troubleshooting](#troubleshooting)
  - [CloudFront Requests to API Gateway are Rejected with 403 Forbidden](#cloudfront-requests-to-api-gateway-are-rejected-with-403-forbidden)
    - [SignatureV4 Headers](#signaturev4-headers)

# Why MicroApps

MicroApps are like micro services, but for Web UIs. A MicroApp allows a single functional site to be developed by many independent teams within an organization. Teams must coordinate deployments and agree upon one implementation technology and framework when building a monolithic, or even a monorepo, web application.

Teams using MicroApps can deploy independently of each other with coordination being required only at points of intentional integration (e.g. adding a feature to pass context from one MicroApp to another or coordination of a major feature release to users) and sharing UI styles, if desired (it is possible to build styles that look the same across many different UI frameworks).

MicroApps also allow each team to use a UI framework and backend language that is most appropriate for their solving their business problem. Not every app has to use React or Next.js or even Node on the backend, but instead they can use whatever framework they want and Java, Go, C#, Python, etc. for UI API calls.

For internal sites, or logged-in-customer sites, different tools or products can be hosted in entirely independent MicroApps. A menuing system / toolbar application can be created as a MicroApp and that menu app can open the apps in the system within a transparent iframe. For externally facing sites, such as for an e-commerce site, it is possible to have a MicroApp serving `/product/...`, another serving `/search/...`, another serving `/`, etc.

# Request Routing for Static Assets / App - Diagram

![Request Routing for Static Assets and App](https://user-images.githubusercontent.com/5617868/222913451-0e6ed906-b6ee-461f-99a7-61db13135ce1.png)

# Request Dispatch Model for Multi-Account Deployments

Note: requests can also be dispatched into the same account, but this model is more likely to be used by organizations with many AWS accounts.

![Request Dispatch Model for Mulit-Account Deployments](https://user-images.githubusercontent.com/5617868/218237120-65b3ae44-31ba-4b6d-8722-4d3fb7da5577.png)

# Video Preview of the Deploying CDK Construct

![Video Preview of Deploying](https://raw.githubusercontent.com/pwrdrvr/microapps-core/main/assets/videos/microapps-core-demo-deploy.gif)

# Installation / CDK Constructs

- `npm i --save-dev @pwrdrvr/microapps-cdk`
- Add `MicroApps` construct to your stack
- The `MicroApps` construct does a "turn-key" deployment complete with the Release app
- [Construct Hub](https://constructs.dev/packages/@pwrdrvr/microapps-cdk/)
  - CDK API docs
  - Python, DotNet, Java, JS/TS installation instructions

# Tutorial - Bootstrapping a Deploy

- `git clone https://github.com/pwrdrvr/microapps-core.git`
  - Note: the repo is only being for the example CDK Stack, it is not necessary to clone the repo when used in a custom CDK Stack
- `cd microapps-core`
- `npm i -g aws-cdk`
  - Install AWS CDK v2 CLI
- `asp [my-sso-profile-name]`
  - Using the `aws` plugin from `oh-my-zsh` for AWS SSO
  - Of course, there are other methods of setting env vars
- `aws sso login`
  - Establish an AWS SSO session
- `export AWS_REGION=us-east-2`
  - Region needs to be set for the Lambda invoke - This can be done other ways in `~/.aws/config` as well
- `./deploy.sh`
  - Deploys the CDK Stack
  - Essentially runs two commands along with extraction of outputs:
    - `npx cdk deploy --context @pwrdrvr/microapps:deployReleaseApp=true microapps-basic`
    - `npx microapps-publish publish --app-name release --new-version ${RELEASE_APP_PACKAGE_VERSION} --deployer-lambda-name ${DEPLOYER_LAMBDA_NAME} --app-lambda-name ${RELEASE_APP_LAMBDA_NAME} --static-assets-path node_modules/@pwrdrvr/microapps-app-release-cdk/lib/static_files/release/${RELEASE_APP_PACKAGE_VERSION}/ --overwrite --no-cache`
  - URL will be printed as last output

# Limitations / Future Development

- AWS Only
  - For the time being this has only been implemented for AWS technologies and APIs
  - It is possible that Azure and GCP have sufficient support to enable porting the framework
  - CDK would have to be replaced as well (unless it's made available for Azure and GCP in the near future)
- `microapps-publish` only supports Lambda function apps
  - There is no technical reason for the apps to only run as Lambda functions
  - Web apps could just as easily run on EC2, Kubernetes, EKS, ECS, etc
  - Anything that API Gateway can route to can work for serving a MicroApp
  - The publish tool needs to provide additional options for setting up the API Gateway route to the app
- Authentication
  - Authentication requires rolling your own API Gateway and CloudFront deployment at the moment
  - The "turn key" CDK Construct should provide options to show an example of how authentication can be integrated
- Release Rules
  - Currently only a Default rule is supported
  - Need to evaluate if a generic implementation can be made, possibly allowing plugins or webhooks to support arbitrary rules
  - If not possible to make it perfectly generic, consider providing a more complete reference implementation of examples

# Related Projects / Components

- Release App
  - The Release app is an initial, rudimentary, release control console for setting the default version of an application
  - Built with Next.js
  - [pwrdrvr/microapps-app-release](https://github.com/pwrdrvr/microapps-app-release)
- Next.js Demo App
  - The Next.js Tutorial application deployed as a MicroApp
  - [pwrdrvr/serverless-nextjs-demo](https://github.com/pwrdrvr/serverless-nextjs-demo)


# Why Lambda @ Origin and Not Lambda @ Edge for Apps

Calling resources (DBs and other services) and waiting for a long synchronous response is an anti-pattern in Lambda as the Lambda function will be billed for the time spent waiting for the response. This is especially true for Lambda@Edge as the cost is 3x higher than Lambda at the origin.

With Lambda@Edge (even with Origin Requests) the cost is 3x higher per GB-second and the time spent waiting for a 1 ms service response from an origin that is 250 ms away is 750x higher (250 ms / 1ms * 3x higher cost) than making that same request within the region where the resource resides.

- Lambda@Edge is _at least_ 3x more expensive than Lambda at the origin:
  - In US East 1, the price per GB-Second is $0.00005001 for Lambda@Edge
    - Source: https://aws.amazon.com/lambda/pricing/ (bottom of page)
    - Updated: 2023-03-04
  - In US East 1, the price per GB-Second is $0.0000166667 for Lambda at the origin on x86
    - Source: https://aws.amazon.com/lambda/pricing/
    - Updated: 2023-03-04
  - Ratio
    - Lambda@Edge / Lambda@Origin = $0.00005001 / $0.0000166667 = 3.0006x
- Any DB or services calls from Lambda@Edge back to the origin will pay that 3x higher per GB-Second cost for any time spent waiting to send the request and get a response. Example:
  - Lambda@Edge
    - 0.250s Round Trip Time (RTT) for EU-zone edge request to hit US-East 1 Origin
    - 0.200s DB lookup time
    - 0.050s CPU usage to process the DB response
    - 0.500s total billed time @ $0.00005001 @ 128 MB
    - $0.000003125625 total charge
  - Lambda at Origin
    - RTT does not apply (it's effectively 1-2 ms to hit a DB in the same region)
    - 0.200s DB lookup time
    - 0.050s CPU usage to process the DB response
    - 0.250s total billed time @ $0.0000166667 @ 128 MB
    - Half the billed time of running on Lambda@Edge
    - 1/6th the cost of running on Lambda@Edge:
      - $0.000000520834375 total charge (assuming no CPU time to process the response)
      - $0.000003125625 / $0.000000520834375 = 6x more expensive in Lambda@Edge

# Architecure Diagram

![Architecure Diagram](https://raw.githubusercontent.com/pwrdrvr/microapps-core/main/assets/images/architecture-diagram.png)

# Project Layout

- [packages/cdk](https://github.com/pwrdrvr/microapps-core/tree/main/packages/cdk)
  - Example CDK Stack
  - Deploys MicroApps CDK stack for the GitHub Workflows
  - Can be used as an example of how to use the MicroApps CDK Construct
- [packages/demo-app](https://github.com/pwrdrvr/microapps-core/tree/main/packages/demo-app)
  - Example app with static resources and a Lambda function
  - Does not use any Web UI framework at all
- [packages/microapps-cdk](https://github.com/pwrdrvr/microapps-core/tree/main/packages/microapps-cdk)
  - MicroApps
    - "Turn key" CDK Construct that creates all assets needed for a working MicroApps deployment
  - MicroAppsAPIGwy
    - Create APIGateway HTTP API
    - Creates domain names to point to the edge (Cloudfront) and origin (API Gateway)
  - MicroAppsCF
    - Creates Cloudfront distribution
  - MicroAppsS3
    - Creates S3 buckets
  - MicroAppsSvcs
    - Create DynamoDB table
    - Create Deployer Lambda function
    - Create Router Lambda function
- [packages/microapps-datalib](https://github.com/pwrdrvr/microapps-core/tree/main/packages/microapps-datalib)
  - Installed from `npm`:
    - `npm i -g @pwrdrvr/microapps-datalib`
  - APIs for access to the DynamoDB Table used by `microapps-publish`, `microapps-deployer`, and `@pwrdrvr/microapps-app-release-cdk`
- [packages/microapps-deployer](https://github.com/pwrdrvr/microapps-core/tree/main/packages/microapps-deployer)
  - Lambda service invoked by `microapps-publish` to record new app/version in the DynamoDB table, create API Gateway integrations, copy S3 assets from staging to prod bucket, etc.
  - Returns a temporary S3 token with restricted access to the staging S3 bucket for upload of the static files for one app/semver
- [packages/microapps-publish](https://github.com/pwrdrvr/microapps-core/tree/main/packages/microapps-publish)
  - Installed from `npm`:
    - `npm i -g @pwrdrvr/microapps-publish`
  - Node executable that updates versions in config files, deploys static assets to the S3 staging bucket, optionally compiles and deploys a new Lambda function version, and invokes `microapps-deployer`
  - AWS IAM permissions required:
    - `lambda:InvokeFunction`
- [packages/microapps-router](https://github.com/pwrdrvr/microapps-core/tree/main/packages/microapps-router)
  - Lambda function that determines which version of an app to point a user to on a particular invocation

# Creating a MicroApp Using Zip Lambda Functions

[TBC]

# Creating a MicroApp Using Docker Lambda Functions

Note: semi-deprecated as of 2022-01-27. Zip Lambda functions are better supported.

## Next.js Apps

Create a Next.js app then follow the steps in this section to set it up for publishing to AWS Lambda @ Origin as a MicroApp. To publish new versions of the app use `npx microapps-publish --new-version x.y.z` when logged in to the target AWS account.

### Modify package.json

Replace the version with `0.0.0` so it can be modified by the `microapps-publish` tool.

### Install Dependencies

```
npm i --save-dev @pwrdrvr/microapps-publish
```

### Dockerfile

FIXME: Out of date 2023-03-04

Add this file to the root of the app.

```Dockerfile
FROM node:15-slim as base

WORKDIR /app

# Download the sharp libs once to save time
# Do this before copying anything else in
RUN mkdir -p image-lambda-npms && \
  cd image-lambda-npms && npm i sharp && \
  rm -rf node_modules/sharp/vendor/*/include/

# Copy in the build output from `npx serverless`
COPY .serverless_nextjs .
COPY config.json .

# Move the sharp libs into place
RUN rm -rf image-lambda/node_modules/ && \
  mv image-lambda-npms/node_modules image-labmda/ && \
  rm -rf image-lambda-npms

FROM public.ecr.aws/lambda/nodejs:14 AS final

# Copy in the munged code
COPY --from=base /app .

CMD [ "./index.handler" ]
```

### next.config.js

FIXME: Out of date 2023-03-04

Add this file to the root of the app.

Replace `appname` with your URL path-compatible application name.

```js
const appRoot = '/appname/0.0.0';

// eslint-disable-next-line no-undef
module.exports = {
  target: 'serverless',
  webpack: (config, _options) => {
    return config;
  },
  basePath: appRoot,
  publicRuntimeConfig: {
    // Will be available on both server and client
    staticFolder: appRoot,
  },
};
```

# Troubleshooting

## CloudFront Requests to API Gateway are Rejected with 403 Forbidden

Requests to the API Gateway origin can be rejected with a 403 Forbidden error if the signed request headers are not sent to the origin by CloudFront.

The error in the API Gateway CloudWatch logs will show up as:

```log
"authorizerError": "The request for the IAM Authorizer doesn't match the format that API Gateway expects."
```

This can be simulated by simply running `curl [api-gateway-url]`, with no headers.

To confirm that API Gateway is allowing signed requests when the IAM Authorizer is configured, establish credentials as a user that is allowed to execute the API Gateay, install `awscurl` with `pip3 install awscurl`, then then use `awscurl --service execute-api --region [api-gateway-region] [api-gateway-url]`.

Signature headers will not be sent from CloudFront to API Gateway unless the `OriginRequestPolicy` is set to specifically include those headers on requests to the origin, or the `headersBehavior` is set to `cfront.OriginRequestHeaderBehavior.all()`.

Similarly, if `presign` is used, the `OriginRequestPolicy` must be set to `cfront.OriginRequestQueryStringBehavior.all()` or to specifically forward the query string parameters used by the presigned URL.

### SignatureV4 Headers
- `authorization`
- `x-amz-date`
- `x-amz-security-token`
- `x-amz-content-sha256`
