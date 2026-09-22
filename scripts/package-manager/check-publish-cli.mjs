#!/usr/bin/env node

// Build first with pnpm build:publish. Test the artifacts consumers receive,
// without inheriting workspace dependency overrides or running install scripts.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = process.cwd();
const temp = mkdtempSync(path.join(tmpdir(), 'microapps-publish-smoke-'));
const env = { ...process.env, npm_config_ignore_scripts: 'true' };

function run(args, cwd) {
  const result = spawnSync('pnpm', args, { cwd, env, encoding: 'utf8' });
  assert.equal(result.status, 0, `${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

try {
  const tarballs = {};
  for (const name of ['pwrdrvr', 'microapps-publish']) {
    const destination = path.join(temp, name);
    mkdirSync(destination);
    run(['pack', '--pack-destination', destination], path.join(root, 'packages', name));
    const files = readdirSync(destination).filter((file) => file.endsWith('.tgz'));
    assert.equal(files.length, 1);
    tarballs[name] = `file:${path.join(destination, files[0])}`;
  }

  const consumer = path.join(temp, 'consumer');
  mkdirSync(consumer);
  writeFileSync(
    path.join(consumer, 'package.json'),
    JSON.stringify(
      {
        name: 'publish-cli-smoke',
        version: '1.0.0',
        private: true,
        dependencies: {
          pwrdrvr: tarballs.pwrdrvr,
          '@pwrdrvr/microapps-publish': tarballs['microapps-publish'],
        },
        // Substitute only the unpublished workspace sibling with its actual tarball.
        // All third-party dependencies resolve normally, with no security overrides.
        pnpm: { overrides: { pwrdrvr: tarballs.pwrdrvr } },
      },
      null,
      2,
    ),
  );
  writeFileSync(
    path.join(consumer, 'pnpm-workspace.yaml'),
    'packages: []\nminimumReleaseAge: 10080\nonlyBuiltDependencies: []\n',
  );
  run(['install', '--ignore-workspace', '--ignore-scripts'], consumer);

  for (const bin of ['pwrdrvr', 'microapps-publish']) {
    const help = run(['exec', bin, '--help'], consumer);
    assert.match(help, /publish/);
    assert.match(run(['exec', bin, '--version'], consumer), /pwrdrvr\//);
    for (const command of ['publish', 'publish-static', 'preflight', 'delete']) {
      assert.match(run(['exec', bin, command, '--help'], consumer), /USAGE/);
    }
  }
  const audit = JSON.parse(run(['audit', '--prod', '--json'], consumer));
  assert.ok(Object.values(audit.metadata.vulnerabilities).every((count) => count === 0));
  console.log(
    'Both CLI tarballs pass command discovery; consumer audit reports zero vulnerabilities.',
  );
} finally {
  rmSync(temp, { recursive: true, force: true });
}
