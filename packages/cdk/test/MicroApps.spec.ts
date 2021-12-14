/// <reference types="jest" />
import '@aws-cdk/assert/jest';
import { App } from '@aws-cdk/core';
import { MicroAppsStack } from '../lib/MicroApps';

describe('MicroAppsStack', () => {
  it('works with no params', () => {
    const app = new App({});
    const stackName = 'construct';
    const stack = new MicroAppsStack(app, stackName, {});

    expect(stack).toBeDefined();
    const template = app.synth().getStackArtifact(stack.artifactId).template;
    expect(template).toHaveResource('AWS::Lambda::Function');
    expect(template).toHaveOutput({
      exportName: `${stackName}-edge-domain-name`,
      outputValue: { 'Fn::GetAtt': ['microappscft5FDF8AB8', 'DomainName'] },
    });
    // Not sure why this is giving a Value Ref
    expect(template).toHaveOutput({
      exportName: `${stackName}-dynamodb-table-name`,
      outputValue: { Ref: 'microappssvcstable1C50DC7E' },
    });
  });

  it('stable names with params', () => {
    const app = new App({});
    const stackName = 'microapps-stack-name';
    const stack = new MicroAppsStack(app, 'construct', {
      stackName,
      domainNameEdge: 'appz.pwrdrvr.com',
      domainNameOrigin: 'appz-origin.pwrdrvr.com',
      certARNEdge: `arn:aws:acm:us-east-1:123456789012:certificate/26EA0E0D-C956-493C-B60D-76EB8C5BA32D`,
      certARNOrigin: `arn:aws:acm:us-east-2:123456789012:certificate/B2ACCAE3-9023-444E-A3D0-F58C2740882C`,
      r53ZoneID: '23523ASDG',
      r53ZoneName: 'pwrdrvr.com',
      assetNameRoot: 'microapps-random',
      assetNameSuffix: '-pr-123',
    });

    expect(stack).toBeDefined();
    const template = app.synth().getStackArtifact(stack.artifactId).template;
    expect(template).toHaveResource('AWS::Lambda::Function');
    expect(template).toHaveOutput({
      exportName: `${stackName}-edge-domain-name`,
      outputValue: 'appz.pwrdrvr.com',
    });
    // Not sure why this is giving a Value Ref
    expect(template).toHaveOutput({
      exportName: `${stackName}-dynamodb-table-name`,
      outputValue: { Ref: 'microappssvcstable1C50DC7E' },
    });
  });
});
