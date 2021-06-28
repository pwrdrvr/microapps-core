import { IConfig } from './config/Config';
import S3TransferUtility from './S3TransferUtility';
import path from 'path';
import fs from 'fs-extra';
import { Config } from './config/Config';

export default class S3Uploader {
  private static readonly _tempDir = './deploytool-temp';

  public static async Upload(config: IConfig): Promise<void> {
    try {
      const destinationPrefix = `${config.app.Name}/${config.app.SemVer}`;

      // Make a local root dir for the upload
      const tempUploadPath = path.join(S3Uploader._tempDir, destinationPrefix);
      await S3Uploader.removeTempDirIfExists();
      await fs.mkdir(tempUploadPath, { recursive: true });

      // Copy the files in the source dir to the root dir
      // Note: It would be faster to move the files, then move them back
      // FIXME: Use p-map for controlled parallelism
      await fs.copy(config.app.StaticAssetsPath, tempUploadPath);

      // Do the upload
      await S3TransferUtility.UploadDir(this._tempDir, Config.instance.filestore.stagingBucket);
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
}
