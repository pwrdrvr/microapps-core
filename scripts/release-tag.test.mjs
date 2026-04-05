import assert from "node:assert/strict";
import test from "node:test";

import { parseReleaseTag } from "./release-tag.mjs";

test("parses stable tags", () => {
  assert.deepEqual(parseReleaseTag("v1.2.3"), {
    tagName: "v1.2.3",
    version: "1.2.3",
    prerelease: null,
    isPrerelease: false,
    channel: null,
    npmDistTag: "latest",
  });
});

test("parses prerelease tags and derives the dist-tag channel", () => {
  assert.deepEqual(parseReleaseTag("v1.2.3-beta.4"), {
    tagName: "v1.2.3-beta.4",
    version: "1.2.3-beta.4",
    prerelease: "beta.4",
    isPrerelease: true,
    channel: "beta",
    npmDistTag: "beta",
  });
});

test("rejects malformed tags", () => {
  assert.throws(() => parseReleaseTag("1.2.3"), /Invalid release tag/);
});
