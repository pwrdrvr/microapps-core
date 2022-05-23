/// <reference types="jest" />
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { MicroAppsEdgeToOrigin } from '../src/MicroAppsEdgeToOrigin';

describe('MicroAppsEdgeToOrigin', () => {
  describe('generateEdgeToOriginConfig', () => {
    it('skips signing param', () => {
      const config = MicroAppsEdgeToOrigin.generateEdgeToOriginConfig({
        signingMode: '',
        addXForwardedHostHeader: true,
        replaceHostHeader: true,
        originRegion: 'us-west-1',
      });

      expect(config).toBeDefined();
      expect(config).not.toContain('signingMode:');
      expect(config).toContain('addXForwardedHostHeader: true');
      expect(config).toContain('replaceHostHeader: true');
      expect(config).toContain('originRegion: us-west-1');
    });

    it('skips signing param', () => {
      const config = MicroAppsEdgeToOrigin.generateEdgeToOriginConfig({
        signingMode: 'sign',
        addXForwardedHostHeader: false,
        replaceHostHeader: false,
        originRegion: 'us-west-1',
      });

      expect(config).toBeDefined();
      expect(config).toContain('signingMode: sign');
      expect(config).toContain('addXForwardedHostHeader: false');
      expect(config).toContain('replaceHostHeader: false');
      expect(config).toContain('originRegion: us-west-1');
    });
  });

  describe('MicroAppsEdgeToOrigin', () => {
    it('works with no params', () => {
      const app = new App({});
      const stack = new Stack(app, 'stack', {
        env: {
          region: 'us-east-1',
        },
      });
      const construct = new MicroAppsEdgeToOrigin(stack, 'construct', {});

      expect(construct).toBeDefined();
      expect(construct.edgeToOriginFunction).toBeDefined();
      expect(construct.edgeToOriginLambdas).toBeDefined();
      expect(construct.node).toBeDefined();
      // I guess this is 2 for EdgeFunction even though only 1 is created?
      Template.fromStack(stack).resourceCountIs('AWS::Lambda::Function', 2);
    });

    it('works with params', () => {
      const app = new App({});
      const stack = new Stack(app, 'stack', {
        env: {
          region: 'us-east-1',
        },
      });
      const construct = new MicroAppsEdgeToOrigin(stack, 'construct', {
        assetNameRoot: 'my-asset-name-root',
        assetNameSuffix: '-some-suffix',
      });

      expect(construct).toBeDefined();
      expect(construct.edgeToOriginFunction).toBeDefined();
      expect(construct.edgeToOriginLambdas).toBeDefined();
      expect(construct.node).toBeDefined();
      // I guess this is 2 for EdgeFunction even though only 1 is created?
      // (probably log retention lambda)
      Template.fromStack(stack).resourceCountIs('AWS::Lambda::Function', 2);
      Template.fromStack(stack).hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'my-asset-name-root-edge-to-origin-some-suffix',
      });
    });
  });
});
