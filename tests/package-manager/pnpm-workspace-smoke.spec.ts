import { readFileSync } from 'fs';
import path from 'path';

describe('pnpm workspace contract', () => {
  const repoRoot = path.resolve(__dirname, '..', '..');

  it('pins pnpm as the root package manager', () => {
    const packageJson = JSON.parse(
      readFileSync(path.join(repoRoot, 'package.json'), 'utf8'),
    );

    expect(packageJson.packageManager).toMatch(/^pnpm@/);
    expect(packageJson.pnpm?.overrides).toMatchObject({
      constructs: '10.0.5',
      terser: '^5.14.2',
    });
  });

  it('declares the workspace packages in pnpm-workspace.yaml', () => {
    const workspaceConfig = readFileSync(
      path.join(repoRoot, 'pnpm-workspace.yaml'),
      'utf8',
    );

    expect(workspaceConfig).toContain('packages:');
    expect(workspaceConfig).toContain('- "packages/*"');
  });
});
