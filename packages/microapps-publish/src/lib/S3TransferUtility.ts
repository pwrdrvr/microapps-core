//
// From: https://stackoverflow.com/a/65862128/878903
//

import { createReadStream, readdirSync } from 'fs';
import * as path from 'path';
import * as s3 from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import type { IDeployVersionPreflightResponse } from '@pwrdrvr/microapps-deployer-lib';
import { contentType } from 'mime-types';
import pMap from 'p-map';

export class S3TransferUtility {
  /**
   * @deprecated 2021-11-27
   *
   * @param s3Path
   * @param destPrefixPath
   * @param bucketName
   * @param preflightResponse
   */
  public static async UploadDir(
    s3Path: string,
    destPrefixPath: string,
    bucketName: string,
    preflightResponse: IDeployVersionPreflightResponse,
  ): Promise<void> {
    // Use temp credentials for S3
    const s3Client = new s3.S3Client({
      maxAttempts: 16,
      credentials: {
        accessKeyId: preflightResponse.awsCredentials.accessKeyId,
        secretAccessKey: preflightResponse.awsCredentials.secretAccessKey,
        sessionToken: preflightResponse.awsCredentials.sessionToken,
      },
    });

    // console.log('Uploading files to S3');
    const files = S3TransferUtility.GetFiles(s3Path);
    // const pathWithoutAppAndVer = path.join(s3Path, destPrefixPath);
    // for (const filePath of files) {
    //   const relFilePath = path.relative(pathWithoutAppAndVer, filePath);
    //   console.log(`  ${relFilePath}`);
    // }

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
  // Recursive getFiles from
  // https://stackoverflow.com/a/45130990/831465

  /**
   * Resursively enumerate the files to be uploaded
   * @param dir
   * @returns
   */
  public static GetFiles(dir: string): string[] {
    const dirents = readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];
    const toScan = dirents.map((dirent) => ({
      path: path.resolve(dir, dirent.name),
      isDirectory: dirent.isDirectory(),
    }));

    // Iteratively collect all the files in the directories
    // Do not use function call recursion
    while (toScan.length > 0) {
      const dirOrFile = toScan.pop();

      if (dirOrFile.isDirectory) {
        const direntsChild = readdirSync(dirOrFile.path, { withFileTypes: true });
        const toScanChild = direntsChild.map((dirent) => ({
          path: path.resolve(dirOrFile.path, dirent.name),
          isDirectory: dirent.isDirectory(),
        }));
        Array.prototype.push.apply(toScan, toScanChild);
      } else {
        files.push(dirOrFile.path);
      }
    }

    // Reverse the array so that the files are in the same order as the original
    return files.reverse();
  }
}
