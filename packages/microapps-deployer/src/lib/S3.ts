import pMap from 'p-map';
import * as s3 from '@aws-sdk/client-s3';
import { IConfig } from '../config/Config';

const s3Client = new s3.S3Client({
  maxAttempts: 8,
});

/**
 * Copy a list of files from the Staging bucket to the Destination bucket
 * @param list
 * @param stagingBucket
 * @param sourcePrefix
 * @param destinationPrefix
 * @param config
 * @returns
 */
export async function CopyFilesInList(
  list: s3.ListObjectsV2CommandOutput,
  stagingBucket: string,
  sourcePrefix: string,
  destinationPrefix: string,
  config: IConfig,
): Promise<void> {
  if (list === undefined || list.Contents === undefined) {
    return;
  }

  await pMap(
    list.Contents,
    async (obj) => {
      const sourceKeyRootless = obj.Key?.slice(sourcePrefix.length);

      // Copy from the Staging bucket to the Destination bucket
      await s3Client.send(
        new s3.CopyObjectCommand({
          // Source
          CopySource: `${stagingBucket}/${obj.Key}`,
          // Destination
          Bucket: config.filestore.destinationBucket,
          Key: `${destinationPrefix}/${sourceKeyRootless}`,
        }),
      );

      // Remove the file from the Staging bucket
      await s3Client.send(
        new s3.DeleteObjectCommand({
          Bucket: stagingBucket,
          Key: obj.Key,
        }),
      );
    },
    { concurrency: 20 },
  );
}

/**
 * List files in the Staging bucket and each chunk of the list
 * to the Destination bucket
 * @param stagingBucket
 * @param sourcePrefix
 * @param destinationPrefix
 * @param config
 */
export async function CopyToProdBucket(
  stagingBucket: string,
  sourcePrefix: string,
  destinationPrefix: string,
  config: IConfig,
): Promise<void> {
  let list: s3.ListObjectsV2CommandOutput | undefined;
  do {
    const optionals =
      list?.NextContinuationToken !== undefined
        ? { ContinuationToken: list.NextContinuationToken }
        : ({} as s3.ListObjectsV2CommandInput);
    list = await s3Client.send(
      new s3.ListObjectsV2Command({
        Bucket: stagingBucket,
        Prefix: sourcePrefix,
        ...optionals,
      }),
    );
    await CopyFilesInList(list, stagingBucket, sourcePrefix, destinationPrefix, config);
  } while (list.IsTruncated);
}
