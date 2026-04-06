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
    LambdaAlias: jest.fn(),
    CreateApp: jest.fn(),
    DeployVersionLite: jest.fn(),
    DeployVersion: jest.fn(),
  },
}));

jest.mock('../lib/S3Uploader', () => ({
  S3Uploader: {
    TempDir: './deploytool-temp',
    CopyToUploadDir: jest.fn(),
    ParseUploadPath: jest.fn().mockReturnValue({
      bucketName: 'example-bucket',
      destinationPrefix: 'release/1.2.3',
    }),
    removeTempDirIfExists: jest.fn(),
  },
}));

jest.mock('../lib/S3TransferUtility', () => ({
  S3TransferUtility: {
    GetFiles: jest.fn().mockReturnValue([]),
  },
}));

import * as sts from '@aws-sdk/client-sts';
import DeployClient from '../lib/DeployClient';
import { S3Uploader } from '../lib/S3Uploader';
import { PublishCommand as PublishStaticCommand } from './publish-static';
import { PublishCommand } from './publish';

function resetConfigSingleton(): void {
  (Config as unknown as { _instance?: unknown })._instance = undefined;
}

function makePreflightResult(createAlias = true) {
  return {
    exists: false,
    response: {
      statusCode: 404,
      s3UploadUrl: 's3://example-bucket/release/1.2.3',
      awsCredentials: {
        accessKeyId: 'test-access-key',
        secretAccessKey: 'test-secret-key',
        sessionToken: 'test-session-token',
      },
      capabilities: {
        createAlias: createAlias ? 'true' : 'false',
      },
    },
  };
}

describe('Publish commands', () => {
  const originalCwd = process.cwd();
  const mockStsSend = (sts as typeof sts & { __mockSend: jest.Mock }).__mockSend;
  const mockDeployVersionPreflight = DeployClient.DeployVersionPreflight as jest.Mock;
  const mockCreateApp = DeployClient.CreateApp as jest.Mock;
  const mockDeployVersionLite = DeployClient.DeployVersionLite as jest.Mock;
  const mockRemoveTempDirIfExists = S3Uploader.removeTempDirIfExists as jest.Mock;
  let tempDir: string;
  let logSpy: jest.SpyInstance;
  let infoSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    process.exitCode = undefined;
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pwrdrvr-publish-'));
    process.chdir(tempDir);
    resetConfigSingleton();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockStsSend.mockResolvedValue({ Account: '123456789012' });
    mockDeployVersionPreflight.mockResolvedValue(makePreflightResult(true));
    mockCreateApp.mockResolvedValue(undefined);
    mockDeployVersionLite.mockResolvedValue(undefined);
    mockRemoveTempDirIfExists.mockResolvedValue(undefined);
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

  it('publishes url apps with direct startup type', async () => {
    await PublishCommand.run([
      '--app-name',
      'release',
      '--new-version',
      '1.2.3',
      '--deployer-lambda-name',
      'microapps-deployer-dev',
      '--type',
      'url',
      '--url',
      'https://example.com/app',
    ]);

    expect(mockDeployVersionPreflight).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          app: expect.objectContaining({
            name: 'release',
            semVer: '1.2.3',
          }),
        }),
      }),
    );

    expect(mockDeployVersionLite).toHaveBeenCalledWith(
      expect.objectContaining({
        appName: 'release',
        semVer: '1.2.3',
        appType: 'url',
        startupType: 'direct',
        url: 'https://example.com/app',
        deployerLambdaName: 'microapps-deployer-dev',
      }),
    );
    expect(mockRemoveTempDirIfExists).toHaveBeenCalled();
  });

  it('publishes static apps through the lite deploy path when alias creation is supported', async () => {
    const staticDir = path.join(tempDir, 'static');
    fs.mkdirSync(staticDir);
    fs.writeFileSync(path.join(staticDir, 'index.html'), '<html></html>');

    await PublishStaticCommand.run([
      '--app-name',
      'release',
      '--new-version',
      '1.2.3',
      '--deployer-lambda-name',
      'microapps-deployer-dev',
      '--static-assets-path',
      staticDir,
      '--default-file',
      'index.html',
    ]);

    expect(mockDeployVersionLite).toHaveBeenCalledWith(
      expect.objectContaining({
        appName: 'release',
        semVer: '1.2.3',
        appType: 'static',
        defaultFile: 'index.html',
        deployerLambdaName: 'microapps-deployer-dev',
      }),
    );
    expect(mockCreateApp).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          app: expect.objectContaining({
            staticAssetsPath: staticDir,
            defaultFile: 'index.html',
          }),
        }),
      }),
    );
    expect(mockRemoveTempDirIfExists).toHaveBeenCalled();
  });
});
