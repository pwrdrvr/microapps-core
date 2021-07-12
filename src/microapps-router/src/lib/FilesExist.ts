import { pathExists, pathExistsSync } from 'fs-extra';

export class FilesExist {
  public static async getExistingFiles(filesToCheck: string[]): Promise<string[]> {
    const existingFiles: string[] = [];
    for (const file of filesToCheck) {
      if (await pathExists(file)) {
        existingFiles.push(file);
      }
    }

    return existingFiles;
  }

  public static getExistingFilesSync(filesToCheck: string[]): string[] {
    const existingFiles: string[] = [];
    for (const file of filesToCheck) {
      if (pathExistsSync(file)) {
        existingFiles.push(file);
      }
    }

    return existingFiles;
  }
}
