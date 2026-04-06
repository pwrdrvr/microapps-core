import 'reflect-metadata';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Config } from '../config/Config';
import { NextJSVersionCommand } from './nextjs-version';
import { NextJSVersionRestoreCommand } from './nextjs-version-restore';

function resetConfigSingleton(): void {
  (Config as unknown as { _instance?: unknown })._instance = undefined;
}

describe('NextJSVersionCommand', () => {
  const originalCwd = process.cwd();
  let tempDir: string;
  let logSpy: jest.SpyInstance;
  let infoSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pwrdrvr-nextjs-version-'));
    process.chdir(tempDir);
    resetConfigSingleton();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    fs.writeFileSync(
      'next.config.js',
      [
        'module.exports = {',
        '  version: "0.0.0",',
        '  alias: "v0_0_0",',
        '};',
        '',
      ].join('\n'),
    );
  });

  afterEach(() => {
    process.chdir(originalCwd);
    resetConfigSingleton();
    logSpy.mockRestore();
    infoSpy.mockRestore();
    errorSpy.mockRestore();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('applies the requested version and leaves backup files when asked', async () => {
    await NextJSVersionCommand.run(['--new-version', '1.2.3', '--leave-copy']);

    expect(fs.readFileSync('next.config.js', 'utf8')).toContain('version: "1.2.3"');
    expect(fs.readFileSync('next.config.js', 'utf8')).toContain('alias: "v0_0_0"');
    expect(fs.readFileSync('next.config.js.original', 'utf8')).toContain('version: "0.0.0"');
    expect(fs.readFileSync('next.config.js.modified', 'utf8')).toContain('version: "1.2.3"');
  });

  it('restores the original config file', async () => {
    await NextJSVersionCommand.run(['-n', '2.3.4']);
    await NextJSVersionRestoreCommand.run([]);

    expect(fs.readFileSync('next.config.js', 'utf8')).toContain('version: "0.0.0"');
    expect(fs.readFileSync('next.config.js', 'utf8')).toContain('alias: "v0_0_0"');
    expect(fs.existsSync('next.config.js.original')).toBe(false);
  });
});
