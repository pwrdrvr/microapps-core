# Overview

Instructions, tools, and tips for those wishing to contribute.

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
npm ERR! path /Users/myusername/pwrdrvr/microapps-core/node_modules/@pwrdrvr/microapps-publish/dist/src/index.js
npm ERR! errno -2
npm ERR! enoent ENOENT: no such file or directory, chmod '/Users/myusername/pwrdrvr/microapps-core/node_modules/@pwrdrvr/microapps-publish/dist/src/index.js'
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

Challenge: `projen` does not support monorepos well, so it can build, tag, version, and release the CDK Construct library in `src/microapps-cdk` but it cannot be invoked to release `src/microapps-publish` and, because it doesn't support monorepos well, it cannot build and publish both in one invocation.

Below are tips, tricks, and commands used to build and release `microapps-publish` to NPM after `microapps-cdk` is done being published by `projen`.

## Get the Version that Projen Tagged

Note: this _has_ to be run in the root of the project on a clean tree (no changed files).

`npm version from-git --allow-same-version --no-git-tag-version`

Example output: `v0.9.3`

## Apply Version to Package.json

Note: this can accept the `v`-prefixed version (e.g. `v0.9.3`) retrieved from `npm version from-git --allow-same-version`

- `cd src/microapps-publish`
- `npm version v0.9.3 --no-git-tag-version`

# Cleaning Git History

## Example `filter.txt`

`literal:something_to_replace`
