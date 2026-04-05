import fs from 'fs';

const LABEL_ORDER = ['DEPLOY-CORE', 'DEPLOY-BASIC', 'DEPLOY-BASIC-PREFIX'];

const EXACT_CORE_PATHS = new Set([
  'deploy.sh',
  'package.json',
  'pnpm-lock.yaml',
  'tsconfig.json',
  'tsconfig.packages.json',
  'tsconfig.publish.json',
  'cdk.json',
  'jest.config.js',
  'jest.int.config.js',
  '.demo-app-replace.config.js',
  '.nextjs-demo-replace.config.js',
  '.release-replace.config.js',
]);

const DOC_PATH_PATTERNS = [
  /^README\.md$/i,
  /^CHANGELOG\.md$/i,
  /^LICENSE$/i,
  /^docs\//,
  /^packages\/[^/]+\/README\.md$/i,
];

const GROUPS = [
  {
    name: 'workflow-config',
    labels: ['DEPLOY-CORE'],
    matches(file) {
      return file.startsWith('.github/workflows/') || file.startsWith('.github/actions/');
    },
  },
  {
    name: 'deploy-scripts-and-config',
    labels: ['DEPLOY-CORE'],
    matches(file) {
      return EXACT_CORE_PATHS.has(file);
    },
  },
  {
    name: 'preview-stack-definitions',
    labels: ['DEPLOY-CORE', 'DEPLOY-BASIC', 'DEPLOY-BASIC-PREFIX'],
    matches(file) {
      return file.startsWith('packages/cdk/') || file.startsWith('packages/microapps-cdk/');
    },
  },
  {
    name: 'runtime-packages',
    labels: ['DEPLOY-CORE'],
    matches(file) {
      return (
        file.startsWith('packages/microapps-deployer/') ||
        file.startsWith('packages/microapps-deployer-lib/') ||
        file.startsWith('packages/microapps-router/') ||
        file.startsWith('packages/microapps-router-lib/') ||
        file.startsWith('packages/microapps-edge-to-origin/') ||
        file.startsWith('packages/microapps-datalib/') ||
        file.startsWith('packages/pwrdrvr/') ||
        file.startsWith('packages/demo-app/') ||
        file.startsWith('packages/static-app/') ||
        file.startsWith('packages/microapps-publish/')
      );
    },
  },
  {
    name: 'preview-test-harness',
    labels: ['DEPLOY-CORE'],
    matches(file) {
      return file.startsWith('tests/integration/');
    },
  },
];

function parseArgs(argv) {
  const args = {
    filesJson: '[]',
    existingLabelsJson: '[]',
    githubOutput: process.env.GITHUB_OUTPUT ?? '',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--files-json') {
      args.filesJson = argv[i + 1] ?? '[]';
      i += 1;
    } else if (arg === '--existing-labels-json') {
      args.existingLabelsJson = argv[i + 1] ?? '[]';
      i += 1;
    } else if (arg === '--github-output') {
      args.githubOutput = argv[i + 1] ?? '';
      i += 1;
    }
  }

  return args;
}

function parseStringArray(rawValue, label) {
  let value;

  try {
    value = JSON.parse(rawValue);
  } catch (error) {
    throw new Error(`Could not parse ${label} as JSON: ${error.message}`);
  }

  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new Error(`${label} must be a JSON array of strings.`);
  }

  return value;
}

function normalizeFile(file) {
  return file.replace(/\\/g, '/').replace(/^\.\/+/, '');
}

function isDocumentationOnlyPath(file) {
  return DOC_PATH_PATTERNS.some((pattern) => pattern.test(file));
}

function sortLabels(labels) {
  return [...labels].sort((left, right) => LABEL_ORDER.indexOf(left) - LABEL_ORDER.indexOf(right));
}

function classifyScope({ files, existingLabels }) {
  const matchedGroups = [];
  const recommendedLabels = new Set();
  const unmatchedFiles = [];

  for (const group of GROUPS) {
    const matchedFiles = files.filter((file) => group.matches(file));

    if (matchedFiles.length === 0) {
      continue;
    }

    matchedGroups.push({
      name: group.name,
      labels: group.labels,
      files: matchedFiles,
    });

    for (const label of group.labels) {
      recommendedLabels.add(label);
    }
  }

  const matchedFiles = new Set(matchedGroups.flatMap((group) => group.files));
  for (const file of files) {
    if (matchedFiles.has(file) || isDocumentationOnlyPath(file)) {
      continue;
    }

    unmatchedFiles.push(file);
  }

  const labelsToAdd = sortLabels(
    [...recommendedLabels].filter((label) => !existingLabels.includes(label)),
  );

  return {
    files,
    existingLabels,
    recommendedLabels: sortLabels([...recommendedLabels]),
    labelsToAdd,
    matchedGroups,
    unmatchedFiles,
    hasDeployImpact: recommendedLabels.size > 0,
  };
}

function writeGithubOutput(githubOutputPath, result) {
  if (!githubOutputPath) {
    return;
  }

  const lines = [
    `recommended_labels_json=${JSON.stringify(result.recommendedLabels)}`,
    `labels_to_add_json=${JSON.stringify(result.labelsToAdd)}`,
    `labels_to_add_csv=${result.labelsToAdd.join(',')}`,
    `matched_groups_json=${JSON.stringify(result.matchedGroups)}`,
    `unmatched_files_json=${JSON.stringify(result.unmatchedFiles)}`,
    `has_deploy_impact=${result.hasDeployImpact ? 'true' : 'false'}`,
  ];

  fs.appendFileSync(githubOutputPath, `${lines.join('\n')}\n`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const files = parseStringArray(args.filesJson, 'files-json').map(normalizeFile).sort();
  const existingLabels = parseStringArray(args.existingLabelsJson, 'existing-labels-json');

  const result = classifyScope({
    files,
    existingLabels,
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
