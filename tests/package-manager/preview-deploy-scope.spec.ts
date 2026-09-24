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

function classifyScopeFromRawJson(params: { filesJson: string; existingLabelsJson?: string }) {
  const scriptPath = path.resolve(__dirname, '..', '..', 'scripts/github/preview-deploy-scope.mjs');

  return JSON.parse(
    execFileSync(
      'node',
      [
        scriptPath,
        '--files-json',
        params.filesJson,
        '--existing-labels-json',
        params.existingLabelsJson ?? '[]',
      ],
      { encoding: 'utf8' },
    ),
  );
}

describe('preview-deploy-scope', () => {
  it('does not recommend previews for workflow and configuration changes', () => {
    const result = classifyScope({
      files: ['.github/workflows/ci.yml', 'deploy.sh', 'tsconfig.json'],
    });

    expect(result.recommendedLabels).toEqual([]);
    expect(result.labelsToAdd).toEqual([]);
    expect(result.hasDeployImpact).toBe(false);
  });

  it('does not recommend previews for dependency-only package changes', () => {
    const files = [
      'package.json',
      'pnpm-lock.yaml',
      'packages/microapps-cdk/.projen/deps.json',
      'packages/microapps-cdk/.projenrc.js',
      'packages/microapps-cdk/package.json',
      'packages/microapps-cdk/pnpm-lock.yaml',
      'packages/microapps-datalib/package.json',
    ];
    const result = classifyScope({ files });

    expect(result.recommendedLabels).toEqual([]);
    expect(result.labelsToAdd).toEqual([]);
    expect(result.hasDeployImpact).toBe(false);
    expect(result.unmatchedFiles).toEqual(files.sort());
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

  it('keeps manually added labels without recommending a preview for config changes', () => {
    const result = classifyScope({
      files: ['packages/microapps-cdk/.projenrc.js'],
      existingLabels: ['DEPLOY-BASIC'],
    });

    expect(result.existingLabels).toEqual(['DEPLOY-BASIC']);
    expect(result.recommendedLabels).toEqual([]);
    expect(result.labelsToAdd).toEqual([]);
  });

  it('does not recommend previews for tests alone', () => {
    const result = classifyScope({
      files: [
        'packages/microapps-cdk/test/MicroApps.spec.ts',
        'packages/microapps-router/src/index.spec.ts',
        'tests/integration/demo-app.spec.ts',
      ],
    });

    expect(result.recommendedLabels).toEqual([]);
    expect(result.labelsToAdd).toEqual([]);
  });

  it('recommends a core preview for published assets in test-named paths', () => {
    const result = classifyScope({
      files: [
        'packages/static-app/src/test/example.html',
        'packages/demo-app/static_files/tests/example.html',
      ],
    });

    expect(result.recommendedLabels).toEqual(['DEPLOY-CORE']);
    expect(result.labelsToAdd).toEqual(['DEPLOY-CORE']);
    expect(result.hasDeployImpact).toBe(true);
  });

  it('tracks unmatched files without broadening labels', () => {
    const result = classifyScope({
      files: ['.nvmrc', 'packages/microapps-router/src/index.ts'],
    });

    expect(result.recommendedLabels).toEqual(['DEPLOY-CORE']);
    expect(result.labelsToAdd).toEqual(['DEPLOY-CORE']);
    expect(result.unmatchedFiles).toEqual(['.nvmrc']);
  });

  it('accepts one accidental extra JSON encoding layer', () => {
    const result = classifyScopeFromRawJson({
      filesJson: JSON.stringify(
        JSON.stringify([
          'packages/microapps-router/src/index.ts',
          'tests/integration/demo-app.spec.ts',
        ]),
      ),
      existingLabelsJson: JSON.stringify(JSON.stringify([])),
    });

    expect(result.recommendedLabels).toEqual(['DEPLOY-CORE']);
    expect(result.labelsToAdd).toEqual(['DEPLOY-CORE']);
  });
});
