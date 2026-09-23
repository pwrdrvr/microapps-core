---
name: cdk-lockfile-refresh
description: Refresh the MicroApps CDK construct's standalone pnpm lockfile, remove superseded vulnerable resolutions, and verify projen, builds, packaging, and Dependabot alert coverage. Use when root dependency updates leave packages/microapps-cdk/pnpm-lock.yaml stale or when explicitly refreshing that lockfile.
---

# CDK Lockfile Refresh

This repository has two dependency resolutions: the root workspace lockfile and
`packages/microapps-cdk/pnpm-lock.yaml`. Updating one does not refresh the other.
A normal install can preserve vulnerable transitive versions even when their
parents allow patched releases.

Read [the package guidance](../../../packages/microapps-cdk/AGENTS.md) before
working. Resolve repository paths from the current checkout, not the historical
absolute paths in that guidance. Use the repository's pinned pnpm version.

## Establish scope and evidence

- Start from the requested base. For a new follow-up PR after a squash merge,
  fetch `origin/main`, confirm the merge is present, and branch from that ref;
  do not carry the previous branch's commits into the new PR.
- Inspect the manifest, `.projenrc.js`, and both lockfiles. For a standalone
  lockfile refresh, leave manifests and the root lockfile unchanged unless the
  user also requested upgrades requiring those changes.
- If addressing Dependabot, fetch current open alerts with pagination and group
  them by `dependency.manifest_path`, package, and advisory. Inspect PR diffs,
  not just titles: an apparent security bump may leave the affected version
  unchanged.
- Record the targeted packages' resolved versions before editing. Select targets
  from current alerts or the user's request; do not reuse a historical version
  list as a permanent upgrade policy.

## Refresh the standalone resolution

Run the following from `packages/microapps-cdk`, with locally installed projen
available before invoking it. A frozen install reproduces the current lockfile;
use a non-frozen install when a manifest change needs reconciliation. Neither is
necessarily enough to refresh already locked transitive dependencies.

For targeted security refreshes, this command shape was verified with pnpm
10.29.3 (the names are examples; substitute the actual targets):

```sh
pnpm update js-yaml brace-expansion --depth 100 --ignore-workspace --no-save --lockfile-only
pnpm install --frozen-lockfile --ignore-workspace
pnpm exec projen
```

Use a numeric depth. In the verified workflow, passing `--depth Infinity` did
not update the requested transitive copies, while `--depth 100` did. Always
inspect the resulting versions rather than treating exit code zero as proof.

`--ignore-workspace` selects the standalone dependency graph. `--no-save` keeps
manifest declarations unchanged. Avoid `--latest` for a refresh within existing
ranges. If a parent pins a vulnerable version or requires a different major,
identify that dependency path and report the needed parent upgrade. Only expand
into that upgrade when it is within the user's requested scope; projen-owned
changes belong in `.projenrc.js`.

Inspect the diff after resolution and synthesis:

- The vulnerable resolutions should be removed, not merely accompanied by newer
  copies. Check every resolved version of each targeted package and the snapshot
  references to it. Multiple supported versions can legitimately remain.
- Expect only the standalone lockfile to change for a lockfile-only refresh.
  Investigate generated-file drift rather than hiding it.
- Do not hand-edit dependency versions or integrity hashes. Keep unrelated
  machine-local configuration changes out of the commit.

If local pnpm hooks or build approvals block installation, diagnose the exact
failure and use the applicable authorization and package-manager controls. Do
not prescribe globally disabling safeguards, changing linker layout, or deleting
lockfile checksums as a routine refresh step. A local validation limitation must
be reported if it cannot be resolved within the authorized task.

## Validate in the right dependency layout

Workspace tests and the standalone build use different installs. Run workspace
validation before the standalone install, or reinstall the workspace before
returning to workspace tests. Testing immediately after a standalone install can
produce misleading missing-module errors (for example, `tslib`).

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm test --runInBand packages/microapps-cdk/test
```

Then, from `packages/microapps-cdk`:

```sh
pnpm install --frozen-lockfile --ignore-workspace
pnpm exec projen
CI=true pnpm exec projen build
```

The CI-mode build checks jsii compilation, Lambda bundling, documentation, lint,
and JavaScript packaging. Without `CI=true`, projen also attempts Java, Python,
and .NET packaging; those extra toolchains are not needed for a lockfile-only
JavaScript validation. Inspect the produced `dist/js/*.tgz` for the package
entrypoint and declarations plus the deployer, router, and edge-to-origin bundles.
Check for tracked-file drift after the build. Broaden validation if the actual
change goes beyond the standalone lockfile.

## Report the result

For security work, compare every targeted alert's vulnerable range against all
remaining resolved versions in its reported manifest, using semver-aware range
matching. Count an alert as addressed only when no affected copy remains. A
patched copy in the root lockfile does not resolve a standalone-lockfile alert.
Distinguish expected fixes from GitHub-confirmed closures after merge and scan;
do not promise a fixed total based on an earlier alert snapshot.

Report the before/after versions, checks actually run, expected alert reduction,
and remaining dependency paths that need separate upgrades. Follow repository
commit and PR conventions, including signed commits and the applicable template.
Create or update a PR when requested; this skill does not itself authorize
merging, closing other PRs, dismissing alerts, or publishing packages.
