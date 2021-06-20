# Overview

This document contains instructions, tips, and example commands for those contributing to the project.

# Testing New Versions Locally

- In the root of this repository, build the app and link it
  - `npm run build`
  - `npm link`
- In the consuming app directory
  - `npm link --save-dev @pwrdrvr/microapps-publish`
- Test the version
  - `npx microapps-publish --help`
- Unlink when done
  - `npx @pwrdrvr/microapps-publish`

[More Info](https://dev.to/jamesqquick/how-to-test-npm-packages-locally-5elb)
