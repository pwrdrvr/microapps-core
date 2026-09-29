import { createHash } from 'crypto';
import { createReadStream, createWriteStream } from 'fs';
import { stat, unlink } from 'fs/promises';
import { pipeline } from 'stream/promises';
import { constants, createBrotliCompress, createGzip } from 'zlib';
import { contentType } from 'mime-types';

import * as path from 'path';
import type { IDeployVersionPreflightResponse } from './DeployClient';
import * as fs from 'fs-extra';
import { IConfig } from '../config/Config';
import { S3TransferUtility } from './S3TransferUtility';

export class S3Uploader {
  /**
   * Copy files to local upload directory
   * @param config
   * @param s3UploadPath
   * @param preflightResponse
   */
  public static async CopyToUploadDir(config: IConfig, s3UploadPath: string): Promise<void> {
    const { destinationPrefix } = S3Uploader.ParseUploadPath(s3UploadPath);

    // Make a local root dir for the upload
    const tempUploadPath = path.join(S3Uploader._tempDir, destinationPrefix);
    await S3Uploader.removeTempDirIfExists();
    await fs.mkdir(tempUploadPath, { recursive: true });

    // Copy the files in the source dir to the root dir
    // Note: It would be faster to move the files, then move them back
    await fs.copy(config.app.staticAssetsPath, tempUploadPath);
  }

  public static ParseUploadPath(s3UploadPath: string): {
    bucketName: string;
    destinationPrefix: string;
  } {
    // Parse the S3 Source URI
    const uri = new URL(s3UploadPath);
    const bucketName = uri.host;
    const destinationPrefix = uri.pathname.length >= 1 ? uri.pathname.slice(1) : '';

    return { bucketName, destinationPrefix };
  }

  /**
   * Upload files to S3
   * @deprecated 2021-11-27
   * @param config
   * @param s3UploadPath
   * @param preflightResponse
   */
  public static async Upload(
    config: IConfig,
    s3UploadPath: string,
    preflightResponse: IDeployVersionPreflightResponse,
  ): Promise<void> {
    try {
      const { destinationPrefix, bucketName } = S3Uploader.ParseUploadPath(s3UploadPath);

      // Make a local root dir for the upload
      const tempUploadPath = path.join(S3Uploader._tempDir, destinationPrefix);
      await S3Uploader.removeTempDirIfExists();
      await fs.mkdir(tempUploadPath, { recursive: true });

      // Copy the files in the source dir to the root dir
      // Note: It would be faster to move the files, then move them back
      // FIXME: Limit parallelism while copying local files
      await fs.copy(config.app.staticAssetsPath, tempUploadPath);

      // Do the upload
      await S3TransferUtility.UploadDir(
        this._tempDir,
        destinationPrefix,
        bucketName,
        preflightResponse,
      );
    } finally {
      // Delete the directory, now that it's uploaded or if we failed
      await S3Uploader.removeTempDirIfExists();
    }
  }

  public static async removeTempDirIfExists(): Promise<void> {
    try {
      const stats = await fs.stat(S3Uploader._tempDir);
      if (stats.isDirectory()) {
        await fs.rm(S3Uploader._tempDir, { recursive: true });
      }
    } catch {
      // Don't care
      // fs.stat will throw if file/dir does not exist
      // Since we want the directory deleted this is ok
    }
  }

  private static readonly _tempDir = './deploytool-temp';
  public static get TempDir(): string {
    return S3Uploader._tempDir;
  }
}

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
    const ContentType = contentType(path.basename(file)) || 'application/octet-stream';
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
