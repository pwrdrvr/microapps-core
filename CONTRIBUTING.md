# Overview

Instructions, tools, and tips for those wishing to contribute.

# Table of Contents <!-- omit in toc -->

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installing Dependencies](#installing-dependencies)
  - [Why pnpm is the default](#why-pnpm-is-the-default)
- [Bootstrapping Projen Templates](#bootstrapping-projen-templates)
- [Releasing NPM Packages](#releasing-npm-packages)
  - [Get the Version that Projen Tagged](#get-the-version-that-projen-tagged)
  - [Apply Version to `pwrdrvr` Package.json](#apply-version-to-pwrdrvr-packagejson)
- [Cleaning Git History](#cleaning-git-history)
  - [Example `filter.txt`](#example-filtertxt)

# Prerequisites

- `nvm`
- `node 22` installed with `nvm`
- `corepack` enabled so `pnpm` is available
- `npm i -g aws-cdk`

# Installing Dependencies

Install dependencies from the repo root with:

```sh
corepack enable pnpm
pnpm install
```

## Why pnpm is the default

Historically, this repo used Yarn because npm workspace installs had a circular `bin` linking problem with the local CLI packages. pnpm handles the workspace layout cleanly while still giving us a committed lockfile and reproducible installs.

# Bootstrapping Projen Templates

Note: prefer pnpm for repo development. The command below is historical context for the original construct bootstrap and is not the current workspace package manager recommendation.

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
