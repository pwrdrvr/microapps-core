# Changelog

## v1.2.0 - 2026-09-28

Stable 1.2.0 brings the changes developed across the 1.2 beta series. The final beta was verified on a private PwrDrvr deployment before this release.

### Runtime requirement

- Node.js 24 or newer is required for the CLI and CDK construct. Generated Lambda runtimes and bundles also target Node.js 24. @huntharo (#443)

### Highlights

- Move `pwrdrvr` to the current oclif runtime while retaining its existing commands. Both `pwrdrvr` and the `microapps-publish` compatibility executable now discover those commands correctly. @huntharo (#418, #435)
- Process large uploads and staging operations incrementally, preserving concurrency limits and copy-before-delete ordering while reporting completed progress. @huntharo (#436)
- Update the private deployment stack to use release app construct 0.7.0, and remove deprecated CloudFront origin and log APIs from the CDK construct. @huntharo (#419, #466)

### Fixes

- Restore versioned API routes in the CDK construct and the main packaging jobs used to check build artifacts. @huntharo (#393, #399)
- Keep unpublished deployer types and libraries out of the published CLI's runtime dependencies, so the CLI and compatibility package install cleanly. @huntharo (517d83f, 2c1a2cf)
- Refresh security-sensitive CLI dependencies and validate the published tarballs by installing and auditing them as a fresh consumer. Update Convict, YAML parsing, AWS SDK clients, CDK dependencies, and vulnerable transitive resolutions across the workspace. @huntharo @dependabot[bot] (#435, #437, #451, #453, #456, #457, #464)

### Internal

- Move the repository and CI to pnpm workspaces, enforce declared package import boundaries, and improve preview deployment scope classification. @huntharo (#391, #392, #396, #398, #458)
- Refresh CDK, jsii, Projen, esbuild, TypeScript, lint, and test tooling, including synchronized standalone CDK lockfiles. @huntharo @dependabot[bot] (#417, #425, #426, #427, #429, #430, #432, #433, #440, #442, #445, #446, #449, #450, #455, #462, #463, #467)
- Replace the DynamoDB test harness with a local fixture using AWS SDK v3, and update integration HTTP coverage. @huntharo (#413, #459)
- Add beta-channel publishing, deterministic release planning, clearer CI permissions, and release packaging checks. @huntharo (#395, #400, #438, #448, #461)

## v1.2.0-beta.10 - 2026-09-28

This beta updates the release app used by the repository's private CDK stack and refreshes package tooling since v1.2.0-beta.9.

### Highlights

- Pin the repository's private CDK deployment stack to the published release app construct 0.7.0, so its next deployment can use the newer release app. @huntharo (#466)

### Internal

- Bring jsii and Projen dependency declarations and the standalone CDK lockfile into agreement, restoring a clean construct build and package. @huntharo (#467)
- Refresh the AWS SDK clients and storage libraries used by the workspace. @dependabot[bot] (#464)
- Update esbuild, ts-jest, and the lint and TypeScript toolchain. @dependabot[bot] (#427, #462, #463)

## v1.2.0-beta.9 - 2026-09-25

This beta updates the CLI, CDK construct, and shared packages since v1.2.0-beta.8. Install it explicitly or through the npm `beta` dist-tag.

### Runtime requirements

- Require Node.js 24 or newer and move the generated Lambda runtimes and bundles to Node.js 24. Upgrade the runtime before testing this beta. @huntharo (#443)

### Fixes

- Refresh the CLI's security-sensitive dependencies and fix command discovery when using the `microapps-publish` compatibility executable. Release checks now install the CLI tarballs as a fresh consumer and verify their commands and dependency audit. @huntharo (#435)
- Update Convict, YAML parsing, AWS SDK clients, and CDK dependencies, and replace vulnerable transitive dependency resolutions in the workspace and standalone CDK package. @huntharo @dependabot[bot] (#437, #451, #453, #456, #457)

### Performance

- Process upload and staging results incrementally instead of collecting every result in memory. Large uploads report completed progress while retaining concurrency limits, error propagation, and copy-before-delete ordering. @huntharo (#436)

### Internal

- Refresh CDK tooling, constructs, esbuild, TypeScript, linting, and test dependencies; reconcile jsii 6 with the generated CDK configuration and lockfiles. @huntharo @dependabot[bot] (#425, #426, #429, #430, #432, #433, #440, #442, #445, #446, #449, #450, #455)
- Replace the DynamoDB test harness with a shared local fixture using AWS SDK v3, removing the test dependency on AWS SDK v2. @huntharo (#459)
- Consolidate CI Node setup and update artifact downloads, including the direct-to-main artifact action update. @huntharo (#420; cee4c7b)
- Restrict workflow token permissions, avoid preview deployments for changes that do not affect deployable code, group related dependency updates, and exclude the pnpm store from generated-file mutation checks. @huntharo (#438, #448, #458, #461)

### Docs

- Document the standalone CDK lockfile refresh procedure. @huntharo (#454)

## v1.2.0-beta.8 - 2026-04-06

### Highlights

- Migrated `pwrdrvr` to the modern `@oclif/core` runtime so the CLI beta train is aligned with the current oclif stack without changing the existing command surface. @huntharo
- Removed deprecated CloudFront origin and log APIs from `microapps-cdk`, keeping the CDK package aligned with current AWS and CDK expectations. @huntharo

### Internal

- Upgraded the shared CDK, Projen, and AWS SDK baselines used across the repository so the 1.2.0 beta train stays on current supported tooling. @huntharo

## v1.2.0-beta.7 - 2026-04-05

### Fixes

- Localized the deployer request and response types inside `pwrdrvr`, so the published beta CLI and `@pwrdrvr/microapps-publish` install cleanly without depending on an unpublished package. @huntharo
- Declared `reflect-metadata` in `@pwrdrvr/microapps-router-lib` test dependencies so the release workflow lint gate passes again on the beta train. @huntharo

### Internal

- Added a package-contract regression test that keeps the unpublished deployer library out of the `pwrdrvr` package surface. @huntharo

## v1.2.0-beta.6 - 2026-04-05

### Fixes

- Stopped shipping `@pwrdrvr/microapps-deployer-lib` as a runtime dependency of `pwrdrvr`, so the published beta CLI and `@pwrdrvr/microapps-publish` can install cleanly without requiring an unpublished package. @huntharo

### Internal

- Added a package-contract regression test that keeps the type-only deployer library out of `pwrdrvr` runtime dependencies while preserving it for local type-checking. @huntharo

## v1.2.0-beta.5 - 2026-04-05

### Fixes

- Stopped the release workflow from attempting to publish `@pwrdrvr/microapps-deployer-lib`, keeping beta publishes scoped to the maintained npm package set so the remaining prerelease packages can complete cleanly. @huntharo

### Internal

- Added a release workflow smoke assertion that keeps the maintained npm publish surface pinned in CI. @huntharo

## v1.2.0-beta.4 - 2026-04-05

### Highlights

- Added deterministic prerelease planning for the `v1.2.0` beta train and taught CI to classify preview deploy scope before deciding which preview work to run. @huntharo
- Enforced pnpm workspace import boundaries while preserving the repo's isolated dependency layout so packages only depend on what they actually declare. @huntharo

### Fixes

- Restored the main build packaging jobs and the `microapps-cdk` versioned API route behavior so beta packaging checks and versioned endpoints work correctly again. @huntharo
- Fixed preview deploy automation so workflow JSON inputs parse correctly, the PR scope labeler can write labels, and preview deploys derive from the classified scope. @huntharo

### Internal

- Updated GitHub Actions for the current Node 24 toolchain, refreshed checkout and Node setup actions, and added pnpm-aware Dependabot workspace configuration for the monorepo. @huntharo
- Hardened prerelease packaging by tagging npm dry-runs correctly, keeping non-blocking tarball drift out of failing status paths, and loading `nvm` before `pnpm install` in environment setup. @huntharo
- Replaced `axios` with `fetch` in integration coverage and added shared HTTP helpers to keep the beta test path closer to the runtime stack. @huntharo
- Refreshed the release planning automation and Codex environment configuration used by the repository maintenance workflows. @huntharo
- Bumped the root `cross-env` development dependency. @dependabot[bot]

## v1.2.0-beta.3 - 2026-04-04

### Fixes

- Scoped release publishing to the maintained npm path, removed the redundant GitHub release publish job, and switched npm publish steps to a pinned npm 11.5.1 toolchain without mutating the runner. @huntharo

## v1.2.0-beta.2 - 2026-04-04

### Fixes

- Fixed the GitHub release workflow to use the shared Node setup path when reading release metadata, so beta releases can reach package publishing instead of failing during version setup. @huntharo

## v1.2.0-beta.1 - 2026-04-04

### Highlights

- Added beta release support so prerelease tags can publish packages to the matching npm dist-tag instead of `latest`. @huntharo
- Migrated the workspace and CI flow to a pnpm-first setup while preserving compatibility checks for package-manager-sensitive paths. @huntharo
- Split PR and main deployment environments in CI so validation and release-oriented jobs can evolve independently. @huntharo

### Fixes

- Restored the main build packaging jobs so release packaging checks run correctly again before publishing. @huntharo

### Internal

- Updated GitHub Actions workflows to use `actions/checkout@v5`. @huntharo
- Updated the shared Node setup action and release workflows to use `setup-node@v5`. @huntharo
- Added Codex environment configuration used by the repository automation setup. @huntharo
