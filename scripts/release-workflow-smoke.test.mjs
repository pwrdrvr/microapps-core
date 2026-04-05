import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

test("release workflow validates prerelease state and propagates npm dist-tags", () => {
  const workflow = fs.readFileSync(path.join(repoRoot, ".github", "workflows", "release.yml"), "utf8");

  assert.match(workflow, /Validate GitHub prerelease flag/);
  assert.match(workflow, /EXPECTED_PRERELEASE:\s+\$\{\{\s*steps\.get_version\.outputs\.is_prerelease\s*\}\}/);
  assert.match(workflow, /ACTUAL_PRERELEASE:\s+\$\{\{\s*github\.event\.release\.prerelease\s*\}\}/);
  assert.match(workflow, /NPM_DIST_TAG:\s+\$\{\{\s*needs\.version\.outputs\.npm_dist_tag\s*\}\}/);
  assert.doesNotMatch(workflow, /Release Deployer Lib - NPM/);
  assert.doesNotMatch(workflow, /deployer-lib-dist/);
  assert.match(workflow, /Release Router Lib - NPM/);
});
