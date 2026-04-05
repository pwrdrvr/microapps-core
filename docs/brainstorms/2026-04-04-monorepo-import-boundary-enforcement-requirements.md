---
date: 2026-04-04
topic: monorepo-import-boundary-enforcement
---

# Monorepo Import Boundary Enforcement

## Problem Frame

This monorepo intends to have package boundaries, but those boundaries are not currently enforced in a way that contributors can rely on. A package may import another workspace package even when that dependency is not declared in its local `package.json`, which makes the architecture look stricter than it really is.

The immediate example is the `pwrdrvr` package importing `@pwrdrvr/microapps-deployer-lib` from source files including `packages/pwrdrvr/src/lib/DeployClient.ts`, even though `packages/pwrdrvr/package.json` does not declare that dependency. In this specific case the dependency direction may be acceptable, but the undeclared import is not. The maintainers want the repo to be a credible example of boundary enforcement in a large monorepo, not a convention that only exists on paper.

This work is for maintainers and contributors. It should make invalid imports fail predictably in local development and CI, while staying compatible with a likely future move from Yarn workspaces to pnpm.

## Requirements

**Boundary Source of Truth**
- R1. The repo must define one primary source of truth for whether one package may import another package.
- R2. Declared package dependencies must be treated as the baseline contract for import legality.
- R3. TypeScript project references must not be treated as the enforcement mechanism for package import boundaries, because they do not reliably express or enforce “may import” rules in this repo.

**Contributor Feedback and Enforcement**
- R4. An undeclared import of any external or workspace package from package source code must fail through an automated check that runs in normal contributor workflows.
- R5. The failure mode must produce actionable feedback that identifies the importing file and the missing or invalid dependency declaration.
- R6. The enforcement must run in CI and be practical to run locally before merge.
- R7. The enforcement must not depend on Yarn-specific behavior that would be thrown away by a later pnpm migration.

**Allowed Internal Dependencies**
- R8. The system must allow maintainers to declare that some workspace package-to-package dependencies are valid, even when a current example was first discovered as a violation.
- R9. The current `pwrdrvr -> @pwrdrvr/microapps-deployer-lib` dependency should be treated as an example to classify during implementation, not as proof that the dependency direction itself is forbidden.
- R10. If the repo chooses to enforce higher-level architecture rules beyond declared dependencies, those rules must be explicit and reviewable rather than implied by build quirks.

**Adoption and Durability**
- R11. The initial rollout should favor a low-friction enforcement layer that can be adopted without a package-manager migration.
- R12. The chosen approach should remain useful after a future move to pnpm, even if pnpm adds stricter runtime or install-time dependency behavior.
- R13. The repo should document the intended rule in contributor-facing terms so a reader can understand what is enforced and why.

## Approach Comparison

| Approach | Description | Pros | Cons | Best suited when |
|---|---|---|---|---|
| A. Lint-declared-deps baseline | Use linting to fail imports that are not declared in the importing package's manifest. | Low friction, package-manager-independent, clear diagnostics, compatible with pnpm later. | Enforces declared deps, not full architecture direction by itself. | The repo wants practical enforcement soon with minimal workflow disruption. |
| B. Lint baseline plus architecture graph | Enforce declared deps and separately encode allowed package directions. | Strongest expression of “may import” vs “must declare”; good for teaching repo structure. | More setup and more policy to maintain. | The repo wants explicit dependency direction rules, not just manifest correctness. |
| C. Package-manager enforcement first | Rely primarily on strict package-manager resolution behavior to block undeclared deps. | Strong technical guardrail at install/runtime resolution layer. | Ties progress to package-manager migration and tool compatibility work. | The repo wants to solve this as part of a broader package-manager modernization effort. |

## Success Criteria
- A contributor adding an undeclared workspace import in package source gets a failing automated check before merge.
- The failure message makes it clear whether the fix is “declare the dependency” or “remove/change the import.”
- Maintainers can intentionally allow a dependency like `pwrdrvr -> @pwrdrvr/microapps-deployer-lib` by making the declaration explicit rather than relying on accidental resolution.
- The documented repo policy still makes sense after a migration to pnpm.

## Scope Boundaries
- This work defines and enforces import-boundary policy for the current repo; it does not perform the pnpm migration itself.
- This work does not require every existing package relationship to become forbidden; some currently undeclared imports may be legitimized by declaration.
- This work does not require TypeScript references to mirror every allowed package dependency unless planning later decides that alignment adds value.
- This work does not require full architectural layering rules unless the team chooses to add them on top of the baseline declared-dependency rule.

## Key Decisions
- Package manifests are the baseline boundary contract: contributors should be able to answer “may this import exist?” by looking first at the importing package’s manifest.
- Prefer package-manager-independent enforcement first: the first useful guardrail should survive a future move to pnpm.
- Separate “undeclared dependency” from “bad architectural direction”: the discovered `pwrdrvr` import is evidence of missing enforcement, not necessarily evidence that the dependency must be banned.
- Start with the lowest-friction rule that closes the real gap: fail undeclared imports first, then optionally add directional architecture rules if the repo wants a stronger teaching example.

## Dependencies / Assumptions
- The repo already uses ESLint and can add or tighten import-related rules in normal contributor workflows.
- A future pnpm migration is plausible enough that Yarn-specific enforcement should be avoided where possible.
- Some current workspace imports may already rely on implicit resolution and will need triage during rollout.

## Outstanding Questions

### Deferred to Planning
- [Affects R4][Technical] Which enforcement mechanism should be the first gate: an ESLint rule based on declared dependencies, a dependency-graph tool, or both?
- [Affects R6][Technical] Where should the enforcement run by default in this repo: the existing lint command, a dedicated boundary-check command, or both?
- [Affects R8][Needs research] How many existing undeclared workspace imports already exist, and which are legitimate declarations versus real boundary violations?
- [Affects R10][Technical] Should higher-level package direction rules be part of the first rollout or a second phase after declared-dependency enforcement is stable?

## Next Steps
→ /prompts:ce-plan for structured implementation planning
