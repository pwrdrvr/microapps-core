const fs = require('fs');
const path = require('path');

// Get the new version from the command-line arguments
let newVersion = process.argv[2];

if (!newVersion) {
  console.error('Please provide a version as the first argument.');
  console.log(`Usage: node ${path.relative(process.cwd(), process.argv[1])} x.y.z`);
  process.exit(1);
}

newVersion = newVersion.replace(/.*\//, '').replace(/^v/, '');

// Validate the new version
if (!isSemverLike(newVersion)) {
  console.error(
    'Invalid version. Please provide a version in the format x.y.z as the first argument.',
  );
  console.log(`Usage: node ${path.relative(process.cwd(), process.argv[1])} x.y.z`);
  process.exit(1);
}

for (const file of findPackageJsonFiles(process.cwd())) {
  const pkg = JSON.parse(fs.readFileSync(file, 'utf-8'));
  pkg.version = newVersion;
  fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
}

function isSemverLike(version) {
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(version);
}

function findPackageJsonFiles(rootDir) {
  const packageJsonFiles = [];
  const ignoredDirectories = new Set(['node_modules', 'dist', 'cdk.out', 'coverage', '.git']);

  walk(rootDir, packageJsonFiles, ignoredDirectories);

  return packageJsonFiles;
}

function walk(currentDir, packageJsonFiles, ignoredDirectories) {
  for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        walk(path.join(currentDir, entry.name), packageJsonFiles, ignoredDirectories);
      }
      continue;
    }

    if (entry.isFile() && entry.name === 'package.json') {
      packageJsonFiles.push(path.join(currentDir, entry.name));
    }
  }
}
