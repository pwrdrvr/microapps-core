import path from 'path';
import { pathExistsSync, readFileSync } from 'fs-extra';
import Log from './lib/log';

const log = Log.Instance;

/**
 * Find and load the appFrame file
 * @returns
 */

export function loadAppFrame({ basePath = '.' }: { basePath?: string }): string {
  const paths = [
    basePath,
    path.join(basePath, '..'),
    path.join(basePath, 'templates'),
    basePath,
    '/opt',
    '/opt/templates',
  ];

  for (const pathRoot of paths) {
    const fullPath = path.join(pathRoot, 'appFrame.html');
    try {
      if (pathExistsSync(fullPath)) {
        log.info('found html file', { fullPath });
        return readFileSync(fullPath, 'utf-8');
      }
    } catch {
      // Don't care - we get here if stat throws because the file does not exist
    }
  }

  log.error('appFrame.html not found');
  throw new Error('appFrame.html not found');
}
