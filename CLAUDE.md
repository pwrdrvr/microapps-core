# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MicroApps enables deploying many web applications to AWS on a single shared hostname with CloudFront, S3 static assets, and API Gateway routing. Applications are deployed as Lambda functions with version-based routing controlled by the `microapps-router` Lambda@Edge function.

## Commands

### Building
```bash
# Build all TypeScript and bundle Lambda functions
npm run build:all

# Build TypeScript only (all packages)
npm run build

# Build individual Lambda bundles
npm run esbuild:deployer   # Bundles deployer Lambda
npm run esbuild:router     # Bundles router Lambda
npm run esbuild:edge-to-origin  # Bundles edge function
```

### Testing
```bash
# Run all unit tests (uses jest-dynalite for local DynamoDB)
npm test

# Run integration tests
npm run test:integration

# Run tests for specific package
cd packages/microapps-router && npm test
```

### Linting
```bash
npm run lint              # ESLint check
npm run lint-and-fix      # ESLint with auto-fix
npm run format            # Prettier formatting
```

### Cleanup
```bash
npm run clean             # Remove dist/ and .tsbuildinfo
npm run clean:super       # Also remove node_modules
```

### Deploying
```bash
# Deploy the example CDK stack
./deploy.sh

# Or manually:
npx cdk deploy --context @pwrdrvr/microapps:deployReleaseApp=true microapps-basic
```

## Architecture

### Monorepo Structure

This is a Yarn workspace monorepo with TypeScript project references. Key packages:

- **microapps-cdk**: Turn-key CDK construct (published via jsii for multi-language support)
- **microapps-deployer**: Lambda function that handles app deployments (invoked by pwrdrvr CLI)
- **microapps-router**: Lambda@Edge function that routes requests to app versions
- **microapps-edge-to-origin**: Alternative CloudFront edge function for routing
- **microapps-datalib**: Shared DynamoDB models and data access layer
- **microapps-deployer-lib**: Message types/interfaces for deployer operations
- **microapps-router-lib**: Shared routing utilities
- **pwrdrvr**: CLI tool for publishing apps (uses oclif framework)
- **cdk**: Example CDK stack demonstrating MicroApps usage
- **demo-app**: Test application without any UI framework

### Component Relationships

```
pwrdrvr CLI → invokes → microapps-deployer Lambda
                          ↓
                        DynamoDB (via microapps-datalib)
                          ↓
CloudFront → microapps-router Lambda → API Gateway → App Lambda Functions
```

**Request Flow:**
1. User hits CloudFront URL: `/{appname}/`
2. Router Lambda looks up current version for app in DynamoDB
3. Router returns redirect or iframe to versioned app endpoint
4. App Lambda serves the request via Lambda Function URL or API Gateway

### Lambda Function Bundling

Lambda functions use a three-layer build strategy:

1. **TypeScript compilation** (`tsc --build`) - Compiles all packages
2. **esbuild bundling** - Bundles Lambda functions to single files:
   - Deployer → `packages/cdk/dist/microapps-deployer/index.js`
   - Router → `packages/cdk/dist/microapps-router/index.js`
   - Edge-to-Origin → `packages/microapps-cdk/lib/microapps-edge-to-origin/index.js`
3. **CDK fallback** - If pre-bundled code unavailable, uses NodejsFunction

The CDK construct looks for pre-bundled Lambda code first (for CI/CD speed), then falls back to runtime bundling.

### Configuration System

Both Router and Deployer use **ts-convict** with YAML configuration files:

- Base config: `config.yml`
- Environment-specific: `config-{dev|qa|prod|local}.yml`
- Selected via `NODE_ENV` environment variable
- Lambda environment variables override YAML settings

Key config sections:
- **db**: DynamoDB table name, region
- **fileStore**: S3 staging and destination buckets
- **apiGateway**: Base URLs, endpoints
- **iam**: Role names for upload operations
- **routing**: Root path prefix, default files

### Data Layer

**DBManager** (packages/microapps-datalib/src/manager.ts) provides DynamoDB access using AWS SDK v3:
- `DynamoDBDocument` for simpler operations
- `DynamoDBClient` for low-level operations
- Models: Application, Version, Rules

**Message Types** (packages/microapps-deployer-lib/src/messages/):
- `IRequestBase` with operation types: `createApp`, `deployVersion`, `deleteVersion`, etc.
- `AppType`: `lambda`, `lambda-url`, `url`, `static`
- `AppStartupType`: `iframe` (transparent iframe) or `direct` (framework with relative URLs)

## Testing Patterns

- **Framework**: Jest 29 with ts-jest preset
- **Test files**: `**/*.spec.ts`
- **Local DynamoDB**: jest-dynalite for integration tests
- **Mocking**: aws-sdk-client-mock for AWS SDK v3, sinon for spies/stubs
- **Coverage**: Collected automatically, output to `/coverage`

To test Lambda functions locally:
```typescript
// Override dependencies for testing
import { overrideDBManager } from './index';
overrideDBManager({ dbManager: mockDB, dynamoClient: mockClient });
```

## Development Workflow

### Modifying Lambda Functions

1. Edit source in `packages/microapps-{deployer|router}/src/index.ts`
2. Run `npm run esbuild:{deployer|router}` to bundle
3. Run `npm test` to verify changes
4. Update config if adding new environment variables

### Adding New Deployer Operations

1. Add message type to `packages/microapps-deployer-lib/src/messages/`
2. Implement handler in `packages/microapps-deployer/src/controllers/`
3. Add switch case in `packages/microapps-deployer/src/index.ts`
4. Export new types from deployer-lib `index.ts`

### Modifying Routing Logic

1. Core logic: `packages/microapps-router-lib/src/get-route.ts`
2. Lambda handler: `packages/microapps-router/src/index.ts`
3. Update tests in both locations
4. Rebuild with `npm run esbuild:router`

### Working with the CDK Construct

The `MicroApps` construct (packages/microapps-cdk/src/MicroApps.ts) is the turn-key solution. For more control, use individual constructs:
- `MicroAppsSvcs` - DynamoDB, Router, Deployer Lambdas
- `MicroAppsCF` - CloudFront distribution
- `MicroAppsS3` - S3 buckets for static assets
- `MicroAppsAPIGwy` - API Gateway HTTP API

## Important Notes

- This repo uses **Yarn**, not npm (npm has dependency resolution issues with jest)
- Lambda functions target **Node 18** runtime
- All Lambda function code is bundled with **esbuild** (not webpack)
- TypeScript uses **project references** (tsconfig.json references packages)
- The CDK construct uses **jsii** for multi-language support (Python, Java, .NET)
- Router Lambda uses **Lambda@Edge** pricing (3x more expensive than origin Lambda)
- Test files use `isolatedModules: true` in ts-jest for faster compilation
- The **microapps-cdk** package is managed by **projen** and has its own ESLint config with `@stylistic` rules - it's excluded from root linting via `.eslintignore`

## Common Issues

### Lambda Function Changes Not Reflected

If changes to Lambda functions aren't appearing after CDK deploy:
1. Ensure you ran the esbuild command for that Lambda
2. Check that `packages/cdk/dist/microapps-{deployer|router}/index.js` was updated
3. Verify `npm run build:all` completed successfully

### Test Failures with DynamoDB

If tests fail with DynamoDB errors:
1. Ensure `jest-dynalite` is properly initialized (check `setupBeforeEnv.js`)
2. Verify `jest-dynalite-config.js` has correct table definitions
3. Check that `AWS_PROFILE` is unset during test runs

### CDK Deploy Issues

If CDK deploy fails with Lambda bundling errors:
1. Try running `npm run build:all` first to pre-bundle
2. Check that all package dependencies are installed
3. Verify `node_modules/@types` has required type definitions

### ESLint Errors with @stylistic Plugin

If you see errors like `Error while loading rule '@stylistic/indent'`:
- The `microapps-cdk` package is managed by projen and uses `@stylistic/eslint-plugin`
- This package is excluded from root linting in `.eslintignore`
- To lint microapps-cdk, use `cd packages/microapps-cdk && npx projen eslint`
- Do not modify `.eslintrc.json` in microapps-cdk directly - edit `.projenrc.js` instead
