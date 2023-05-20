# Overview

`pwrdrvr` is the CLI used to deploy new MicroApps and new versions for existing MicroApps using the [MicroApps framework](https://github.com/pwrdrvr/microapps-core/).

# Table of Contents <!-- omit in toc -->

- [Overview](#overview)
- [Video Preview of Deploying an App](#video-preview-of-deploying-an-app)
- [Installation](#installation)
- [Usage](#usage)
  - [Command - help](#command---help)
  - [Command - preflight](#command---preflight)
  - [Command - publish](#command---publish)
  - [Command - publish-static](#command---publish-static)
  - [Command - nextjs-version](#command---nextjs-version)
  - [Command - nextjs-version-restore](#command---nextjs-version-restore)
  - [Command - delete](#command---delete)

# Video Preview of Deploying an App

![Video Preview of Deploying an App](https://raw.githubusercontent.com/pwrdrvr/microapps-core/main/assets/videos/pwrdrvr-demo-deploy.gif)

# Installation

`npm i -g pwrdrvr`

# Usage

## Command - help

`npx pwrdrvr help`

```
Publish tool for deploying apps and updates

VERSION
  pwrdrvr/0.0.0 darwin-arm64 node-v18.12.1

USAGE
  $ pwrdrvr [COMMAND]

COMMANDS
  delete                  Delete app/version
  help                    display help for pwrdrvr
  nextjs-version          Apply version to next.config.js overtop of 0.0.0 placeholder
  nextjs-version-restore  Restore next.config.js
  preflight               Check if app/version are available
  publish                 Publish arbitrary framework app - deploy static assets to S3, alias the $LATEST Lambda
                          function, and add integration/route to API Gateway.
  publish-static          Publish arbitrary framework static app - deploy static assets to S3 only.
```

## Command - preflight

`npx pwrdrvr preflight help`

```
Check if app/version are available

USAGE
  $ pwrdrvr preflight

OPTIONS
  -a, --app-name=app-name                          MicroApps app name (this becomes the path the app is rooted at)
  -d, --deployer-lambda-name=deployer-lambda-name  Name of the deployer lambda function
  -n, --new-version=new-version                    New semantic version to apply

  -o, --overwrite                                  Allow overwrite - Warn but do not fail if version exists.
                                                   Discouraged outside of test envs if cacheable static files have
                                                   changed.

  -v, --version                                    show CLI version

  --help                                           show CLI help

EXAMPLE
  $ pwrdrvr preflight -d microapps-deployer-dev -a release -n 0.0.13
  ✔ Preflight Version Check [0.2s]
```

## Command - publish

`npx pwrdrvr publish help`

```
Publish arbitrary framework app - deploy static assets to S3, alias the $LATEST Lambda function, and add integration/route to API Gateway.

USAGE
  $ pwrdrvr publish

OPTIONS
  -a, --app-name=app-name                          MicroApps app name (this becomes the path the app is rooted at)
  -d, --deployer-lambda-name=deployer-lambda-name  Name of the deployer lambda function

  -i, --default-file=default-file                  Default file to return when the app is loaded via the router
                                                   without a version (e.g. when app/ is requested).

  -l, --app-lambda-name=app-lambda-name            ARN of lambda version, alias, or function (name or ARN) to deploy

  -n, --new-version=new-version                    New semantic version to apply

  -o, --overwrite                                  Allow overwrite - Warn but do not fail if version exists.
                                                   Discouraged outside of test envs if cacheable static files have
                                                   changed.

  -s, --static-assets-path=static-assets-path      Path to files to be uploaded to S3 static bucket at app/version/
                                                   path.  Do include app/version/ in path if files are already
                                                   "rooted" under that path locally.

  -t, --type=(apigwy|lambda-url|url|static)        [default: lambda-url] Type of the application and how its
                                                   requests are routed

  -u, --url=url                                    URL for `url` type applications

  -v, --version                                    show CLI version

  --help                                           show CLI help

  --no-cache                                       Force revalidation of CloudFront and browser caching of static
                                                   assets

  --startup-type=(iframe|direct)                   [default: iframe] How the app should be loaded

EXAMPLE
  $ pwrdrvr publish -d microapps-deployer-dev -l microapps-app-release-dev -a release -n 0.0.21
  ✔ Get S3 Temp Credentials [1s]
  ✔ Deploy to Lambda [0.6s]
  ✔ Confirm Static Assets Folder Exists [0.0s]
  ✔ Copy Static Files to Local Upload Dir [0.0s]
  ✔ Enumerate Files to Upload to S3 [0.0s]
  ✔ Upload Static Files to S3 [1s]
  ✔ Creating MicroApp Application: release [0.0s]
  ✔ Creating MicroApp Version: 0.0.21 [1s]
```

## Command - publish-static

`npx pwrdrvr publish-static help`

```
Publish arbitrary framework static app - deploy static assets to S3 only.

USAGE
  $ pwrdrvr publish-static

OPTIONS
  -a, --app-name=app-name                          MicroApps app name (this becomes the path the app is rooted at)
  -d, --deployer-lambda-name=deployer-lambda-name  Name of the deployer lambda function

  -i, --default-file=default-file                  Default file to return when the app is loaded via the router
                                                   without a version (e.g. when app/ is requested).

  -n, --new-version=new-version                    New semantic version to apply

  -o, --overwrite                                  Allow overwrite - Warn but do not fail if version exists.
                                                   Discouraged outside of test envs if cacheable static files have
                                                   changed.

  -s, --static-assets-path=static-assets-path      Path to files to be uploaded to S3 static bucket at app/version/
                                                   path.  Do include app/version/ in path if files are already
                                                   "rooted" under that path locally.

  -v, --version                                    show CLI version

  --help                                           show CLI help

  --no-cache                                       Force revalidation of CloudFront and browser caching of static
                                                   assets

EXAMPLE
  $ pwrdrvr publish-static -d microapps-deployer-dev -l microapps-app-release-dev -a release -n 0.0.21
  ✔ Get S3 Temp Credentials [1s]
  ✔ Confirm Static Assets Folder Exists [0.0s]
  ✔ Copy Static Files to Local Upload Dir [0.0s]
  ✔ Enumerate Files to Upload to S3 [0.0s]
  ✔ Upload Static Files to S3 [1s]
  ✔ Creating MicroApp Application: release [0.0s]
  ✔ Creating MicroApp Version: 0.0.21 [1s]
```

## Command - nextjs-version

`npx pwrdrvr nextjs-version help`

```
Apply version to next.config.js overtop of 0.0.0 placeholder

USAGE
  $ pwrdrvr nextjs-version

OPTIONS
  -l, --leave-copy               Leave a copy of the modifed files as .modified
  -n, --new-version=new-version  New semantic version to apply
  -v, --version                  show CLI version
  --help                         show CLI help

EXAMPLE
  $ pwrdrvr nextjs-version -n 0.0.13
  ✔ Modifying Config Files [0.0s]
```

## Command - nextjs-version-restore

`npx pwrdrvr nextjs-version-restore help`

```
Restore next.config.js

USAGE
  $ pwrdrvr nextjs-version-restore

OPTIONS
  -v, --version  show CLI version
  --help         show CLI help

EXAMPLE
  $ pwrdrvr nextjs-version-restore
  ✔ Restoring Modified Config Files [0.0s]
```

## Command - delete

`npx pwrdrvr delete help`

```
Delete app/version

USAGE
  $ pwrdrvr delete

OPTIONS
  -a, --app-name=app-name                          MicroApps app name (this becomes the path the app is rooted at)
  -d, --deployer-lambda-name=deployer-lambda-name  Name of the deployer lambda function
  -n, --new-version=new-version                    New semantic version to apply
  -v, --version                                    show CLI version
  --help                                           show CLI help

EXAMPLE
  $ pwrdrvr delete -d microapps-deployer-dev -a release -n 0.0.13
  ✔ App/Version deleted: release/0.0.13 [1.2s]
```
