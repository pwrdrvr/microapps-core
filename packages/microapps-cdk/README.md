![Build/Deploy CI](https://github.com/pwrdrvr/microapps-core/actions/workflows/ci.yml/badge.svg) ![Main Build](https://github.com/pwrdrvr/microapps-core/actions/workflows/main-build.yml/badge.svg) ![Release](https://github.com/pwrdrvr/microapps-core/actions/workflows/release.yml/badge.svg)

# Overview

The MicroApps project enables rapidly deploying many web apps to AWS on a single shared host name, fronted by a CloudFront Distribution, serving static assets from an S3 Bucket, and routing application requests via API Gateway.

MicroApps allows many versions of an application to be deployed either as ephemeral deploys (e.g. for pull request builds) or as semi-permanent deploys. The `microapps-router` Lambda function handled routing requests to apps to the current version targeted for a particular application start request using rules as complex as one is interested in implementing (e.g. A/B testing integration, canary releases, per-user rules for logged in users, per-group, per-deparment, and default rules).

Users start applications via a URL such as `[/{prefix}]/{appname}/`, which hits the `microapps-router` that looks up the version of the application to be run, then renders a transparent `iframe` with a link to that version. The URL seen by the user in the browser (and available for bookmarking) has no version in it, so subsequent launches (e.g. the next day or just in another tab) will lookup the version again. All relative URL API requests (e.g. `some/api/path`) will go to the corresponding API version that matches the version of the loaded static files, eliminating issues of incompatibility between static files and API deployments.

For development / testing purposes only, each version of an applicaton can be accessed directly via a URL of the pattern `[/{prefix}]/{appname}/{semver}/`. These "versioned" URLs are not intended to be advertised to end users as they would cause a user to be stuck on a particular version of the app if the URL was bookmarked. Note that the system does not limit access to particular versions of an application, as of 2022-01-26, but that can be added as a feature.

# Why MicroApps

MicroApps are like micro services, but for Web UIs. A MicroApp allows a single functional site to be developed by many independent teams within an organization. Teams must coordinate deployments and agree upon one implementation technology and framework when building a monolithic, or even a monorepo, web application.

Teams using MicroApps can deploy independently of each other with coordination being required only at points of intentional integration (e.g. adding a feature to pass context from one MicroApp to another or coordination of a major feature release to users) and sharing UI styles, if desired (it is possible to build styles that look the same across many different UI frameworks).

MicroApps also allow each team to use a UI framework and backend language that is most appropriate for their solving their business problem. Not every app has to use React or Next.js or even Node on the backend, but instead they can use whatever framework they want and Java, Go, C#, Python, etc. for UI API calls.

# Related Projects

- Release App
  - The Release app is an initial, rudimentary, release control console for setting the default version of an application
  - Built with Next.js
  - [](https://github.com/pwrdrvr/microapps-app-release)
- Next.js Demo App
  - The Next.js Tutorial application deployed as a MicroApp
  - [](https://github.com/pwrdrvr/serverless-nextjs-demo)
- Serverless Next.js Router
  - [](https://github.com/pwrdrvr/serverless-nextjs-router)
  - Complementary to [@sls-next/serverless-component](https://github.com/serverless-nextjs/serverless-next.js)
  - Allows Next.js apps to run as Lambda @ Origin for speed and cost improvements vs Lambda@Edge
  - Essentially the router translates CloudFront Lambda events to API Gateway Lambda events and vice versa for responses
  - The `serverless-nextjs` project allows Next.js apps to run as Lambda functions without Express, but there was a design change to make the Lambda functions run at Edge (note: need to recheck if this changed after early 2021)
    - Lambda@Edge is _at least_ 3x more expensive than Lambda at the origin:
      - In US East 1, the price per GB-Second is $0.00005001 for Lambda@Edge vs $0.0000166667 for Lambda at the origin
    - Additionally, any DB or services calls from Lambda@Edge back to the origin will pay that 3x higher per GB-Second cost for any time spent waiting to send the request and get a response. Example:
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

![Architecure Diagram](https://github.com/pwrdrvr/microapps-core/blob/main/assets/images/architecture-diagram.png)

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
