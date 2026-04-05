# AGENTS.md

## Scope

These instructions apply to `/Users/huntharo/.codex/worktrees/029a/microapps-core/packages/microapps-cdk`.

## Projen Ownership

- This package is intentionally `projen`-managed.
- Treat [`.projenrc.js`](/Users/huntharo/.codex/worktrees/029a/microapps-core/packages/microapps-cdk/.projenrc.js) as the source of truth for generated files.
- Expect `projen` to own files like:
  - [`package.json`](/Users/huntharo/.codex/worktrees/029a/microapps-core/packages/microapps-cdk/package.json)
  - [`.npmrc`](/Users/huntharo/.codex/worktrees/029a/microapps-core/packages/microapps-cdk/.npmrc)
  - [`.eslintrc.json`](/Users/huntharo/.codex/worktrees/029a/microapps-core/packages/microapps-cdk/.eslintrc.json)
  - [`.github/workflows/build.yml`](/Users/huntharo/.codex/worktrees/029a/microapps-core/packages/microapps-cdk/.github/workflows/build.yml)
  - [`.github/workflows/release.yml`](/Users/huntharo/.codex/worktrees/029a/microapps-core/packages/microapps-cdk/.github/workflows/release.yml)
  - other generated config under [`.projen`](/Users/huntharo/.codex/worktrees/029a/microapps-core/packages/microapps-cdk/.projen)

## Package Manager

- This package is configured for `pnpm`, not `yarn`.
- The current `projen` source explicitly pins:
  - `packageManager: javascript.NodePackageManager.PNPM`
  - `pnpmVersion: '10'`
- There is a guard test for this in [`test/PackageManager.spec.ts`](/Users/huntharo/.codex/worktrees/029a/microapps-core/packages/microapps-cdk/test/PackageManager.spec.ts).

## Safe Projen Invocation

- Do not trust a naked `npx projen` in this directory unless local dev dependencies are already installed.
- A bare `npx projen` may try to download a newer `projen` from npm and then fail because [`.projenrc.js`](/Users/huntharo/.codex/worktrees/029a/microapps-core/packages/microapps-cdk/.projenrc.js) requires the local `projen` package.
- Safe sequence:

```sh
cd /Users/huntharo/.codex/worktrees/029a/microapps-core/packages/microapps-cdk
pnpm install --frozen-lockfile --ignore-workspace
pnpm exec projen
```

## Standalone Island Behavior

- Treat this package as a standalone subproject when working on `projen` or `jsii` concerns.
- The `--ignore-workspace` install matters here because this package has its own lockfile and its own generated project shape.
- The rest of the monorepo may be using workspace-oriented flows, but this package still behaves like a special island.
- The repo root now intentionally relies on pnpm's isolated workspace layout for boundary enforcement. If `microapps-cdk` ever needs a package-manager exception, keep it local to this package or its generated config rather than widening the whole repo back to a hoisted layout.

## Verified Behavior

- On branch `codex/pnpm-workspace-ci` at commit `c8952184229da65d461cbcc108704b8443be50fe`, running `pnpm exec projen` after a standalone install produced no tracked file changes.
- That means the current pnpm-related changes are compatible with the checked-in `projen` configuration.

## Practical Advice

- If you want to know whether `projen` will fight a change, run it in a throwaway worktree first.
- Prefer changing [`.projenrc.js`](/Users/huntharo/.codex/worktrees/029a/microapps-core/packages/microapps-cdk/.projenrc.js) over hand-editing generated files.
- If a generated file changes unexpectedly after synthesis, assume `projen` is asserting ownership rather than the file being manually drifted.
