import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const SUPPORTED_MANAGERS = new Set(['npm', 'pnpm', 'yarn']);
const LOCKFILES = {
  npm: ['package-lock.json', 'npm-shrinkwrap.json'],
  pnpm: ['pnpm-lock.yaml'],
  yarn: ['yarn.lock'],
};

function parseArgs(argv) {
  const args = {
    cwd: process.cwd(),
    packageManager: '',
    githubOutput: process.env.GITHUB_OUTPUT ?? '',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--cwd') {
      args.cwd = argv[i + 1];
      i += 1;
    } else if (arg === '--package-manager') {
      args.packageManager = argv[i + 1] ?? '';
      i += 1;
    } else if (arg === '--github-output') {
      args.githubOutput = argv[i + 1] ?? '';
      i += 1;
    }
  }

  return args;
}

function normalizeManager(manager) {
  const normalized = manager.trim().toLowerCase();
  if (normalized === '') {
    return '';
  }

  if (!SUPPORTED_MANAGERS.has(normalized)) {
    throw new Error(
      `Unsupported package manager "${manager}". Expected one of npm, yarn, pnpm.`,
    );
  }

  return normalized;
}

function readPackageJson(cwd) {
  const packageJsonPath = path.join(cwd, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return null;
  }

  return {
    path: packageJsonPath,
    json: JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')),
  };
}

function getManagerFromPackageJson(packageJson) {
  const packageManager = packageJson?.json?.packageManager;
  if (typeof packageManager !== 'string' || packageManager.trim() === '') {
    return { manager: '', version: '' };
  }

  const [rawManager, rawVersion = ''] = packageManager.split('@');
  return {
    manager: normalizeManager(rawManager),
    version: rawVersion,
  };
}

function detectLockfile(cwd) {
  const matches = [];

  for (const [manager, candidates] of Object.entries(LOCKFILES)) {
    for (const candidate of candidates) {
      const lockfilePath = path.join(cwd, candidate);
      if (fs.existsSync(lockfilePath)) {
        matches.push({
          manager,
          lockfileName: candidate,
          lockfilePath,
        });
        break;
      }
    }
  }

  if (matches.length === 0) {
    return null;
  }

  if (matches.length > 1) {
    throw new Error(
      `Found multiple lockfiles (${matches
        .map((match) => match.lockfileName)
        .join(', ')}). Set packageManager in package.json or pass --package-manager explicitly.`,
    );
  }

  return matches[0];
}

function getLockfileForManager(cwd, manager) {
  for (const candidate of LOCKFILES[manager]) {
    const lockfilePath = path.join(cwd, candidate);
    if (fs.existsSync(lockfilePath)) {
      return {
        manager,
        lockfileName: candidate,
        lockfilePath,
      };
    }
  }

  throw new Error(
    `Could not find a ${manager} lockfile in ${cwd}. Expected one of: ${LOCKFILES[
      manager
    ].join(', ')}`,
  );
}

function buildResult({ cwd, explicitManager }) {
  const packageJson = readPackageJson(cwd);
  const packageJsonManager = getManagerFromPackageJson(packageJson);

  const manager = explicitManager || packageJsonManager.manager;
  const resolvedManager = manager || detectLockfile(cwd)?.manager;

  if (!resolvedManager) {
    throw new Error(
      'Could not determine package manager. Pass --package-manager, set packageManager in package.json, or add a supported lockfile.',
    );
  }

  const lockfile = explicitManager || packageJsonManager.manager
    ? getLockfileForManager(cwd, resolvedManager)
    : detectLockfile(cwd);

  const lockfileSha = crypto
    .createHash('sha256')
    .update(fs.readFileSync(lockfile.lockfilePath))
    .digest('hex');

  const version =
    resolvedManager === packageJsonManager.manager ? packageJsonManager.version : '';
  const packageManagerVersion = version || 'unspecified';

  return {
    packageManager: resolvedManager,
    packageManagerVersion,
    managerCacheKey: `${resolvedManager}-${packageManagerVersion}`,
    lockfileName: lockfile.lockfileName,
    lockfilePath: path.relative(cwd, lockfile.lockfilePath),
    lockfileSha,
    installCommand:
      resolvedManager === 'npm'
        ? 'npm ci'
        : `${resolvedManager} install --frozen-lockfile`,
    needsCorepack: resolvedManager === 'npm' ? 'false' : 'true',
  };
}

function writeGithubOutput(githubOutputPath, result) {
  if (!githubOutputPath) {
    return;
  }

  const lines = Object.entries(result).map(([key, value]) => `${key}=${value}`);
  fs.appendFileSync(githubOutputPath, `${lines.join('\n')}\n`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const explicitManager = normalizeManager(args.packageManager);
  const result = buildResult({
    cwd: path.resolve(args.cwd),
    explicitManager,
  });

  writeGithubOutput(args.githubOutput, result);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
}
