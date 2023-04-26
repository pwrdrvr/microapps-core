import { DBManager } from '@pwrdrvr/microapps-datalib';
import { AppVersionCache } from './app-cache';
import { RouteApp } from './route-app';

jest.mock('./app-cache');

describe('RouteApp', () => {
  const mockDbManager = {} as DBManager;

  afterEach(() => {
    jest.clearAllMocks();
  });

  const testCases = [
    {
      caseName: 'should route simple app with iframe startup and no versions specified',
      possibleSemVerPathAfterAppVersionInfo: undefined,
      possibleSemVerPathNextDataVersionInfo: undefined,
      possibleSemVerQueryVersionInfo: undefined,
      possibleSemVerQuery: undefined,
      defaultVersion: '1.0.0',
      expectedStatusCode: 200,
      expectedAppName: 'testApp',
      expectedSemVer: '1.0.0',
      expectedStartupType: 'iframe',
    },
    {
      caseName: 'uses the path specified version instead of the default version',
      possibleSemVerPathAfterAppVersionInfo: {
        SemVer: '1.0.1',
        DefaultFile: 'index.html',
        StartupType: 'iframe',
      },
      possibleSemVerPathNextDataVersionInfo: undefined,
      possibleSemVerQueryVersionInfo: undefined,
      possibleSemVerQuery: undefined,
      defaultVersion: '1.0.0',
      expectedStatusCode: 200,
      expectedAppName: 'testApp',
      expectedSemVer: '1.0.1',
      expectedStartupType: undefined,
    },
    {
      caseName: 'uses the query string specified version instead of the default version',
      possibleSemVerPathAfterAppVersionInfo: undefined,
      possibleSemVerPathNextDataVersionInfo: undefined,
      possibleSemVerQueryVersionInfo: {
        SemVer: '1.0.3',
        DefaultFile: 'index.html',
        StartupType: 'iframe',
      },
      possibleSemVerQuery: '1.0.3',
      defaultVersion: '1.0.0',
      expectedStatusCode: 200,
      expectedAppName: 'testApp',
      expectedSemVer: '1.0.3',
      expectedStartupType: 'iframe',
    },
    {
      caseName: 'gives a 404 when the query string version does not exist',
      possibleSemVerPathAfterAppVersionInfo: undefined,
      possibleSemVerPathNextDataVersionInfo: undefined,
      possibleSemVerQueryVersionInfo: undefined,
      possibleSemVerQuery: '1.0.4',
      defaultVersion: '1.0.0',
      expectedStatusCode: 404,
      expectedAppName: undefined,
      expectedSemVer: undefined,
      expectedStartupType: undefined,
    },
  ];

  it.each(testCases)(
    '$caseName',
    async ({
      possibleSemVerPathAfterAppVersionInfo,
      possibleSemVerPathNextDataVersionInfo,
      possibleSemVerQueryVersionInfo,
      possibleSemVerQuery,
      defaultVersion,
      expectedStatusCode,
      expectedAppName,
      expectedSemVer,
      expectedStartupType,
    }) => {
      (AppVersionCache.GetInstance as jest.Mock).mockImplementation(() => {
        return {
          GetVersionInfo: (options: { key: { AppName: string; SemVer: string } }) => {
            if (options.key.SemVer === 'pathAfterApp') {
              return possibleSemVerPathAfterAppVersionInfo;
            }
            if (options.key.SemVer === 'pathNextData') {
              return possibleSemVerPathNextDataVersionInfo;
            }
            if (options.key.SemVer === 'query') {
              return possibleSemVerQueryVersionInfo;
            }
            if (options.key.SemVer === defaultVersion) {
              return { ...options.key, DefaultFile: 'index.html', StartupType: 'iframe' };
            }
            return undefined;
          },
          GetRules: () => ({ RuleSet: { default: { SemVer: defaultVersion } } }),
        };
      });

      const result = await RouteApp({
        dbManager: mockDbManager,
        event: { dbManager: mockDbManager, locales: [], rawPath: '/testApp' },
        appName: 'testApp',
        possibleSemVerPathNextData: possibleSemVerPathNextDataVersionInfo
          ? 'pathNextData'
          : undefined,
        possibleSemVerPathAfterApp: possibleSemVerPathAfterAppVersionInfo
          ? 'pathAfterApp'
          : undefined,
        possibleSemVerQuery: possibleSemVerQueryVersionInfo ? 'query' : possibleSemVerQuery,
        additionalParts: '',
        appNameOrRootTrailingSlash: '',
      });

      expect(result.statusCode).toBe(expectedStatusCode);
      expect(result.appName).toBe(expectedAppName);
      expect(result.semVer).toBe(expectedSemVer);
      expect(result.startupType).toBe(expectedStartupType);
    },
  );
});
