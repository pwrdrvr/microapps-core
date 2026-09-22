import { createHash } from 'crypto';
import { basename } from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { stat, unlink } from 'fs/promises';
import { pipeline } from 'stream/promises';
import { constants, createBrotliCompress, createGzip } from 'zlib';
import { contentType } from 'mime-types';

export interface AssetMetadata {
  ContentType: string;
  ContentEncoding?: 'br' | 'gzip';
  Metadata?: Record<string, string>;
}

export interface CompressionOptions {
  brotli: boolean;
  gzip: boolean;
}

// Reserved sidecar suffixes shared with the edge router. Original URLs stay unchanged.
const suffixes = { br: '.microapps.br', gzip: '.microapps.gz' };
const compressible =
  /^(text\/|application\/(javascript|json|xml|wasm|manifest\+json|.*\+xml|.*\+json)(;|$)|image\/svg\+xml(;|$))/;

/** Prepare bounded, streamed compression in the disposable upload directory. */
export async function prepareAssets(
  files: string[],
  options: CompressionOptions,
): Promise<Map<string, AssetMetadata>> {
  const metadata = new Map<string, AssetMetadata>();
  const encodings: Array<'br' | 'gzip'> = [];
  if (options.brotli) encodings.push('br');
  if (options.gzip) encodings.push('gzip');
  if (encodings.length && files.some((file) => /\.microapps\.(br|gz)$/.test(file))) {
    throw new Error('Static assets use reserved .microapps.br or .microapps.gz suffixes');
  }

  const prepare = async (file: string) => {
    const ContentType = contentType(basename(file)) || 'application/octet-stream';
    metadata.set(file, { ContentType });
    if (!encodings.length || !compressible.test(ContentType)) return;
    const originalSize = (await stat(file)).size;
    if (!originalSize) return;
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(file)) hash.update(chunk);
    const digest = hash.digest('hex');
    const generated: string[] = [];
    for (const encoding of encodings) {
      const target = file + suffixes[encoding];
      await pipeline(
        createReadStream(file),
        encoding === 'br'
          ? createBrotliCompress({ params: { [constants.BROTLI_PARAM_QUALITY]: 9 } })
          : createGzip({ level: 9 }),
        createWriteStream(target, { flags: 'wx' }),
      );
      if ((await stat(target)).size < originalSize) {
        metadata.set(target, {
          ContentType,
          ContentEncoding: encoding,
          Metadata: { 'microapps-sha256': digest },
        });
        generated.push(encoding);
      } else {
        await unlink(target);
      }
    }
    if (generated.length) {
      metadata.set(file, {
        ContentType,
        Metadata: {
          'microapps-encodings': generated.join(','),
          'microapps-sha256': digest,
        },
      });
    }
  };

  // Wait for every active compressor before surfacing an error and cleaning the temp directory.
  for (let offset = 0; offset < files.length; offset += 4) {
    const results = await Promise.allSettled(files.slice(offset, offset + 4).map(prepare));
    for (const result of results) {
      if (result.status === 'rejected') throw result.reason;
    }
  }
  return metadata;
}
