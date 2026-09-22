# Publishing CLI security release preparation

This change prepares `pwrdrvr` and its compatibility package,
`@pwrdrvr/microapps-publish`, for the repository's next release. It does not
publish packages, create a tag, or merge the PR. Versions remain `0.0.0` in source;
`scripts/version.js` applies the approved release tag during the release workflow.

## Release candidate

The release planner, run on 2026-09-22 against main
`e58f6976d6040eceb7296003736caf5d65456f19`, found the last stable release
`v1.1.2`, 38 first-parent commits and 30 meaningful commits since it, and proposed
`v1.2.0` (minor). The existing beta series ends at `v1.2.0-beta.8`, so the next
prerelease candidate is **`v1.2.0-beta.9`**, using the npm `beta` dist-tag.
Re-run the release planner after merge, obtain release authorization, and use the
release skill to write the final changelog and notes for the exact approved SHA.
This is a continuation of the existing minor-release beta series, not a standalone
patch to the old `0.4.0-alpha.5` CLI.

No open PR already covered this release preparation. PR #418's oclif migration
is already merged. Open Dependabot PRs #434 (js-yaml 4.2.0), #431
(brace-expansion), and #432/#433 (esbuild) cover individual dependencies;
this change raises CLI dependency floors and verifies published artifacts.
In particular, js-yaml 4.2.0 is below the currently required 4.3.2 floor.

## Consumer changes

- Require patched Convict 6.2.5, js-yaml 4.3.2, oclif 4.14.0, and mature AWS SDK
  3.1132.0 clients. Refresh their transitive resolutions.
- Remove unused URL/IP format registrations and their validator dependency.
  The existing configuration schemas use neither custom format.
- Anchor oclif discovery to the `pwrdrvr` package when invoked through the
  compatibility wrapper. Previously `microapps-publish publish --help` reported
  “Command publish not found.”
- Declare the existing Node >=22 requirement using the standard `engines` field
  and explicitly include the compatibility executable in its package file list.
- Verify both tarballs and audit a fresh consumer in the release workflow.

## Advisory results

The locked CLI runtime tree matched these **20 distinct advisories** before this
change and **zero** afterward. Matching used GitHub's current open alerts and
converted commas in `vulnerable_version_range` to spaces before semver matching.
A fresh tarball consumer also reports zero advisories from `pnpm audit --prod`.
These are results as of 2026-09-22, not a guarantee about future advisories.

| Dependency | Advisories removed from CLI runtime |
| --- | --- |
| brace-expansion | `GHSA-rgw5-rvv9-x895`, `GHSA-mh99-v99m-4gvg`, `GHSA-3jxr-9vmj-r5cp`, `GHSA-jxxr-4gwj-5jf2` |
| convict | `GHSA-44fc-8fm5-q62h`, `GHSA-hf2r-9gf9-rwch` |
| fast-xml-builder | `GHSA-5wm8-gmm8-39j9` |
| fast-xml-parser | `GHSA-gh4j-gqv2-49f6` |
| js-yaml | `GHSA-2883-xcg3-v3hh`, `GHSA-5p4m-2wfm-xmqj`, `GHSA-52cp-r559-cp3m`, `GHSA-h67p-54hq-rp68`, `GHSA-mh29-5h37-fv8m` |
| minimatch | `GHSA-7r86-cg39-jmmj`, `GHSA-23c5-xmqv-rm74`, `GHSA-3ppc-4f35-3m26` |
| picomatch | `GHSA-3v7f-55p6-f55p`, `GHSA-c2c7-rcm5-vvqj` |
| validator | `GHSA-vghf-hv5q-vc2g`, `GHSA-9965-vmph-33xx` |

Old `uuid`, `tmp`, `braces`, and vulnerable `ejs` are not in this CLI's current
vulnerable runtime tree; the already-merged oclif migration is relevant to that
reduction. No downstream overrides are needed for this tested CLI tree.

The **repository-wide** production audit still reports 13 advisories outside the
new CLI runtime (2 critical, 6 high, 4 moderate, 1 low):

- `validator`: `GHSA-9965-vmph-33xx` (moderate).
- `validator`: `GHSA-vghf-hv5q-vc2g` (high).
- `js-yaml`: `GHSA-mh29-5h37-fv8m` (moderate).
- `convict`: `GHSA-44fc-8fm5-q62h` (critical).
- `convict`: `GHSA-hf2r-9gf9-rwch` (critical).
- `fast-xml-parser`: `GHSA-gh4j-gqv2-49f6` (moderate).
- `fast-xml-builder`: `GHSA-5wm8-gmm8-39j9` (high).
- `js-yaml`: `GHSA-h67p-54hq-rp68` (moderate).
- `js-yaml`: `GHSA-52cp-r559-cp3m` (high).
- `aws-cdk-lib`: `GHSA-vcrf-j523-4mrf` (high).
- `aws-cdk-lib`: `GHSA-464c-974j-9xm6` (low).
- `js-yaml`: `GHSA-5p4m-2wfm-xmqj` (high).
- `js-yaml`: `GHSA-2883-xcg3-v3hh` (high).

Development-only and standalone CDK lockfile alerts are also outside this CLI PR.
Do not treat a clean CLI consumer audit as a clean audit of the entire monorepo.

## Validation

- `pnpm build` and `pnpm build:publish` passed.
- `pnpm lint` passed.
- `pnpm --filter pwrdrvr test`: 10 tests and one snapshot passed.
- `pnpm test --runInBand`: 47 suites, 223 passed, 4 skipped, two snapshots passed.
- `node --test scripts/release-tag.test.mjs scripts/release-metadata.test.mjs scripts/release-workflow-smoke.test.mjs`: 5 passed.
- `node scripts/package-manager/check-publish-cli.mjs`: both freshly packed CLI
  binaries support help/version and publish, publish-static, preflight, and delete
  command help. The consumer audit reports zero vulnerabilities.
- Fresh consumer installation enforces `minimumReleaseAge: 10080`, runs no
  lifecycle scripts, and uses no third-party dependency overrides. Its sole
  override substitutes the unpublished `pwrdrvr` sibling tarball. Registry
  timestamps independently confirmed all 122 third-party versions are >=7 days old.
- Frozen lockfile installation passed with lifecycle scripts blocked. No Git or
  non-registry tarball dependency resolutions were introduced into the root lockfile.

Locally, commands used `--ignore-pnpmfile` (or
`npm_config_ignore_pnpmfile=true` for the smoke script) because the operator's
machine-global hook rejects an unused Git devDependency declared inside a
third-party registry package. This does not disable the seven-day age setting or
script blocking. The committed lockfile has no machine-specific hook checksum.
The release workflow does not need this machine-specific option.

## Downstream update after authorized publication

In `microapps-app-release`, replace the old alpha with an exact approved version:

```sh
pnpm add -D --save-exact @pwrdrvr/microapps-publish@1.2.0-beta.9
```

Use the actual published version if the release plan changes. Preserve the
downstream dependency classification if it differs from devDependencies. Keep
Node >=22 and the seven-day maturity policy: wait until the new CLI release is
eligible rather than silently exempting it. Update and commit the downstream
lockfile, run `pnpm exec microapps-publish publish --help`, then run its normal
build/tests and audit. Shared root overrides may still be needed by other
packages and should only be removed after checking their remaining consumers.
The existing GitHub release workflow publishes both CLI package names with the
same version; no manual npm publication is required.
