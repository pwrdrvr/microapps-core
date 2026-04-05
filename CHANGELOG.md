# Changelog

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
