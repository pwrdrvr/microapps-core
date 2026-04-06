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
    DeleteVersion: jest.fn(),
  },
}));

import * as sts from '@aws-sdk/client-sts';
import DeployClient from '../lib/DeployClient';
import { DeleteCommand } from './delete';

function resetConfigSingleton(): void {
  (Config as unknown as { _instance?: unknown })._instance = undefined;
}

describe('DeleteCommand', () => {
  const originalCwd = process.cwd();
  const mockStsSend = (sts as typeof sts & { __mockSend: jest.Mock }).__mockSend;
  const mockDeleteVersion = DeployClient.DeleteVersion as jest.Mock;
  let tempDir: string;
  let logSpy: jest.SpyInstance;
  let infoSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    process.exitCode = undefined;
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pwrdrvr-delete-'));
    process.chdir(tempDir);
    resetConfigSingleton();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockStsSend.mockResolvedValue({ Account: '123456789012' });
    mockDeleteVersion.mockResolvedValue({ statusCode: 200 });
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

  it('passes parsed flags through to delete requests', async () => {
    await DeleteCommand.run([
      '--app-name',
      'Release-App',
      '--new-version',
      '1.2.3',
      '--deployer-lambda-name',
      'microapps-deployer-dev',
    ]);

    expect(mockDeleteVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          deployer: expect.objectContaining({
            lambdaName: 'microapps-deployer-dev',
          }),
          app: expect.objectContaining({
            name: 'release-app',
            semVer: '1.2.3',
            awsAccountID: '123456789012',
            awsRegion: 'us-east-1',
          }),
        }),
      }),
    );
  });

  it('does not fail when the version is already absent', async () => {
    mockDeleteVersion.mockResolvedValue({ statusCode: 404 });

    await expect(
      DeleteCommand.run([
        '--app-name',
        'release',
        '--new-version',
        '1.2.3',
        '--deployer-lambda-name',
        'microapps-deployer-dev',
      ]),
    ).resolves.toBeUndefined();
  });
});
