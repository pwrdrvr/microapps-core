# AGENTS.md

## Scope

These instructions apply to the repository root at `/Users/huntharo/.codex/worktrees/029a/microapps-core`.

## Project Overview

MicroApps deploys many web applications to AWS behind a shared hostname using CloudFront, S3 static assets, API Gateway, Lambda Function URLs, and DynamoDB-backed version routing.

The main pieces are:
- `microapps-cdk`: turn-key CDK construct, published through `jsii`
- `microapps-deployer`: deployer Lambda used by the CLI
- `microapps-router`: Lambda@Edge router
- `microapps-edge-to-origin`: CloudFront origin-routing function
- `microapps-datalib`: shared DynamoDB models and data access
- `microapps-deployer-lib`: deployer message and type library
- `microapps-router-lib`: shared routing helpers
- `pwrdrvr`: CLI used to publish applications

## Package Manager

- This repo is a `pnpm` workspace monorepo.
- The root package manager is pinned in [`package.json`](/Users/huntharo/.codex/worktrees/029a/microapps-core/package.json) as `pnpm@10.29.3`.
- Workspace layout is defined in [`pnpm-workspace.yaml`](/Users/huntharo/.codex/worktrees/029a/microapps-core/pnpm-workspace.yaml).
- Prefer `pnpm` and `pnpm exec` over `npm` in this repository.
- Prefer `pnpm --filter <package>` for package-scoped commands instead of `cd` plus `npm`.

## Global pnpm Notes

- Use `pnpm install` at the repo root for normal workspace installs.
- Use `pnpm build`, `pnpm test`, `pnpm lint`, and other root scripts from the repo root.
- Do not casually introduce `npm install`, `npm pack`, or `npm publish` flows for workspace-managed packages unless the package is intentionally standalone.
- Some published packages still need publish-time care because workspace dependency rewriting and tarball contents matter. The CI tarball audit exists to catch that drift.
- The repo now has an automated tarball population check in CI. It compares newly produced tarballs against the currently published npm packages and reports `green`, `yellow`, or `red` on the PR.

## Commits

- Use Conventional Commits for this repository.
- Prefer the shape `type(scope): summary` when a scope helps and `type: summary` when it does not.
- Keep the subject line short, imperative, and descriptive of the user-visible or maintainer-visible change.
- Common types here include `feat`, `fix`, `docs`, `refactor`, `test`, `ci`, `build`, `perf`, and `chore`.
- Keep checkpoint commits reviewable: one main idea per commit whenever practical.

## Common Commands

### Build

```sh
pnpm build
pnpm build:publish
pnpm build:all
pnpm esbuild:deployer
pnpm esbuild:router
pnpm esbuild:edge-to-origin
```

### Test

```sh
pnpm test
pnpm test:integration
pnpm --filter @pwrdrvr/microapps-router-lib test
```

### Lint and Format

```sh
pnpm lint
pnpm lint-and-fix
pnpm format
```

### Cleanup

```sh
pnpm clean
pnpm clean:super
```

## Architecture Notes

High-level request flow:

1. A request lands on CloudFront.
2. `microapps-router` decides which app version should serve the request.
3. Routing and version metadata come from DynamoDB via `microapps-datalib`.
4. The selected app is served via Lambda Function URL, API Gateway, static assets, or an external URL.

The deploy/publish path is:

1. `pwrdrvr` CLI invokes the deployer Lambda.
2. The deployer writes metadata and assets.
3. The router begins serving the new version once metadata is updated.

## Lambda Bundling

The main Lambda bundling flow is:

1. TypeScript compilation with project references.
2. `esbuild` bundling for deployer, router, and edge-to-origin artifacts.
3. CDK uses prebuilt assets when available.

Prebuilt outputs of note:
- `packages/cdk/dist/microapps-deployer/index.js`
- `packages/cdk/dist/microapps-router/index.js`
- `packages/microapps-cdk/lib/microapps-edge-to-origin/index.js`

## Testing Notes

- Unit tests use Jest and `jest-dynalite`.
- Integration tests use [`jest.int.config.js`](/Users/huntharo/.codex/worktrees/029a/microapps-core/jest.int.config.js).
- Root linting excludes `packages/microapps-cdk` in [`.eslintignore`](/Users/huntharo/.codex/worktrees/029a/microapps-core/.eslintignore) because that package has its own projen-managed lint setup.

## CDK Construct Special Case

The `microapps-cdk` package is a special case.

- It is `projen`-managed.
- It has its own generated workflow/config surface.
- It behaves more like a standalone subproject than a normal workspace package for some tasks.

Read the package-local guidance in [`packages/microapps-cdk/AGENTS.md`](/Users/huntharo/.codex/worktrees/029a/microapps-core/packages/microapps-cdk/AGENTS.md) before making `projen`, `jsii`, or standalone packaging changes there.

That file catalogs the important `projen` gotchas, including:
- safe `projen` invocation
- why bare `npx projen` is misleading there
- why `pnpm install --frozen-lockfile --ignore-workspace` matters in that package
- the fact that we verified current pnpm changes do not fight the checked-in `projen` config

## Practical Advice

- Assume the repo is `pnpm`-first unless a package-specific note says otherwise.
- For publish-related changes, verify tarball contents, not just builds.
- For `microapps-cdk`, prefer changing `.projenrc.js` over editing generated files.
- If `projen` behavior is in doubt, test it in a throwaway worktree first.
