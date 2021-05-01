import DeployConfig from './DeployConfig';
import S3TransferUtility from './S3TransferUtility';
import path from 'path';
import fs from 'fs-extra';

export default class S3Uploader {
  private static readonly _s3Bucket = 'pwrdrvr-apps-staging';
  private static readonly _tempDir = './deploytool-temp';

  public static async Upload(config: DeployConfig): Promise<void> {
    const destinationPrefix = `${config.AppName}/${config.SemVer}`;

    // Make a local root dir for the upload
    const tempUploadPath = path.join(S3Uploader._tempDir, destinationPrefix);
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
    await fs.mkdir(tempUploadPath, { recursive: true });

    // Copy the files in the source dir to the root dir
    // Note: It would be faster to move the files, then move them back
    await fs.copy(config.StaticAssetsPath, tempUploadPath);

    // Do the upload
    await S3TransferUtility.UploadDir(this._tempDir, this._s3Bucket);

    // Delete the directory now that it's uploaded
    await fs.rm(S3Uploader._tempDir, { recursive: true });
  }
}
