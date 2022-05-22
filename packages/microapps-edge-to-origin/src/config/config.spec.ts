/* eslint-disable @typescript-eslint/no-non-null-assertion */
// Used by ts-convict
import 'reflect-metadata';
import * as path from 'path';
import { TSConvict } from 'ts-convict';
import { Config, IConfig } from './config';

type IPartialConfig = Partial<Config>;

describe('config', () => {
  it('handles funky string enum', () => {
    const rawConfig: IConfig = {
      awsAccountID: 123,
      awsRegion: 'us-east-1',
      originRegion: 'us-east-2',
      addXForwardedHostHeader: true,
      replaceHostHeader: true,
      signingMode: 'sign',
    };
    const loader = new TSConvict<Config>(Config);
    const config = loader.load(rawConfig);

    expect(config).toBeDefined();
    expect(config.awsAccountID).toBe(123);
    expect(config.awsRegion).toBe(process.env.AWS_REGION || 'us-east-1');
    expect(config.originRegion).toBe('us-east-2');
    expect(config.addXForwardedHostHeader).toBe(true);
    expect(config.replaceHostHeader).toBe(true);
    expect(config.signingMode).toBe('sign');
  });

  it('defaults', () => {
    const rawConfig: IPartialConfig = {};
    const loader = new TSConvict<Config>(Config);
    const config = loader.load(rawConfig);

    expect(config).toBeDefined();
    expect(config.awsAccountID).toBe(0);
    expect(config.awsRegion).toBe(process.env.AWS_REGION || 'us-east-1');
    expect(config.originRegion).toBe('us-east-2');
    expect(config.addXForwardedHostHeader).toBe(true);
    expect(config.replaceHostHeader).toBe(true);
    expect(config.signingMode).toBe('');
  });

  it('file load', () => {
    const loader = new TSConvict<Config>(Config);
    const config = loader.load(path.join(__dirname, './config.test.yml'));

    expect(config).toBeDefined();
    expect(config.awsAccountID).toBe(0);
    expect(config.awsRegion).toBe(process.env.AWS_REGION || 'us-east-2');
    expect(config.originRegion).toBe('us-east-2');
    expect(config.addXForwardedHostHeader).toBe(true);
    expect(config.replaceHostHeader).toBe(true);
    expect(config.signingMode).toBe('sign');
  });
});
