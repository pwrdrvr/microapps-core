#!/bin/zsh -x

# Install Modules
npm ci

# Set Node Env
NODE_ENV=dev

# Deploy CDK Stack
npx cdk deploy microapps-core --context @pwrdrvr/microapps:deployReleaseApp=true microapps-basic

# Extract Release App version
RELEASE_APP_PACKAGE_VERSION=$(node -p -e "require('./node_modules/@pwrdrvr/microapps-app-release-cdk/package.json').version")

# Extract Deployer Lambda Name
DEPLOYER_LAMBDA_NAME="$(aws cloudformation list-exports --query "Exports[?Name==\`microapps-demo-deploy-${NODE_ENV}-deployer-func-name\`].Value" --no-paginate --output text)"

# Extract Release App Lambda Name
RELEASE_APP_LAMBDA_NAME=$(aws cloudformation list-exports --query "Exports[?Name==\`microapps-demo-deploy-${NODE_ENV}-release-app-func-name\`].Value" --no-paginate --output text)

# Extract Edge Domain Name
EDGE_DOMAIN=$(aws cloudformation list-exports --query "Exports[?Name==\`microapps-demo-deploy-${NODE_ENV}-edge-domain-name\`].Value" --no-paginate --output text)

# Deploy the Release App
npx microapps-publish publish -a release -n ${RELEASE_APP_PACKAGE_VERSION} -d ${DEPLOYER_LAMBDA_NAME} -l ${RELEASE_APP_LAMBDA_NAME} -s node_modules/@pwrdrvr/microapps-app-release-cdk/lib/static_files/release/${RELEASE_APP_PACKAGE_VERSION}/ --overwrite --noCache

# Print App URL
echo "App Available at URL: https://${EDGE_DOMAIN}/release/"
