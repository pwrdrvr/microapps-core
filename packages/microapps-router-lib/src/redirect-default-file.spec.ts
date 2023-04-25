import { DBManager, Version } from '@pwrdrvr/microapps-datalib';
import { AppVersionCache } from './app-cache';
import { RedirectToDefaultFile } from './redirect-default-file';

jest.mock('./app-cache');

describe('RedirectToDefaultFile', () => {
  const mockDbManager = {} as DBManager;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return undefined if GetVersionInfo throws an error', async () => {
    (AppVersionCache.GetInstance as jest.Mock).mockImplementation(() => {
      return {
        GetVersionInfo: () => {
          throw new Error('GetVersionInfo error');
        },
      };
    });

    const result = await RedirectToDefaultFile({
      dbManager: mockDbManager,
      appName: 'testApp',
      semVer: '1.0.0',
      appNameOrRootTrailingSlash: '',
    });

    expect(result).toBeUndefined();
  });

  it('should return undefined if versionInfo is undefined', async () => {
    (AppVersionCache.GetInstance as jest.Mock).mockImplementation(() => {
      return {
        GetVersionInfo: () => undefined,
      };
    });

    const result = await RedirectToDefaultFile({
      dbManager: mockDbManager,
      appName: 'testApp',
      semVer: '1.0.0',
      appNameOrRootTrailingSlash: '',
    });

    expect(result).toBeUndefined();
  });

  it('should return undefined if versionInfo.DefaultFile is not set', async () => {
    const versionInfo: Version = {
      AppName: 'testApp',
      SemVer: '1.0.0',
      // @ts-expect-error this is a test after-all
      DefaultFile: undefined,
    };
    (AppVersionCache.GetInstance as jest.Mock).mockImplementation(() => {
      return {
        GetVersionInfo: () => versionInfo,
      };
    });

    const result = await RedirectToDefaultFile({
      dbManager: mockDbManager,
      appName: 'testApp',
      semVer: '1.0.0',
      appNameOrRootTrailingSlash: '',
    });

    expect(result).toBeUndefined();
  });

  it('should return a redirect with status code 302 when versionInfo.DefaultFile is set', async () => {
    // @ts-expect-error This is ok to be incomplete for the test
    const versionInfo: Version = {
      AppName: 'testApp',
      SemVer: '1.0.0',
      DefaultFile: 'index.html',
    };
    (AppVersionCache.GetInstance as jest.Mock).mockImplementation(() => {
      return {
        GetVersionInfo: () => versionInfo,
      };
    });

    const result = await RedirectToDefaultFile({
      dbManager: mockDbManager,
      appName: 'testApp',
      semVer: '1.0.0',
      appNameOrRootTrailingSlash: 'testapp/',
    });

    expect(result).toEqual({
      statusCode: 302,
      redirectLocation: '/testapp/1.0.0/index.html',
    });
  });
});
