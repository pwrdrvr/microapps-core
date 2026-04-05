import path from 'path';
import { ESLint } from 'eslint';

describe('import boundary lint config', () => {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const fixturesRoot = path.join(repoRoot, 'tests', 'fixtures', 'import-boundaries');

  async function lintFixture(packageName: 'valid-package' | 'invalid-package') {
    const eslint = new ESLint({
      cwd: repoRoot,
      errorOnUnmatchedPattern: true,
      ignore: false,
    });

    const [result] = await eslint.lintFiles([
      path.join(fixturesRoot, packageName, 'src', 'index.ts'),
    ]);

    return result;
  }

  it('allows a declared dependency in package source', async () => {
    const result = await lintFixture('valid-package');

    expect(result.messages).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleId: 'import/no-extraneous-dependencies' }),
      ]),
    );
    expect(result.errorCount).toBe(0);
  });

  it('rejects an undeclared dependency in package source', async () => {
    const result = await lintFixture('invalid-package');
    const extraneousDependencyErrors = result.messages.filter(
      (message) => message.ruleId === 'import/no-extraneous-dependencies',
    );

    expect(extraneousDependencyErrors).toHaveLength(1);
    expect(extraneousDependencyErrors[0]?.message).toContain("'yaml'");
  });
});
