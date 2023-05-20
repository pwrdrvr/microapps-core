# Overview

This document contains instructions, tips, and example commands for those contributing to the project.

# Testing New Versions Locally

- In the root of this repository, build the app and link it
  - `npm run build`
  - `npm link`
- In the consuming app directory
  - `npm link --save-dev pwrdrvr`
- Test the version
  - `npx pwrdrvr --help`
- Unlink when done
  - `npx pwrdrvr`

[More Info](https://dev.to/jamesqquick/how-to-test-npm-packages-locally-5elb)
