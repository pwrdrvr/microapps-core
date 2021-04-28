import DeployConfig from './DeployConfig';
import S3TransferUtility from './S3TransferUtility';
import path from 'path';
import { promises as fs } from 'fs';

export default class S3Uploader {
  private static readonly _s3Bucket = 'pwrdrvr-apps-staging';
  private static readonly _tempDir = './deploytool-temp';

  public static async Upload(config: DeployConfig): Promise<void> {
    const destinationPrefix = `${config.AppName}/${config.SemVer}`;

    // Make a local root dir for the upload
    const tempUploadPath = path.join(S3Uploader._tempDir, destinationPrefix);
    const stats = await fs.stat(S3Uploader._tempDir);
    if (stats.isDirectory()) {
      await fs.rm(S3Uploader._tempDir, { recursive: true });
    }
    await fs.mkdir(tempUploadPath);

    // Copy the files in the source dir to the root dir
    // Note: It would be faster to move the files, then move them back
    S3Uploader.DirectoryCopy(config.StaticAssetsPath, tempUploadPath, true);

    // Do the upload
    await S3TransferUtility.UploadDir(this._tempDir, this._s3Bucket);

    // Delete the directory now that it's uploaded
    await fs.rm(S3Uploader._tempDir, { recursive: true });
  }

  // Really cheesy recursive function from:
  // https://docs.microsoft.com/en-us/dotnet/standard/io/how-to-copy-directories
  private static async DirectoryCopy(
    sourceDirName: string,
    destDirName: string,
    copySubDirs: boolean,
  ) {
    // Get the subdirectories for the specified directory.
    const dir = await fs.stat(sourceDirName);

    if (!dir.isDirectory()) {
      throw new Error(`Source directory does not exist or could not be found: ${sourceDirName}`);
    }

    const all = await fs.readdir(sourceDirName, { withFileTypes: true });

    // If the destination directory doesn't exist, create it.
    const destDirStat = await fs.stat(destDirName);
    if (!destDirStat.isDirectory()) {
      fs.mkdir(destDirName);
    }

    // Get the files in the directory and copy them to the new location.
    for (let i = 0; i < all.length; i++) {
      const file = all[i];
      if (file.isFile()) {
        const tempPath = path.join(destDirName, file.name);
        await fs.copyFile(file.name, tempPath);
      } else if (file.isDirectory()) {
        const tempPath = path.join(destDirName, file.name);
        S3Uploader.DirectoryCopy(file.name, tempPath, copySubDirs);
      }
    }
  }
}
