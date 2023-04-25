/**
 * Ensure that the path starts with a / and does not end with a /
 *
 * @param pathPrefix
 * @returns
 */

export function normalizePathPrefix(pathPrefix: string): string {
  let normalizedPathPrefix = pathPrefix;
  if (normalizedPathPrefix !== '' && !normalizedPathPrefix.startsWith('/')) {
    normalizedPathPrefix = '/' + pathPrefix;
  }
  if (normalizedPathPrefix.endsWith('/')) {
    normalizedPathPrefix.substring(0, normalizedPathPrefix.length - 1);
  }

  return normalizedPathPrefix;
}
