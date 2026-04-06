import 'reflect-metadata';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Config } from '../config/Config';

jest.mock('@aws-sdk/client-sts', () => {
  const send = jest.fn();

  return {
    STSClient: jest.fn().mockImplementation(() => ({
      config: { region: 'us-east-1' },
      send,
    })),
    GetCallerIdentityCommand: jest.fn().mockImplementation((input) => ({ input })),
    __mockSend: send,
  };
});

jest.mock('../lib/DeployClient', () => ({
  __esModule: true,
  default: {
    DeployVersionPreflight: jest.fn(),
  },
}));

import * as sts from '@aws-sdk/client-sts';
import DeployClient from '../lib/DeployClient';
import { PreflightCommand } from './preflight';

function resetConfigSingleton(): void {
  (Config as unknown as { _instance?: unknown })._instance = undefined;
}

describe('PreflightCommand', () => {
  const originalCwd = process.cwd();
  const mockStsSend = (sts as typeof sts & { __mockSend: jest.Mock }).__mockSend;
  const mockDeployVersionPreflight = DeployClient.DeployVersionPreflight as jest.Mock;
  let tempDir: string;
  let logSpy: jest.SpyInstance;
  let infoSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    process.exitCode = undefined;
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pwrdrvr-preflight-'));
    process.chdir(tempDir);
    resetConfigSingleton();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockStsSend.mockResolvedValue({ Account: '123456789012' });
    mockDeployVersionPreflight.mockResolvedValue({ exists: false });
  });

  afterEach(() => {
    process.exitCode = undefined;
    process.chdir(originalCwd);
    resetConfigSingleton();
    logSpy.mockRestore();
    infoSpy.mockRestore();
    errorSpy.mockRestore();
    jest.clearAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('maps parsed flags into the deploy preflight request', async () => {
    await PreflightCommand.run([
      '--app-name',
      'Release-App',
      '--new-version',
      '1.2.3',
      '--deployer-lambda-name',
      'microapps-deployer-dev',
    ]);

    expect(mockDeployVersionPreflight).toHaveBeenCalledWith(
      expect.objectContaining({
        needS3Creds: false,
        overwrite: false,
        config: expect.objectContaining({
          deployer: expect.objectContaining({
            lambdaName: 'microapps-deployer-dev',
          }),
          app: expect.objectContaining({
            name: 'release-app',
            semVer: '1.2.3',
            awsAccountID: '123456789012',
            awsRegion: expect.any(String),
          }),
        }),
      }),
    );
    expect(mockStsSend).toHaveBeenCalledTimes(1);
  });

  it('allows overwrite when the version already exists', async () => {
    mockDeployVersionPreflight.mockResolvedValue({ exists: true });

    await expect(
      PreflightCommand.run([
        '--app-name',
        'release',
        '--new-version',
        '1.2.3',
        '--deployer-lambda-name',
        'microapps-deployer-dev',
        '--overwrite',
      ]),
    ).resolves.toBeUndefined();
  });

  it('fails when the version already exists and overwrite is not set', async () => {
    mockDeployVersionPreflight.mockResolvedValue({ exists: true });

    await expect(
      PreflightCommand.run([
        '--app-name',
        'release',
        '--new-version',
        '1.2.3',
        '--deployer-lambda-name',
        'microapps-deployer-dev',
      ]),
    ).rejects.toThrow('App/Version already exists: release/1.2.3');
  });
});
