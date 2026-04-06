#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  copyFileSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const rootDir = process.cwd();
const workDir = mkdtempSync(path.join(tmpdir(), 'tarball-population-'));
const publishedDir = path.join(workDir, 'published');
const localDir = path.join(workDir, 'local');
mkdirSync(publishedDir, { recursive: true });
mkdirSync(localDir, { recursive: true });

const outputJson =
  process.env.TARBALL_POPULATION_JSON ?? path.join(rootDir, 'tarball-population.json');
const outputMarkdown =
  process.env.TARBALL_POPULATION_MARKDOWN ?? path.join(rootDir, 'tarball-population.md');
const baselineDir = process.env.TARBALL_POPULATION_BASELINE_DIR ?? null;

const packages = [
  {
    id: 'pwrdrvr',
    npmSpec: 'pwrdrvr',
    packageDir: path.join(rootDir, 'packages', 'pwrdrvr'),
    localTarballName: 'pwrdrvr',
    prepareLocalTarball() {
      ensurePublishBuild();
      return packLocalWithPnpm(this.packageDir, this.localTarballName);
    },
  },
  {
    id: 'microapps-publish',
    npmSpec: '@pwrdrvr/microapps-publish',
    packageDir: path.join(rootDir, 'packages', 'microapps-publish'),
    localTarballName: 'microapps-publish',
    prepareLocalTarball() {
      return packLocalWithPnpm(this.packageDir, this.localTarballName);
    },
  },
  {
    id: 'microapps-datalib',
    npmSpec: '@pwrdrvr/microapps-datalib',
    packageDir: path.join(rootDir, 'packages', 'microapps-datalib'),
    localTarballName: 'microapps-datalib',
    prepareLocalTarball() {
      ensurePublishBuild();
      return packLocalWithNpm(this.packageDir, this.localTarballName);
    },
  },
  {
    id: 'microapps-deployer-lib',
    npmSpec: '@pwrdrvr/microapps-deployer-lib',
    packageDir: path.join(rootDir, 'packages', 'microapps-deployer-lib'),
    localTarballName: 'microapps-deployer-lib',
    prepareLocalTarball() {
      ensurePublishBuild();
      return packLocalWithPnpm(this.packageDir, this.localTarballName);
    },
  },
  {
    id: 'microapps-router-lib',
    npmSpec: '@pwrdrvr/microapps-router-lib',
    packageDir: path.join(rootDir, 'packages', 'microapps-router-lib'),
    localTarballName: 'microapps-router-lib',
    prepareLocalTarball() {
      ensurePublishBuild();
      return packLocalWithPnpm(this.packageDir, this.localTarballName);
    },
  },
  {
    id: 'microapps-cdk',
    npmSpec: '@pwrdrvr/microapps-cdk',
    packageDir: path.join(rootDir, 'packages', 'microapps-cdk'),
    localTarballName: 'microapps-cdk',
    prepareLocalTarball() {
      return packJsiiTarball(this.packageDir, this.localTarballName);
    },
  },
];

const prepared = new Set();

if (baselineDir) {
  mkdirSync(baselineDir, { recursive: true });
}

if (process.argv.includes('--print-baseline-cache-key')) {
  console.log(
    packages
      .map((pkg) => `${pkg.id}-${getPublishedVersionOrPlaceholder(pkg.npmSpec)}`)
      .join('__')
      .replaceAll(/[^A-Za-z0-9._-]+/g, '_'),
  );
  process.exit(0);
}

try {
  const results = [];

  for (const pkg of packages) {
    const result = comparePackage(pkg);
    results.push(result);
  }

  const overallStatus = deriveOverallStatus(results.map((result) => result.status));
  const report = {
    overallStatus,
    generatedAt: new Date().toISOString(),
    workDir,
    packages: results,
  };

  writeFileSync(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(outputMarkdown, renderMarkdown(report));

  console.log(renderConsoleSummary(report));
} finally {
  if (process.env.KEEP_TARBALL_POPULATION_WORKDIR !== '1') {
    rmSync(workDir, { recursive: true, force: true });
  }
}

function comparePackage(pkg) {
  let publishedVersion = null;
  let publishedTarballPath = null;
  let localTarballPath = null;

  try {
    publishedVersion = getPublishedVersion(pkg.npmSpec);
  } catch (error) {
    return {
      id: pkg.id,
      npmSpec: pkg.npmSpec,
      status: 'yellow',
      reason: summarizeMissingBaseline(error),
      baselineError: error.message,
      publishedVersion: null,
      publishedTarballPath: null,
      localTarballPath: null,
      publishedFileCount: 0,
      localFileCount: 0,
      publishedSymlinkCount: 0,
      localSymlinkCount: 0,
      addedPaths: [],
      removedPaths: [],
    };
  }

  const publishedBaseline = preparePublishedBaseline(pkg, publishedVersion);
  publishedTarballPath = publishedBaseline.tarballPath;
  localTarballPath = pkg.prepareLocalTarball();

  const localFiles = listTarballFiles(localTarballPath);
  const publishedSet = new Set(publishedBaseline.files);
  const localSet = new Set(localFiles);
  const addedPaths = localFiles.filter((filePath) => !publishedSet.has(filePath));
  const removedPaths = publishedBaseline.files.filter((filePath) => !localSet.has(filePath));
  const publishedSymlinkCount = publishedBaseline.symlinkCount;
  const localSymlinkCount = countTarballSymlinks(localTarballPath);

  const changedPaths = [...addedPaths, ...removedPaths];
  const status = classifyStatus({
    changedPaths,
    publishedSymlinkCount,
    localSymlinkCount,
  });

  return {
    id: pkg.id,
    npmSpec: pkg.npmSpec,
    status,
    reason: statusReason(status, changedPaths, publishedSymlinkCount, localSymlinkCount),
    publishedVersion,
    publishedTarballPath,
    localTarballPath,
    publishedFileCount: publishedBaseline.files.length,
    localFileCount: localFiles.length,
    publishedSymlinkCount,
    localSymlinkCount,
    addedPaths,
    removedPaths,
  };
}

function getPublishedVersion(npmSpec) {
  const result = run('npm', ['view', '--loglevel=error', npmSpec, 'version'], { capture: true });
  return result.stdout.trim();
}

function getPublishedVersionOrPlaceholder(npmSpec) {
  try {
    return getPublishedVersion(npmSpec);
  } catch {
    return 'unpublished';
  }
}

function packPublished(pkg, version, targetDir = path.join(publishedDir, pkg.id)) {
  mkdirSync(targetDir, { recursive: true });
  const result = run(
    'npm',
    ['pack', '--loglevel=error', `${pkg.npmSpec}@${version}`, '--pack-destination', targetDir],
    { capture: true },
  );
  const fileName = result.stdout.trim().split('\n').filter(Boolean).at(-1);
  return path.join(targetDir, fileName);
}

function preparePublishedBaseline(pkg, version) {
  if (!baselineDir) {
    const tarballPath = packPublished(pkg, version);
    return {
      tarballPath,
      files: listTarballFiles(tarballPath),
      symlinkCount: countTarballSymlinks(tarballPath),
    };
  }

  const versionDir = path.join(baselineDir, pkg.id, version);
  const inventoryPath = path.join(versionDir, 'inventory.json');
  mkdirSync(versionDir, { recursive: true });

  let tarballPath = firstTarballInIfExists(versionDir);
  if (!tarballPath) {
    tarballPath = packPublished(pkg, version, versionDir);
  }

  if (existsSync(inventoryPath)) {
    const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8'));
    return {
      tarballPath,
      files: inventory.files,
      symlinkCount: inventory.symlinkCount,
    };
  }

  const inventory = {
    files: listTarballFiles(tarballPath),
    symlinkCount: countTarballSymlinks(tarballPath),
  };
  writeFileSync(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`);

  return {
    tarballPath,
    files: inventory.files,
    symlinkCount: inventory.symlinkCount,
  };
}

function packLocalWithPnpm(packageDir, id) {
  const targetDir = path.join(localDir, id);
  mkdirSync(targetDir, { recursive: true });
  run('pnpm', ['pack', '--pack-destination', targetDir], { cwd: packageDir, capture: true });
  return firstTarballIn(targetDir);
}

function packLocalWithNpm(packageDir, id) {
  const targetDir = path.join(localDir, id);
  mkdirSync(targetDir, { recursive: true });
  run('npm', ['pack', '--loglevel=error', '--pack-destination', targetDir], {
    cwd: packageDir,
    capture: true,
  });
  return firstTarballIn(targetDir);
}

function packJsiiTarball(packageDir, id) {
  if (!prepared.has('microapps-cdk')) {
    const tsconfigPath = path.join(packageDir, 'tsconfig.json');
    const backupPath = path.join(workDir, 'microapps-cdk.tsconfig.json');
    copyFileSync(tsconfigPath, backupPath);

    try {
      const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));
      tsconfig.compilerOptions = { ...(tsconfig.compilerOptions ?? {}), skipLibCheck: true };
      writeFileSync(tsconfigPath, `${JSON.stringify(tsconfig, null, 2)}\n`);

      run('pnpm', ['install', '--frozen-lockfile', '--ignore-workspace'], { cwd: packageDir });
      run('npx', ['projen', 'compile'], { cwd: packageDir });
      run('npx', ['projen', 'package:js'], { cwd: packageDir });
      prepared.add('microapps-cdk');
    } finally {
      copyFileSync(backupPath, tsconfigPath);
    }
  }

  const targetDir = path.join(localDir, id);
  mkdirSync(targetDir, { recursive: true });
  const sourceTarball = firstTarballIn(path.join(packageDir, 'dist', 'js'));
  const targetTarball = path.join(targetDir, path.basename(sourceTarball));
  copyFileSync(sourceTarball, targetTarball);
  return targetTarball;
}

function ensurePublishBuild() {
  if (prepared.has('publish-build')) {
    return;
  }

  run('pnpm', ['build:publish']);
  prepared.add('publish-build');
}

function listTarballFiles(tarballPath) {
  const result = run('tar', ['-tzf', tarballPath], { capture: true });
  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^package\//, ''))
    .sort();
}

function countTarballSymlinks(tarballPath) {
  const result = run('tar', ['-tvzf', tarballPath], { capture: true });
  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('l')).length;
}

function classifyStatus({ changedPaths, publishedSymlinkCount, localSymlinkCount }) {
  if (publishedSymlinkCount > 0 || localSymlinkCount > 0) {
    return 'red';
  }
  if (changedPaths.length === 0) {
    return 'green';
  }
  if (changedPaths.every(isNonRuntimeOnlyPath)) {
    return 'yellow';
  }
  return 'red';
}

function statusReason(status, changedPaths, publishedSymlinkCount, localSymlinkCount) {
  if (publishedSymlinkCount > 0 || localSymlinkCount > 0) {
    return 'Tarball contains symlinks';
  }
  if (status === 'green') {
    return 'File population matches the published tarball';
  }
  if (status === 'yellow') {
    return `Only non-runtime files changed: ${changedPaths.join(', ')}`;
  }
  return `Runtime file population changed: ${changedPaths.join(', ')}`;
}

function isNonRuntimeOnlyPath(filePath) {
  return isMetadataOnlyPath(filePath) || isTestOnlyPath(filePath);
}

function isMetadataOnlyPath(filePath) {
  return /^(README(\..+)?|CHANGELOG(\..+)?|LICENSE(\..+)?|LICENCE(\..+)?|NOTICE(\..+)?)$/i.test(
    filePath,
  );
}

function isTestOnlyPath(filePath) {
  return /(^|\/)(__tests__\/.*|[^/]+\.(spec|test)\.[^/]+)$/i.test(filePath);
}

function deriveOverallStatus(statuses) {
  if (statuses.includes('red')) {
    return 'red';
  }
  if (statuses.includes('yellow')) {
    return 'yellow';
  }
  return 'green';
}

function renderMarkdown(report) {
  const marker = '<!-- tarball-population-report -->';
  const icon = statusIcon(report.overallStatus);
  const lines = [
    marker,
    `## ${icon} Tarball Population Report`,
    '',
    overallBlurb(report.overallStatus),
    '',
    '| Package | Status | Published | Files | Notes |',
    '| --- | --- | --- | --- | --- |',
  ];

  for (const pkg of report.packages) {
    const published = pkg.publishedVersion ? `\`${pkg.publishedVersion}\`` : 'none';
    lines.push(
      `| \`${pkg.npmSpec}\` | ${statusIcon(
        pkg.status,
      )} ${pkg.status.toUpperCase()} | ${published} | ${pkg.publishedFileCount} -> ${
        pkg.localFileCount
      } | ${escapePipes(pkg.reason)} |`,
    );
  }

  lines.push('');

  for (const pkg of report.packages) {
    if (pkg.status === 'green') {
      continue;
    }

    lines.push(`<details><summary>${statusIcon(pkg.status)} \`${pkg.npmSpec}\` details</summary>`);
    lines.push('');

    if (pkg.addedPaths.length > 0) {
      lines.push('Added paths in new tarball:');
      for (const filePath of pkg.addedPaths) {
        lines.push(`- \`${filePath}\``);
      }
      lines.push('');
    }

    if (pkg.removedPaths.length > 0) {
      lines.push('Removed paths from new tarball:');
      for (const filePath of pkg.removedPaths) {
        lines.push(`- \`${filePath}\``);
      }
      lines.push('');
    }

    if (pkg.publishedSymlinkCount > 0 || pkg.localSymlinkCount > 0) {
      lines.push(
        `Symlink count: published=${pkg.publishedSymlinkCount}, new=${pkg.localSymlinkCount}`,
      );
      lines.push('');
    }

    if (pkg.baselineError) {
      lines.push('Published baseline lookup error:');
      lines.push('```text');
      lines.push(pkg.baselineError);
      lines.push('```');
      lines.push('');
    }

    lines.push('</details>');
    lines.push('');
  }

  lines.push(`_Generated at ${report.generatedAt}_`);
  return `${lines.join('\n')}\n`;
}

function renderConsoleSummary(report) {
  const lines = [`Tarball population overall: ${report.overallStatus.toUpperCase()}`];
  for (const pkg of report.packages) {
    lines.push(
      `- ${pkg.npmSpec}: ${pkg.status.toUpperCase()} (${pkg.publishedFileCount} -> ${
        pkg.localFileCount
      }) ${pkg.reason}`,
    );
  }
  lines.push(`JSON report: ${outputJson}`);
  lines.push(`Markdown report: ${outputMarkdown}`);
  return lines.join('\n');
}

function overallBlurb(status) {
  if (status === 'green') {
    return 'No file population drift detected between the published npm tarballs and the tarballs this branch would publish.';
  }
  if (status === 'yellow') {
    return 'Only non-runtime file population drift was detected. The check stayed non-blocking, but the comment is calling it out.';
  }
  return 'Runtime tarball file population drift was detected. This check is blocking until the package contents are understood and fixed.';
}

function statusIcon(status) {
  if (status === 'green') {
    return '🟢';
  }
  if (status === 'yellow') {
    return '🟡';
  }
  return '🔴';
}

function escapePipes(value) {
  return value.replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function summarizeMissingBaseline(error) {
  const message = error.message ?? String(error);

  if (message.includes('E404')) {
    return 'No published baseline available yet';
  }

  return 'Published baseline lookup failed';
}

function firstTarballIn(directory) {
  const match = readdirSync(directory)
    .filter((entry) => entry.endsWith('.tgz'))
    .sort()[0];

  if (!match) {
    throw new Error(`No .tgz file found in ${directory}`);
  }

  return path.join(directory, match);
}

function firstTarballInIfExists(directory) {
  const matches = readdirSync(directory)
    .filter((entry) => entry.endsWith('.tgz'))
    .sort();
  if (matches.length === 0) {
    return null;
  }

  return path.join(directory, matches[0]);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? rootDir,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    const stdout = result.stdout?.trim();
    const detail = stderr || stdout;
    throw new Error(`${command} ${args.join(' ')} failed${detail ? `: ${detail}` : ''}`);
  }

  return result;
}
