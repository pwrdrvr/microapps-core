import mockFs from 'mock-fs';
import { loadAppFrame } from './load-app-frame';
import Log from './lib/log';

describe('loadAppFrame', () => {
  afterEach(() => {
    mockFs.restore();
  });

  it('should load appFrame.html from the default basePath', () => {
    const mockHtmlContent = '<html><body>App Frame</body></html>';
    mockFs({
      'appFrame.html': mockHtmlContent,
    });

    expect(loadAppFrame({})).toBe(mockHtmlContent);
  });

  it('should load appFrame.html from a custom basePath', () => {
    const mockHtmlContent = '<html><body>App Frame</body></html>';
    const customBasePath = './custom';
    mockFs({
      [customBasePath]: {
        'appFrame.html': mockHtmlContent,
      },
    });

    expect(loadAppFrame({ basePath: customBasePath })).toBe(mockHtmlContent);
  });

  it('should throw an error if appFrame.html is not found', () => {
    mockFs({});

    expect(() => {
      loadAppFrame({});
    }).toThrowError('appFrame.html not found');
  });

  it('should log the error if appFrame.html is not found', () => {
    mockFs({});
    const logSpy = jest.spyOn(Log.Instance, 'error');

    try {
      loadAppFrame({});
    } catch {
      // Catch the error to allow the test to continue
    }

    expect(logSpy).toHaveBeenCalledWith('appFrame.html not found');
  });
});
