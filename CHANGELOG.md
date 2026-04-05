# Changelog

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
