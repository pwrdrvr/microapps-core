import { pathExistsSync, readFileSync } from 'fs-extra';
import { loadAppFrame } from './load-app-frame';
import Log from './lib/log';

jest.mock('fs-extra');

describe('loadAppFrame', () => {
  const mockPathExistsSync = pathExistsSync as jest.MockedFunction<typeof pathExistsSync>;
  const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should load appFrame.html from the default basePath', () => {
    const mockHtmlContent = '<html><body>App Frame</body></html>';

    // Mock pathExistsSync to return true for the first path checked (basePath)
    mockPathExistsSync.mockImplementation((filePath: string) => {
      return (
        filePath.endsWith('appFrame.html') &&
        !filePath.includes('..') &&
        !filePath.includes('templates') &&
        !filePath.startsWith('/opt')
      );
    });
    mockReadFileSync.mockReturnValue(mockHtmlContent);

    expect(loadAppFrame({})).toBe(mockHtmlContent);
  });

  it('should load appFrame.html from a custom basePath', () => {
    const mockHtmlContent = '<html><body>App Frame</body></html>';
    const customBasePath = './custom';

    // Mock pathExistsSync to return true for the custom path
    mockPathExistsSync.mockImplementation((filePath: string) => {
      return filePath.includes('custom') && filePath.endsWith('appFrame.html');
    });
    mockReadFileSync.mockReturnValue(mockHtmlContent);

    expect(loadAppFrame({ basePath: customBasePath })).toBe(mockHtmlContent);
  });

  it('should throw an error if appFrame.html is not found', () => {
    mockPathExistsSync.mockReturnValue(false);

    expect(() => {
      loadAppFrame({});
    }).toThrowError('appFrame.html not found');
  });

  it('should log the error if appFrame.html is not found', () => {
    mockPathExistsSync.mockReturnValue(false);
    const logSpy = jest.spyOn(Log.Instance, 'error');

    try {
      loadAppFrame({});
    } catch {
      // Catch the error to allow the test to continue
    }

    expect(logSpy).toHaveBeenCalledWith('appFrame.html not found');
  });
});
