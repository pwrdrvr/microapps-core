/// <reference types="jest" />
import fs from 'fs';
import path from 'path';

const repoRoot = path.resolve(__dirname, '..', '..', '..');

function readRepoFile(...segments: string[]) {
  return fs.readFileSync(path.join(repoRoot, ...segments), 'utf8');
}

describe('microapps-cdk package manager configuration', () => {
  it('pins pnpm in the projen source', () => {
    const projenrc = readRepoFile('packages', 'microapps-cdk', '.projenrc.js');

    expect(projenrc).toContain('packageManager: javascript.NodePackageManager.PNPM');
    expect(projenrc).toContain("pnpmVersion: '10'");
  });

  it('commits pnpm-based standalone build artifacts', () => {
    expect(
      fs.existsSync(path.join(repoRoot, 'packages', 'microapps-cdk', 'pnpm-lock.yaml')),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(repoRoot, 'packages', 'microapps-cdk', 'yarn.lock')),
    ).toBe(false);

    const buildWorkflow = readRepoFile(
      'packages',
      'microapps-cdk',
      '.github',
      'workflows',
      'build.yml',
    );
    const releaseWorkflow = readRepoFile(
      'packages',
      'microapps-cdk',
      '.github',
      'workflows',
      'release.yml',
    );

    expect(buildWorkflow).toContain('uses: pnpm/action-setup@v4');
    expect(buildWorkflow).toContain('run: pnpm i --no-frozen-lockfile');
    expect(buildWorkflow).not.toContain('yarn install');

    expect(releaseWorkflow).toContain('uses: pnpm/action-setup@v4');
    expect(releaseWorkflow).toContain('run: pnpm i --frozen-lockfile');
    expect(releaseWorkflow).not.toContain('yarn install');
  });
});
