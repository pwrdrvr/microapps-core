# Overview

Instructions, tools, and tips for those wishing to contribute.

# Table of Contents <!-- omit in toc -->

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installing Dependencies](#installing-dependencies)
  - [Why pnpm is the default](#why-pnpm-is-the-default)
- [Commit Messages](#commit-messages)
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

## Boundary enforcement

The repo now enforces package boundaries in two layers:

- `pnpm install` at the repo root uses the default isolated workspace layout, so undeclared dependencies are less likely to leak across the tree through a flat `node_modules`.
- `pnpm lint` runs `import/no-extraneous-dependencies`, including type-only imports, so package source files must declare the workspace and external packages they import.

When adding a new import:

- Add runtime and type-only package imports to the importing package's `dependencies` when shipped source or declarations rely on them.
- Add test-only helpers such as `jest-dynalite` to the specific package's `devDependencies` instead of relying on the repo root.
- Treat `packages/microapps-cdk` as the exception path for package-manager behavior; if it ever needs special handling, keep that handling local to the package rather than reintroducing repo-wide hoisting.

# Commit Messages

Use Conventional Commits in this repository.

Preferred shapes:

- `type: summary`
- `type(scope): summary`

Guidelines:

- Keep the summary imperative and concise.
- Use a scope when it makes the affected package or area clearer, such as `feat(router): ...` or `fix(release): ...`.
- Prefer these types unless there is a good reason not to: `feat`, `fix`, `docs`, `refactor`, `test`, `ci`, `build`, `perf`, `chore`.
- Keep each commit focused on one main idea when practical so review and rollback stay easy.

Examples:

- `feat(release): publish prereleases to npm beta dist-tag`
- `docs(contributing): document conventional commit format`
- `fix(router): preserve query string when forwarding assets`

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
