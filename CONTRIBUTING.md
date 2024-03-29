# Overview

Instructions, tools, and tips for those wishing to contribute.

# Table of Contents <!-- omit in toc -->

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [TIP: Installing npm Modules](#tip-installing-npm-modules)
  - [Creating a Dummy `.js` file for `npm i`](#creating-a-dummy-js-file-for-npm-i)
  - [Log Output from Circular Dependency Failure](#log-output-from-circular-dependency-failure)
- [Bootstrapping Projen Templates](#bootstrapping-projen-templates)
- [Releasing NPM Packages](#releasing-npm-packages)
  - [Get the Version that Projen Tagged](#get-the-version-that-projen-tagged)
  - [Apply Version to `pwrdrvr` Package.json](#apply-version-to-pwrdrvr-packagejson)
- [Cleaning Git History](#cleaning-git-history)
  - [Example `filter.txt`](#example-filtertxt)

# Prerequisites

- `nvm`
- `node 16` installed with `nvm`
- `npm i -g aws-cdk`

# TIP: Installing npm Modules

Attempting to run `npm i` will fail because of a chicken and egg problem with npm 7 workspaces, TypeScript transpiled .js output files, and `bin` in `package.json`. npm wants the files pointed to by `bin` to exist when linking to workspaces, but the `.js` files can't exist until `npm i` and `npm run build` build, which is a circular dependency. npm also, unfortunately, [gives no way to run a script before installing dependencies](https://stackoverflow.com/questions/46725374/how-to-run-a-script-before-installing-any-npm-module) thus we must manually run our script before running `npm i`.

## Creating a Dummy `.js` file for `npm i`

To create the dummy files that will allow `npm i` or `npm ci` to proceed, simply run:

```sh
npm run preinstall
```

## Log Output from Circular Dependency Failure

```log
npm ERR! code ENOENT
npm ERR! syscall chmod
npm ERR! path /Users/myusername/pwrdrvr/microapps-core/node_modules/@pwrdrvr/microapps-publish/dist/index.js
npm ERR! errno -2
npm ERR! enoent ENOENT: no such file or directory, chmod '/Users/myusername/pwrdrvr/microapps-core/node_modules/@pwrdrvr/microapps-publish/dist/index.js'
npm ERR! enoent This is related to npm not being able to find a file.
npm ERR! enoent
```

# Bootstrapping Projen Templates

Note: `npm` has a problem with `jest` as CDK wants version 26 and `projen` installs version 27. This works with `yarn` but causes `npm` to complain.

```
npm i -g projen

npx projen new awscdk-construct --no-git --name @pwrdrvr/microapps-cdk --author "Harold Hunt" --package-manager npm --license MIT --npm-access public --copyright-owner "PwrDrvr LLC" --copyright-period 2020 --projenrc-ts --no-jest
```

# Releasing NPM Packages

Challenge: `projen` does not support monorepos well, so it can build, tag, version, and release the CDK Construct library in `packages/microapps-cdk` but it cannot be invoked to release `packages/pwrdrvr` and, because it doesn't support monorepos well, it cannot build and publish both in one invocation.

Below are tips, tricks, and commands used to build and release `pwrdrvr` to NPM after `microapps-cdk` is done being published by `projen`.

## Get the Version that Projen Tagged

Note: this _has_ to be run in the root of the project on a clean tree (no changed files).

Note: this _has_ to be done with `npm 7.18.1` in `node 16` as a fix from April, 2021 is required in some cases: https://github.com/npm/libnpmversion/pull/12

`npm version from-git --allow-same-version --no-git-tag-version`

Example output: `v0.9.3`

## Apply Version to `pwrdrvr` Package.json

Note: this can accept the `v`-prefixed version (e.g. `v0.9.3`) retrieved from `npm version from-git --allow-same-version --no-git-tag-version`

- `npm version v0.9.3 --no-git-tag-version --workspaces`

# Cleaning Git History

## Example `filter.txt`

`literal:something_to_replace`
