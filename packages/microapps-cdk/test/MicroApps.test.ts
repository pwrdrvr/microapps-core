/// <reference types="jest" />
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as r53 from 'aws-cdk-lib/aws-route53';
import { MicroApps } from '../src/MicroApps';

describe('MicroApps', () => {
  it('works with no params', () => {
    const app = new App({});
    const stack = new Stack(app, 'stack', {
      env: {
        region: 'us-east-2',
      },
    });
    const construct = new MicroApps(stack, 'construct', {
      appEnv: 'dev',
    });

    expect(construct).toBeDefined();
    expect(construct.apigwy).toBeDefined();
    expect(construct.edgeToOrigin).toBeDefined();
    expect(construct.cf).toBeDefined();
    expect(construct.s3).toBeDefined();
    expect(construct.svcs).toBeDefined();

    expect(construct.node).toBeDefined();
    Template.fromStack(stack).resourceCountIs('AWS::DynamoDB::Table', 1);
    Template.fromStack(stack).resourceCountIs('AWS::CloudFront::Distribution', 1);
    Template.fromStack(stack).resourceCountIs('AWS::Lambda::Function', 4);

    // Confirm that logical IDs have not changed accidentally (causes delete/create)
    Template.fromStack(stack).templateMatches({
      Resources: {
        constructapigwy894904EC: {
          Type: 'AWS::ApiGatewayV2::Api',
        },
        constructcft0A8410EA: {
          Type: 'AWS::CloudFront::Distribution',
        },
        constructsvcstable0311CF05: {
          Type: 'AWS::DynamoDB::Table',
        },
        // constructedgeToOriginedgetoapigwyfuncFn10C0FCC9: {
        //   Type: 'AWS::Lambda::Function',
        // },
        constructsvcsrouterfunc73102284: {
          Type: 'AWS::Lambda::Function',
        },
        constructs3apps91016270: {
          Type: 'AWS::S3::Bucket',
        },
        constructs3logs6D37B88F: {
          Type: 'AWS::S3::Bucket',
        },
        constructs3staging7AA4BA4F: {
          Type: 'AWS::S3::Bucket',
        },
      },
    });
  });

  it('works with only edge params', () => {
    const app = new App({});
    const stack = new Stack(app, 'stack', {
      env: {
        region: 'us-east-2',
      },
    });
    const certEdge = new acm.Certificate(stack, 'cert', {
      domainName: '*.test.pwrdrvr.com',
    });
    const r53Zone = new r53.HostedZone(stack, 'zone', {
      zoneName: 'test.pwrdrvr.com',
    });
    const construct = new MicroApps(stack, 'construct', {
      appEnv: 'dev',
      domainNameEdge: 'mydeploy.test.pwrdrvr.com',
      certEdge,
      certOrigin: certEdge,
      r53Zone,
    });

    expect(construct).toBeDefined();
    expect(construct.apigwy).toBeDefined();
    expect(construct.edgeToOrigin).toBeDefined();
    expect(construct.cf).toBeDefined();
    expect(construct.s3).toBeDefined();
    expect(construct.svcs).toBeDefined();

    expect(construct.node).toBeDefined();
    Template.fromStack(stack).resourceCountIs('AWS::DynamoDB::Table', 1);
    Template.fromStack(stack).resourceCountIs('AWS::CloudFront::Distribution', 1);
    Template.fromStack(stack).resourceCountIs('AWS::Lambda::Function', 4);

    // Confirm that logical IDs have not changed accidentally (causes delete/create)
    Template.fromStack(stack).templateMatches({
      Resources: {
        constructapigwy894904EC: {
          Type: 'AWS::ApiGatewayV2::Api',
        },
        constructcft0A8410EA: {
          Type: 'AWS::CloudFront::Distribution',
        },
        constructsvcstable0311CF05: {
          Type: 'AWS::DynamoDB::Table',
        },
        // constructedgeToOriginedgetoapigwyfuncFn10C0FCC9: {
        //   Type: 'AWS::Lambda::Function',
        // },
        constructsvcsrouterfunc73102284: {
          Type: 'AWS::Lambda::Function',
        },
        constructs3apps91016270: {
          Type: 'AWS::S3::Bucket',
        },
        constructs3logs6D37B88F: {
          Type: 'AWS::S3::Bucket',
        },
        constructs3staging7AA4BA4F: {
          Type: 'AWS::S3::Bucket',
        },
      },
    });
  });

  it('works with asset names', () => {
    const app = new App({});
    const stack = new Stack(app, 'stack', {
      env: {
        region: 'us-east-2',
      },
    });
    const certEdge = new acm.Certificate(stack, 'cert', {
      domainName: '*.test.pwrdrvr.com',
    });
    const r53Zone = new r53.HostedZone(stack, 'zone', {
      zoneName: 'test.pwrdrvr.com',
    });
    const construct = new MicroApps(stack, 'construct', {
      appEnv: 'dev',
      domainNameEdge: 'mydeploy.test.pwrdrvr.com',
      certEdge,
      certOrigin: certEdge,
      r53Zone,
      assetNameRoot: 'my-asset-root-name',
      assetNameSuffix: '-some-suffix',
    });

    expect(construct).toBeDefined();
    expect(construct.apigwy).toBeDefined();
    expect(construct.edgeToOrigin).toBeDefined();
    expect(construct.cf).toBeDefined();
    expect(construct.s3).toBeDefined();
    expect(construct.svcs).toBeDefined();

    expect(construct.node).toBeDefined();
    Template.fromStack(stack).resourceCountIs('AWS::DynamoDB::Table', 1);
    Template.fromStack(stack).resourceCountIs('AWS::CloudFront::Distribution', 1);
    Template.fromStack(stack).resourceCountIs('AWS::Lambda::Function', 4);
    Template.fromStack(stack).hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'my-asset-root-name-router-some-suffix',
    });
    Template.fromStack(stack).hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'my-asset-root-name-deployer-some-suffix',
    });

    // Confirm that logical IDs have not changed accidentally (causes delete/create)
    Template.fromStack(stack).templateMatches({
      Resources: {
        constructapigwy894904EC: {
          Type: 'AWS::ApiGatewayV2::Api',
        },
        constructcft0A8410EA: {
          Type: 'AWS::CloudFront::Distribution',
        },
        constructsvcstable0311CF05: {
          Type: 'AWS::DynamoDB::Table',
        },
        // constructedgeToOriginedgetoapigwyfuncFn10C0FCC9: {
        //   Type: 'AWS::Lambda::Function',
        // },
        constructsvcsrouterfunc73102284: {
          Type: 'AWS::Lambda::Function',
        },
        constructs3apps91016270: {
          Type: 'AWS::S3::Bucket',
        },
        constructs3logs6D37B88F: {
          Type: 'AWS::S3::Bucket',
        },
        constructs3staging7AA4BA4F: {
          Type: 'AWS::S3::Bucket',
        },
      },
    });
  });

  it('works with asset names and edge to origin functions', () => {
    const app = new App({});
    const stack = new Stack(app, 'stack', {
      env: {
        region: 'us-east-1',
      },
    });
    const certEdge = new acm.Certificate(stack, 'cert', {
      domainName: '*.test.pwrdrvr.com',
    });
    const r53Zone = new r53.HostedZone(stack, 'zone', {
      zoneName: 'test.pwrdrvr.com',
    });
    const construct = new MicroApps(stack, 'construct', {
      appEnv: 'dev',
      domainNameEdge: 'mydeploy.test.pwrdrvr.com',
      certEdge,
      certOrigin: certEdge,
      r53Zone,
      assetNameRoot: 'my-asset-root-name',
      assetNameSuffix: '-some-suffix',
      signingMode: 'sign',
    });

    expect(construct).toBeDefined();
    expect(construct.apigwy).toBeDefined();
    expect(construct.edgeToOrigin).toBeDefined();
    expect(construct.cf).toBeDefined();
    expect(construct.s3).toBeDefined();
    expect(construct.svcs).toBeDefined();

    expect(construct.node).toBeDefined();
    Template.fromStack(stack).resourceCountIs('AWS::DynamoDB::Table', 1);
    Template.fromStack(stack).resourceCountIs('AWS::CloudFront::Distribution', 1);
    Template.fromStack(stack).resourceCountIs('AWS::Lambda::Function', 4);
    Template.fromStack(stack).hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'my-asset-root-name-router-some-suffix',
    });
    Template.fromStack(stack).hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'my-asset-root-name-deployer-some-suffix',
    });

    //
    // Capture logical IDs by uncommenting this, running under a debugger,
    // then dumping the IDs in the DebugConsole (VS Code does not allow copy-paste of the IDs
    // in the tooltip object explorer).
    // const functions = Template.fromStack(stack).findResources('AWS::Lambda::Function', {});
    // const tables = Template.fromStack(stack).findResources('AWS::DynamoDB::Table', {});
    // const distros = Template.fromStack(stack).findResources('AWS::CloudFront::Distribution', {});
    // const apis = Template.fromStack(stack).findResources('AWS::ApiGatewayV2::Api', {});
    // const s3Buckets = Template.fromStack(stack).findResources('AWS::S3::Bucket', {});
    //

    // Confirm that logical IDs have not changed accidentally (causes delete/create)
    Template.fromStack(stack).templateMatches({
      Resources: {
        constructapigwy894904EC: {
          Type: 'AWS::ApiGatewayV2::Api',
        },
        constructcft0A8410EA: {
          Type: 'AWS::CloudFront::Distribution',
        },
        constructsvcstable0311CF05: {
          Type: 'AWS::DynamoDB::Table',
        },
        constructedgeToOriginedgetoapigwyfuncFn10C0FCC9: {
          Type: 'AWS::Lambda::Function',
        },
        constructsvcsdeployerfunc88CC1526: {
          Type: 'AWS::Lambda::Function',
        },
        constructsvcsrouterfunc73102284: {
          Type: 'AWS::Lambda::Function',
        },
        constructs3apps91016270: {
          Type: 'AWS::S3::Bucket',
        },
        constructs3logs6D37B88F: {
          Type: 'AWS::S3::Bucket',
        },
        constructs3staging7AA4BA4F: {
          Type: 'AWS::S3::Bucket',
        },
      },
    });

    // This has to be built in us-east-1 or the asset is in a different child stack
    Template.fromStack(stack).hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'my-asset-root-name-edge-to-origin-some-suffix',
    });
  });

  it('allows skipping edge to origin functions', () => {
    const app = new App({});
    const stack = new Stack(app, 'stack', {
      env: {
        region: 'us-east-2',
      },
    });
    const certEdge = new acm.Certificate(stack, 'cert', {
      domainName: '*.test.pwrdrvr.com',
    });
    const r53Zone = new r53.HostedZone(stack, 'zone', {
      zoneName: 'test.pwrdrvr.com',
    });
    const construct = new MicroApps(stack, 'construct', {
      appEnv: 'dev',
      domainNameEdge: 'mydeploy.test.pwrdrvr.com',
      certEdge,
      certOrigin: certEdge,
      r53Zone,
      addXForwardedHostHeader: false,
      replaceHostHeader: false,
      signingMode: 'none',
    });

    expect(construct).toBeDefined();
    expect(construct.apigwy).toBeDefined();
    expect(construct.cf).toBeDefined();
    expect(construct.s3).toBeDefined();
    expect(construct.svcs).toBeDefined();

    expect(construct.node).toBeDefined();
    Template.fromStack(stack).resourceCountIs('AWS::DynamoDB::Table', 1);
    Template.fromStack(stack).resourceCountIs('AWS::CloudFront::Distribution', 1);
    Template.fromStack(stack).resourceCountIs('AWS::Lambda::Function', 3);

    // Confirm that logical IDs have not changed accidentally (causes delete/create)
    Template.fromStack(stack).templateMatches({
      Resources: {
        constructapigwy894904EC: {
          Type: 'AWS::ApiGatewayV2::Api',
        },
        constructcft0A8410EA: {
          Type: 'AWS::CloudFront::Distribution',
        },
        constructsvcstable0311CF05: {
          Type: 'AWS::DynamoDB::Table',
        },
        constructsvcsrouterfunc73102284: {
          Type: 'AWS::Lambda::Function',
        },
        constructs3apps91016270: {
          Type: 'AWS::S3::Bucket',
        },
        constructs3logs6D37B88F: {
          Type: 'AWS::S3::Bucket',
        },
        constructs3staging7AA4BA4F: {
          Type: 'AWS::S3::Bucket',
        },
      },
    });
  });
});
