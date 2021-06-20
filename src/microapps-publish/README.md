# Overview

`microapps-publish` is used to deploy new apps and new versions for existing apps using the [MicroApps framework](https://github.com/pwrdrvr/microapps-core/).

# Current Limitations

# Supports Only Docker-based Lambda Function

As of 2021-06-20, the tool invokes a Docker build to publish an app or an updated version of an existing app. This was convenient during initial development of the tool but can easily be de-coupled to allow the end user to publish their own Lambda version and simply pass the ARN as a reference to this publishing tool.

# Supports Only for Next.js Apps

As of 2021-06-20, the tool is more tightly coupled with Next.js than it should be (i.e. it invokes a build using [serverless-next.js](https://github.com/serverless-nextjs/serverless-next.js) to build the Next.js app and it modifies versions in files needed to get Next.js apps to run in re-rooted directories). There is nothing that inherintly requires that apps use Next.js at all so this will be generalized to additional frameworks soon.
