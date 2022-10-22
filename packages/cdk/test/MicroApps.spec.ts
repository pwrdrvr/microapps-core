/// <reference types="jest" />
import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { MicroAppsStack } from '../lib/MicroApps';

describe('MicroAppsStack', () => {
  it('works with no params', () => {
    const app = new App({});
    const stackName = 'stack';
    const stack = new MicroAppsStack(app, stackName, {
      env: {
        region: 'us-east-1',
      },
    });

    expect(stack).toBeDefined();
    Template.fromStack(stack).hasResourceProperties('AWS::Lambda::Function', {});
    Template.fromStack(stack).resourceCountIs('AWS::Lambda::Function', 5);
    Template.fromStack(stack).hasOutput('edgedomainname', {
      Value: { 'Fn::GetAtt': ['microappscft5FDF8AB8', 'DomainName'] },
      Export: { Name: `${stackName}-edge-domain-name` },
    });
    Template.fromStack(stack).hasOutput('dynamodbtablename', {
      Value: { Ref: 'microappssvcstable1C50DC7E' },
    });
  });

  it('stable names with params', () => {
    const app = new App({});
    const stackName = 'microapps-stack-name';
    const stack = new MicroAppsStack(app, 'stack', {
      env: {
        region: 'us-east-1',
      },
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
    Template.fromStack(stack).hasResourceProperties('AWS::Lambda::Function', {});
    Template.fromStack(stack).resourceCountIs('AWS::Lambda::Function', 5);
    Template.fromStack(stack).hasOutput('edgedomainname', {
      Value: 'appz.pwrdrvr.com',
      Export: { Name: `${stackName}-edge-domain-name` },
    });
    Template.fromStack(stack).hasOutput('dynamodbtablename', {
      Value: { Ref: 'microappssvcstable1C50DC7E' },
      Export: { Name: `${stackName}-dynamodb-table-name` },
    });
  });
});
