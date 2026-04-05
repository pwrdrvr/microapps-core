import { existsSync, readFileSync } from 'fs';
import path from 'path';

describe('root pnpm isolation config', () => {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const rootNpmrcPath = path.join(repoRoot, '.npmrc');

  function readRootNpmrc() {
    if (!existsSync(rootNpmrcPath)) {
      return '';
    }

    return readFileSync(rootNpmrcPath, 'utf8');
  }

  it('rejects a repo-wide hoisted node linker override', () => {
    expect(readRootNpmrc()).not.toMatch(/^\s*node-?linker\s*=\s*hoisted\s*$/im);
  });

  it('rejects blanket root-visible phantom dependency exposure', () => {
    expect(readRootNpmrc()).not.toMatch(/^\s*public-?hoist-?pattern(?:\[\])?\s*=\s*\*\s*$/im);
  });

  it('rejects shamefully hoisted installs at the repo root', () => {
    expect(readRootNpmrc()).not.toMatch(/^\s*shamefully-?hoist\s*=\s*true\s*$/im);
  });
});
