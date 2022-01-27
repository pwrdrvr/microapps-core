![Build/Deploy CI](https://github.com/pwrdrvr/microapps-core/actions/workflows/ci.yml/badge.svg) ![Main Build](https://github.com/pwrdrvr/microapps-core/actions/workflows/main-build.yml/badge.svg) ![Release](https://github.com/pwrdrvr/microapps-core/actions/workflows/release.yml/badge.svg)

# Overview

The MicroApps project enables rapidly deploying many web apps to AWS on a single shared host name, fronted by a CloudFront Distribution, serving static assets from an S3 Bucket, and routing application requests via API Gateway. MicroApps is delivered as a CDK Construct for deployment, although alternative deployment methods can be used if desired and implemented.

MicroApps allows many versions of an application to be deployed either as ephemeral deploys (e.g. for pull request builds) or as semi-permanent deploys. The `microapps-router` Lambda function handled routing requests to apps to the current version targeted for a particular application start request using rules as complex as one is interested in implementing (e.g. A/B testing integration, canary releases, per-user rules for logged in users, per-group, per-deparment, and default rules).

Users start applications via a URL such as `[/{prefix}]/{appname}/`, which hits the `microapps-router` that looks up the version of the application to be run, then renders a transparent `iframe` with a link to that version. The URL seen by the user in the browser (and available for bookmarking) has no version in it, so subsequent launches (e.g. the next day or just in another tab) will lookup the version again. All relative URL API requests (e.g. `some/api/path`) will go to the corresponding API version that matches the version of the loaded static files, eliminating issues of incompatibility between static files and API deployments.

For development / testing purposes only, each version of an applicaton can be accessed directly via a URL of the pattern `[/{prefix}]/{appname}/{semver}/`. These "versioned" URLs are not intended to be advertised to end users as they would cause a user to be stuck on a particular version of the app if the URL was bookmarked. Note that the system does not limit access to particular versions of an application, as of 2022-01-26, but that can be added as a feature.

# Installation / CDK Constructs

- `npm i --save-dev @pwrdrvr/microapps-cdk`
- Add `MicroApps` construct to your stack
- The `MicroApps` construct does a "turn-key" deployment complete with the Release app
- [Construct Hub](https://constructs.dev/packages/@pwrdrvr/microapps-cdk/)
  - CDK API docs
  - Python, DotNet, Java, JS/TS installation instructions

# Why MicroApps

MicroApps are like micro services, but for Web UIs. A MicroApp allows a single functional site to be developed by many independent teams within an organization. Teams must coordinate deployments and agree upon one implementation technology and framework when building a monolithic, or even a monorepo, web application.

Teams using MicroApps can deploy independently of each other with coordination being required only at points of intentional integration (e.g. adding a feature to pass context from one MicroApp to another or coordination of a major feature release to users) and sharing UI styles, if desired (it is possible to build styles that look the same across many different UI frameworks).

MicroApps also allow each team to use a UI framework and backend language that is most appropriate for their solving their business problem. Not every app has to use React or Next.js or even Node on the backend, but instead they can use whatever framework they want and Java, Go, C#, Python, etc. for UI API calls.

For internal sites, or logged-in-customer sites, different tools or products can be hosted in entirely independent MicroApps. A menuing system / toolbar application can be created as a MicroApp and that menu app can open the apps in the system within a transparent iframe. For externally facing sites, such as for an e-commerce site, it is possible to have a MicroApp serving `/product/...`, another serving `/search/...`, another serving `/`, etc.

# Limitations / Future Development

- `iframes`
  - Yeah, yeah: `iframes` are not framesets and most of the hate about iframes is probably better directed at framesets
  - The iframe serves a purpose but it stinks that it is there, primarily because it will cause issues with search bot indexing (SEO)
  - There are other options available to implement that have their own drabacks:
    - Using the `microapps-router` to proxy the "app start" request to a particular version of an app that then renders all of it's API resource requests to versioned URLs
      - Works only with frameworks that support hashing filenams for each deploy to unique names
      - This page would need to be marked as non-cachable
      - This may work well with Next.js which wants to know the explicit path that it will be running at (it writes that path into all resource and API requests)
      - Possible issue: the app would need to work ok being displayed at `[/{prefix}]/{appname}` when it may think that it's being displayed at `[/{prefix}]/{appname}/{semver}`
      - Disadvantage: requires some level of UI framework features (e.g. writing the absolute resource paths) to work correctly - may not work as easily for all UI frameworks
    - HTML5 added features to allow setting the relative path of all subsequent requests to be different than that displayed in the address bar
      - Gotta see if this works in modern browsers
    - Option to ditch the multiple-versions feature
      - Works only with frameworks that support hashing filenams for each deploy to unique names
      - Allows usage of the deploy and routing tooling without advantages and disadvantages of multiple-versions support
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
