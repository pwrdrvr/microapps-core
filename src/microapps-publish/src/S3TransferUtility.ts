//
// From: https://stackoverflow.com/a/65862128/878903
//

import { promises as fs, createReadStream } from 'fs';
import * as path from 'path';
import * as S3 from '@aws-sdk/client-s3';

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

  public static async UploadDir(s3Path: string, bucketName: string): Promise<void> {
    const s3 = new S3.S3Client({});

    // TODO: This is unlimited parallelism, use batches
    const files = (await S3TransferUtility.GetFiles(s3Path)) as string[];
    console.log(`Uploading files to S3: ${files}`);
    const uploads = files.map((filePath) =>
      s3.send(
        new S3.PutObjectCommand({
          Key: path.relative(s3Path, filePath),
          Bucket: bucketName,
          Body: createReadStream(filePath),
        }),
      ),
    );
    await Promise.all(uploads);
  }
}
