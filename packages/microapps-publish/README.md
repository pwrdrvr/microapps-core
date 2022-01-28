# Overview

`microapps-publish` is used to deploy new apps and new versions for existing apps using the [MicroApps framework](https://github.com/pwrdrvr/microapps-core/).

# Getting Started

## Next.js Apps

Create a Next.js app then follow the steps in this section to set it up for publishing to AWS Lambda @ Origin as a MicroApp. To publish new versions of the app use `npx microapps-publish --new-version x.y.z` when logged in to the target AWS account.

### Modify package.json

Replace the version with `0.0.0` so it can be modified by the `microapps-publish` tool.

### Install Dependencies

```
npm i --save-dev @sls-next/serverless-component@1.19.0 @pwrdrvr/serverless-nextjs-router @pwrdrvr/microapps-publish
```

### Dockerfile

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

### deploy.json

Add this file to the root of the app.

Replace `appname` with your URL path-compatible application name.

```json
{
  "AppName": "appname",
  "SemVer": "0.0.0",
  "DefaultFile": "",
  "StaticAssetsPath": "./.serverless_nextjs/assets/appname/0.0.0/",
  "LambdaARN": "arn:aws:lambda:us-east-1:123456789012:function:appname:v0_0_0",
  "AWSAccountID": "123456789012",
  "AWSRegion": "us-east-2",
  "ServerlessNextRouterPath": "./node_modules/@pwrdrvr/serverless-nextjs-router/dist/index.js"
}
```

### serverless.yaml

Add this file to the root of the app.

```yaml
nextApp:
  component: './node_modules/@sls-next/serverless-component'
  inputs:
    deploy: false
    uploadStaticAssetsFromBuild: false
```
