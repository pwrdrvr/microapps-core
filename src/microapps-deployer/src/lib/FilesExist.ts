import { promises as fs, statSync } from 'fs';

export class FilesExist {
  public static async getExistingFiles(filesToCheck: string[]): Promise<string[]> {
    const existingFiles: string[] = [];
    for (const file of filesToCheck) {
      if (await FilesExist.fileExists(file)) {
        existingFiles.push(file);
      }
    }

    return existingFiles;
  }

  public static getExistingFilesSync(filesToCheck: string[]): string[] {
    const existingFiles: string[] = [];
    for (const file of filesToCheck) {
      if (FilesExist.fileExistsSync(file)) {
        existingFiles.push(file);
      }
    }

    return existingFiles;
  }

  private static fileExistsSync(file: string): boolean {
    try {
      const stats = statSync(file);
      if (stats.isFile()) {
        return true;
      }
    } catch {
      // Don't care
      // fs.stat will throw if file/dir does not exist
      // Since we want the directory deleted this is ok
    }
    return false;
  }

  private static async fileExists(file: string): Promise<boolean> {
    try {
      const stats = await fs.stat(file);
      if (stats.isFile()) {
        return true;
      }
    } catch {
      // Don't care
      // fs.stat will throw if file/dir does not exist
      // Since we want the directory deleted this is ok
    }
    return false;
  }
}
