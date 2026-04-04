import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

function makeTempWorkspace(files: Record<string, string>) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'resolve-manager-'));

  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(cwd, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, content);
  }

  return cwd;
}

function resolveManager(cwd: string, packageManager = '') {
  const scriptPath = path.resolve(
    __dirname,
    '..',
    '..',
    'scripts/package-manager/resolve-manager.mjs',
  );
  const args = ['--cwd', cwd];

  if (packageManager !== '') {
    args.push('--package-manager', packageManager);
  }

  return JSON.parse(execFileSync('node', [scriptPath, ...args], { encoding: 'utf8' }));
}

describe('resolve-manager', () => {
  it('uses the explicit pnpm input when provided', () => {
    const cwd = makeTempWorkspace({
      'package.json': JSON.stringify({ name: 'fixture' }),
      'pnpm-lock.yaml': 'lockfileVersion: 9.0\n',
    });

    expect(resolveManager(cwd, 'pnpm')).toMatchObject({
      packageManager: 'pnpm',
      lockfileName: 'pnpm-lock.yaml',
      installCommand: 'pnpm install --frozen-lockfile',
      needsCorepack: 'true',
    });
  });

  it('uses the explicit yarn input when provided', () => {
    const cwd = makeTempWorkspace({
      'package.json': JSON.stringify({ name: 'fixture' }),
      'yarn.lock': '# yarn lockfile v1\n',
    });

    expect(resolveManager(cwd, 'yarn')).toMatchObject({
      packageManager: 'yarn',
      lockfileName: 'yarn.lock',
      installCommand: 'yarn install --frozen-lockfile',
      needsCorepack: 'true',
    });
  });

  it('uses npm lockfiles when npm is selected explicitly', () => {
    const cwd = makeTempWorkspace({
      'package.json': JSON.stringify({ name: 'fixture' }),
      'package-lock.json': '{"name":"fixture"}\n',
    });

    expect(resolveManager(cwd, 'npm')).toMatchObject({
      packageManager: 'npm',
      lockfileName: 'package-lock.json',
      installCommand: 'npm ci',
      needsCorepack: 'false',
    });
  });

  it('prefers packageManager from package.json over a stale secondary lockfile', () => {
    const cwd = makeTempWorkspace({
      'package.json': JSON.stringify({
        name: 'fixture',
        packageManager: 'pnpm@10.29.3',
      }),
      'pnpm-lock.yaml': 'lockfileVersion: 9.0\n',
      'yarn.lock': '# stale lockfile\n',
    });

    expect(resolveManager(cwd)).toMatchObject({
      packageManager: 'pnpm',
      packageManagerVersion: '10.29.3',
      lockfileName: 'pnpm-lock.yaml',
      managerCacheKey: 'pnpm-10.29.3',
    });
  });

  it('fails when no manager signal is available', () => {
    const cwd = makeTempWorkspace({
      'package.json': JSON.stringify({ name: 'fixture' }),
    });
    const scriptPath = path.resolve(
      __dirname,
      '..',
      '..',
      'scripts/package-manager/resolve-manager.mjs',
    );

    expect(() =>
      execFileSync('node', [scriptPath, '--cwd', cwd], { encoding: 'utf8' }),
    ).toThrow(/Could not determine package manager/);
  });
});
