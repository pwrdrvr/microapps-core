# Overview

This CDK project deploys the core infrastructure for the MicroApps framework. This project only needs to be deployed once per account / env / etc. or when changes have been made to the upstream project.

## Useful commands

All commands should be run from the root of the git repo, the directory that contains `cdk.json`.

- `npm run build` compile typescript to js
- `npm run test` perform the jest unit tests
- `cdk list` list the available stack names - particularly useful when overriding names
- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template
