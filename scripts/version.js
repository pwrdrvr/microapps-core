const glob = require('glob');
const fs = require('fs');
const path = require('path');
const semver = require('semver');

// Get the new version from the command-line arguments
let newVersion = process.argv[2];

if (!newVersion) {
  console.error('Please provide a version as the first argument.');
  console.log(`Usage: node ${path.relative(process.cwd(), process.argv[1])} x.y.z`);
  process.exit(1);
}

newVersion = newVersion.replace(/.*\//, '').replace(/^v/, '');

// Validate the new version
if (!semver.valid(newVersion)) {
  console.error(
    'Invalid version. Please provide a version in the format x.y.z as the first argument.',
  );
  console.log(`Usage: node ${path.relative(process.cwd(), process.argv[1])} x.y.z`);
  process.exit(1);
}

glob(
  '**/package.json',
  { ignore: ['node_modules/**', 'dist/**', 'cdk.out/**', 'coverage/**'] },
  (err, files) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }

    files.forEach((file) => {
      const pkg = JSON.parse(fs.readFileSync(file, 'utf-8'));
      pkg.version = newVersion;
      fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
    });
  },
);
