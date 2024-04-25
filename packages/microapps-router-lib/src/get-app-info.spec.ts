import { DBManager, Rules } from '@pwrdrvr/microapps-datalib';
import { AppVersionCache } from './app-cache';
import { GetAppInfo } from './get-app-info';

jest.mock('@pwrdrvr/microapps-datalib');

describe('GetAppInfo', () => {
  const dbManager = {} as DBManager;
  const getAppVersionCacheSpy = jest.spyOn(AppVersionCache, 'GetInstance');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    getAppVersionCacheSpy.mockReset();
  });

  const testCases = [
    {
      caseName: 'returns the correct app name when it exists',
      appName: 'testApp',
      mockRules: {
        AppName: 'testapp',
        Version: 1,
        RuleSet: {
          default: {
            AttributeName: 'default',
            AttributeValue: '',
            SemVer: '1.0.0',
          },
        },
      } as unknown as Rules,
      expected: 'testApp',
    },
    {
      caseName:
        'returns undefined when the app name does not exist and there is no [root] catch-all app',
      appName: 'nonexistent',
      mockRules: undefined,
      expected: undefined,
    },
    {
      caseName:
        'returns [root] when the app name does not exist but there is a [root] catch-all app',
      appName: 'nonexistent',
      mockRules: {
        AppName: '[root]',
        RuleSet: {
          default: {
            AttributeName: 'default',
            AttributeValue: '',
            SemVer: '9.0.0',
          },
        } as unknown as Rules,
      },
      expected: '[root]',
    },
  ];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  it.each(testCases)('$caseName', async ({ caseName, appName, mockRules, expected }) => {
    getAppVersionCacheSpy.mockImplementation(() => {
      return {
        // eslint-disable-next-line @typescript-eslint/require-await
        GetRules: async ({ key }: { key: { AppName: string } }) => {
          if (key.AppName === appName || key.AppName === '[root]') {
            return mockRules;
          }
          return undefined;
        },
      } as unknown as AppVersionCache;
    });

    const result = await GetAppInfo({ dbManager, appName });
    expect(result).toEqual(expected);
  });
});
