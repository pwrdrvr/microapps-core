using System;
using System.Data.Common;
using System.IO;
using System.Threading.Tasks;
using Amazon.S3;
using Amazon.S3.Transfer;

namespace PwrDrvr.MicroApps.DeployTool {
  internal class S3Uploader {
    private static readonly string _s3Bucket = "pwrdrvr-apps-staging";
    private static readonly string _tempDir = "./deploytool-temp";

    async internal static Task Upload(DeployConfig config) {
      var destinationPrefix = string.Format("{0}/{1}", config.AppName, config.SemVer);

      var s3Client = new AmazonS3Client();
      var s3TU = new TransferUtility(s3Client);

      // Make a local root dir for the upload
      string tempUploadPath = Path.Combine(_tempDir, destinationPrefix);
      if (Directory.Exists(tempUploadPath)) {
        Directory.Delete(tempUploadPath, true);
      }
      var tempUploadDir = Directory.CreateDirectory(tempUploadPath);

      // Copy the files in the source dir to the root dir
      // Note: It would be faster to move the files, then move them back
      DirectoryCopy(config.StaticAssetsPath, tempUploadDir.FullName, true);

      var diUploadRoot = new DirectoryInfo(_tempDir);

      // Do the upload
      await s3TU.UploadDirectoryAsync(diUploadRoot.FullName, _s3Bucket, "*.*", SearchOption.AllDirectories);

      // Delete the directory now that it's uploaded
      Directory.Delete(tempUploadPath, true);
    }

    // Really cheesy recursive function from:
    // https://docs.microsoft.com/en-us/dotnet/standard/io/how-to-copy-directories
    private static void DirectoryCopy(string sourceDirName, string destDirName, bool copySubDirs) {
      // Get the subdirectories for the specified directory.
      var dir = new DirectoryInfo(sourceDirName);

      if (!dir.Exists) {
        throw new DirectoryNotFoundException(
            "Source directory does not exist or could not be found: "
            + sourceDirName);
      }

      DirectoryInfo[] dirs = dir.GetDirectories();

      // If the destination directory doesn't exist, create it.       
      Directory.CreateDirectory(destDirName);

      // Get the files in the directory and copy them to the new location.
      FileInfo[] files = dir.GetFiles();
      foreach (FileInfo file in files) {
        string tempPath = Path.Combine(destDirName, file.Name);
        file.CopyTo(tempPath, false);
      }

      // If copying subdirectories, copy them and their contents to new location.
      if (copySubDirs) {
        foreach (DirectoryInfo subdir in dirs) {
          string tempPath = Path.Combine(destDirName, subdir.Name);
          DirectoryCopy(subdir.FullName, tempPath, copySubDirs);
        }
      }
    }
  }
}