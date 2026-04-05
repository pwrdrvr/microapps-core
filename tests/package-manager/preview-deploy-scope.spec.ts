import { execFileSync } from 'child_process';
import path from 'path';

function classifyScope(params: { files: string[]; existingLabels?: string[] }) {
  const scriptPath = path.resolve(__dirname, '..', '..', 'scripts/github/preview-deploy-scope.mjs');

  return JSON.parse(
    execFileSync(
      'node',
      [
        scriptPath,
        '--files-json',
        JSON.stringify(params.files),
        '--existing-labels-json',
        JSON.stringify(params.existingLabels ?? []),
      ],
      { encoding: 'utf8' },
    ),
  );
}

describe('preview-deploy-scope', () => {
  it('adds only DEPLOY-CORE for workflow changes', () => {
    const result = classifyScope({
      files: ['.github/workflows/ci.yml'],
    });

    expect(result.recommendedLabels).toEqual(['DEPLOY-CORE']);
    expect(result.labelsToAdd).toEqual(['DEPLOY-CORE']);
    expect(result.matchedGroups).toEqual([
      {
        name: 'workflow-config',
        labels: ['DEPLOY-CORE'],
        files: ['.github/workflows/ci.yml'],
      },
    ]);
  });

  it('adds all preview labels for packages/cdk changes', () => {
    const result = classifyScope({
      files: ['packages/cdk/bin/cdk.ts'],
    });

    expect(result.recommendedLabels).toEqual([
      'DEPLOY-CORE',
      'DEPLOY-BASIC',
      'DEPLOY-BASIC-PREFIX',
    ]);
    expect(result.labelsToAdd).toEqual(['DEPLOY-CORE', 'DEPLOY-BASIC', 'DEPLOY-BASIC-PREFIX']);
  });

  it('does not label documentation-only changes', () => {
    const result = classifyScope({
      files: [
        'README.md',
        'docs/brainstorms/2026-04-04-preview-deploy-auto-labeling-requirements.md',
      ],
    });

    expect(result.recommendedLabels).toEqual([]);
    expect(result.labelsToAdd).toEqual([]);
    expect(result.hasDeployImpact).toBe(false);
    expect(result.unmatchedFiles).toEqual([]);
  });

  it('filters out already-present labels from add requests', () => {
    const result = classifyScope({
      files: ['packages/microapps-cdk/src/MicroApps.ts'],
      existingLabels: ['DEPLOY-CORE'],
    });

    expect(result.recommendedLabels).toEqual([
      'DEPLOY-CORE',
      'DEPLOY-BASIC',
      'DEPLOY-BASIC-PREFIX',
    ]);
    expect(result.labelsToAdd).toEqual(['DEPLOY-BASIC', 'DEPLOY-BASIC-PREFIX']);
  });

  it('tracks unmatched files without broadening labels', () => {
    const result = classifyScope({
      files: ['.nvmrc', 'packages/microapps-router/src/index.ts'],
    });

    expect(result.recommendedLabels).toEqual(['DEPLOY-CORE']);
    expect(result.labelsToAdd).toEqual(['DEPLOY-CORE']);
    expect(result.unmatchedFiles).toEqual(['.nvmrc']);
  });
});
