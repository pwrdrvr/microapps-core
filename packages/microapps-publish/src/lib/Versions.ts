import { promises as fs } from 'fs-extra';
import { IVersions } from '@pwrdrvr/microapps-deployer-lib';

/**
 * Represents a File To Modify
 */
export interface IFileToModify {
  path: string;
  versions: IVersions;
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

/**
 * Write new versions into specified config file
 * @param path
 * @param requiredVersions
 * @param leaveFiles
 * @returns
 */
export async function writeNewVersions(
  path: string,
  requiredVersions: IVersions,
  leaveFiles: boolean,
): Promise<boolean> {
  const stats = await fs.stat(path);
  if (!stats.isFile) {
    return false;
  }

  // Make a backup of the file
  await fs.copyFile(path, `${path}.original`);

  // File exists, check that it has the required version strings
  let fileText = await fs.readFile(path, 'utf8');

  for (const key of Object.keys(requiredVersions)) {
    const placeHolder = key === 'version' ? '0.0.0' : 'v0_0_0';
    if (fileText.indexOf(placeHolder) === -1) {
      // The required placeholder is missing
      return false;
    } else {
      const regExp = new RegExp(escapeRegExp(placeHolder), 'g');
      fileText = fileText.replace(
        regExp,
        key === 'version' ? requiredVersions.version : (requiredVersions.alias as string),
      );
    }
  }

  // Write the updated file contents
  await fs.writeFile(path, fileText, 'utf8');

  // Leave a copy of the modified file if requested
  if (leaveFiles) {
    // This copy will overwrite an existing file
    await fs.copyFile(path, `${path}.modified`);
  }

  return true;
}

/**
 * Restore files that the version was patched into
 */
export async function restoreFiles(filesToModify: IFileToModify[]): Promise<void> {
  // Put the old files back when succeeded or failed
  for (const fileToModify of filesToModify) {
    try {
      const stats = await fs.stat(`${fileToModify.path}.original`);
      if (stats.isFile()) {
        // Remove the possibly modified file
        await fs.unlink(fileToModify.path);

        // Move the original file back
        await fs.rename(`${fileToModify.path}.original`, fileToModify.path);
      }
    } catch {
      // don't care... if the file doesn't exist we can't do anything
    }
  }
}
