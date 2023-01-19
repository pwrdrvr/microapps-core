/**
 * Represents a Versions
 */
export interface IVersions {
  version: string;
  alias?: string;
}

/**
 * Setup version and alias strings
 * @param version
 * @returns
 */
export function createVersions(version: string): IVersions {
  return { version, alias: `v${version.replace(/\./g, '_')}` };
}
