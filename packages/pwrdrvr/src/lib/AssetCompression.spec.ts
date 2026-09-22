import { mkdtemp, readFile, writeFile, rm, readdir } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { brotliDecompressSync, gunzipSync } from 'zlib';
import { prepareAssets } from './AssetCompression';

let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'asset-compression-'));
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

it.each([
  [true, true, ['br', 'gzip']],
  [true, false, ['br']],
  [false, true, ['gzip']],
  [false, false, []],
])(
  'round trips brotli=%s gzip=%s and preserves source and MIME type',
  async (brotli, gzip, encodings) => {
    const file = path.join(directory, 'app.js');
    const source = 'console.log("a compressible application");\n'.repeat(500);
    await writeFile(file, source);
    const assets = await prepareAssets([file], {
      brotli: brotli as boolean,
      gzip: gzip as boolean,
    });
    expect(await readFile(file, 'utf8')).toBe(source);
    expect(assets.size).toBe(1 + encodings.length);
    for (const [asset, metadata] of assets) {
      expect(metadata.ContentType).toBe('application/javascript; charset=utf-8');
      if (!metadata.ContentEncoding) continue;
      expect(encodings).toContain(metadata.ContentEncoding);
      const encoded = await readFile(asset);
      expect(encoded.length).toBeLessThan(Buffer.byteLength(source));
      const decode = metadata.ContentEncoding === 'br' ? brotliDecompressSync : gunzipSync;
      expect(decode(encoded).toString()).toBe(source);
      expect(metadata.Metadata?.['microapps-sha256']).toBe(
        assets.get(file)?.Metadata?.['microapps-sha256'],
      );
    }
  },
);

it('skips empty, tiny, already compressed, and unknown binary files', async () => {
  const files = ['empty.txt', 'tiny.txt', 'photo.jpg', 'archive.gz', 'unknown.bin'];
  for (const file of files)
    await writeFile(path.join(directory, file), file === 'empty.txt' ? '' : 'hi');
  const assets = await prepareAssets(
    files.map((file) => path.join(directory, file)),
    { brotli: true, gzip: true },
  );
  expect(assets.size).toBe(files.length);
  expect((await readdir(directory)).sort()).toEqual(files.sort());
});

it('rejects reserved sidecar names before modifying assets', async () => {
  const file = path.join(directory, 'app.js.microapps.br');
  await writeFile(file, 'original');
  await expect(prepareAssets([file], { brotli: true, gzip: false })).rejects.toThrow('reserved');
  expect(await readFile(file, 'utf8')).toBe('original');
});

it('fails on unreadable input rather than publishing partial assets', async () => {
  await expect(
    prepareAssets([path.join(directory, 'missing.txt')], { brotli: true, gzip: true }),
  ).rejects.toThrow();
});
