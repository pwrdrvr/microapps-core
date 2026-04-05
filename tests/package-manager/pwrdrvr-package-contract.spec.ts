import { readFileSync } from 'fs';
import path from 'path';

describe('pwrdrvr package contract', () => {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const packageJson = JSON.parse(
    readFileSync(path.join(repoRoot, 'packages', 'pwrdrvr', 'package.json'), 'utf8'),
  );

  it('does not ship microapps-deployer-lib as a runtime dependency', () => {
    expect(packageJson.dependencies).not.toHaveProperty('@pwrdrvr/microapps-deployer-lib');
  });

  it('does not retain microapps-deployer-lib as a local package dependency either', () => {
    expect(packageJson.devDependencies).not.toHaveProperty('@pwrdrvr/microapps-deployer-lib');
  });
});
