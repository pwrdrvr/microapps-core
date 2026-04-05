import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { spawnSync } from "node:child_process";

test("emits GitHub Action outputs for prerelease tags", () => {
  const outputPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "release-metadata-")), "github-output.txt");
  const result = spawnSync("node", ["scripts/release-metadata.mjs", "v0.0.0-beta.1"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      GITHUB_OUTPUT: outputPath,
    },
  });

  assert.equal(result.status, 0, result.stderr);

  const output = fs.readFileSync(outputPath, "utf8");
  assert.match(output, /^version=0\.0\.0-beta\.1$/m);
  assert.match(output, /^is_prerelease=true$/m);
  assert.match(output, /^release_channel=beta$/m);
  assert.match(output, /^npm_dist_tag=beta$/m);
});
