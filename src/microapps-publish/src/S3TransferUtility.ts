//
// From: https://stackoverflow.com/a/65862128/878903
//

import { promises as fs, createReadStream } from 'fs';
import * as path from 'path';
import { Upload } from '@aws-sdk/lib-storage';
import * as s3 from '@aws-sdk/client-s3';
import pMap from 'p-map';
import { contentType } from 'mime-types';

export default class S3TransferUtility {
  // Recursive getFiles from
  // https://stackoverflow.com/a/45130990/831465

  private static async GetFiles(dir: string): Promise<string | string[]> {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
      dirents.map((dirent) => {
        const res = path.resolve(dir, dirent.name);
        return dirent.isDirectory() ? S3TransferUtility.GetFiles(res) : res;
      }),
    );
    return Array.prototype.concat(...files);
  }

  public static async UploadDir(
    s3Path: string,
    destPrefixPath: string,
    bucketName: string,
  ): Promise<void> {
    const s3Client = new s3.S3Client({});

    console.log(`Uploading files to S3`);
    const files = (await S3TransferUtility.GetFiles(s3Path)) as string[];
    const pathWithoutAppAndVer = path.join(s3Path, destPrefixPath);
    for (const filePath of files) {
      const relFilePath = path.relative(pathWithoutAppAndVer, filePath);
      console.log(`  ${relFilePath}`);
    }

    // Use p-map to limit upload parallelism
    await pMap(
      files,
      async (filePath) => {
        // Use 4 multi-part parallel uploads for items > 5 MB
        const upload = new Upload({
          client: s3Client,
          leavePartsOnError: false,
          params: {
            Bucket: bucketName,
            Key: path.relative(s3Path, filePath),
            Body: createReadStream(filePath),
            ContentType: contentType(path.basename(filePath)) || 'application/octet-stream',
            CacheControl: 'max-age=86400; public',
          },
        });
        await upload.done();
      },
      {
        concurrency: 10,
      },
      // await s3.send(
      //   new S3.PutObjectCommand({
      //     Key: path.relative(s3Path, filePath),
      //     Bucket: bucketName,
      //     Body: createReadStream(filePath),
      //     ContentType: contentType(path.basename(filePath)) || 'application/octet-stream',
      //     CacheControl: 'max-age=86400; public',
      //   }),
    );
  }
}
