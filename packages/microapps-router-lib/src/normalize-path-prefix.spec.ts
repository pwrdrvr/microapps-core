import { normalizePathPrefix } from './normalize-path-prefix';

describe('normalizePathPrefix', () => {
  it('should return an empty string when the input is an empty string', () => {
    expect(normalizePathPrefix('')).toBe('');
  });

  it('should add a leading slash if it does not exist', () => {
    expect(normalizePathPrefix('path')).toBe('/path');
  });

  it('should not add a leading slash if it already exists', () => {
    expect(normalizePathPrefix('/path')).toBe('/path');
  });

  it('should remove a trailing slash if it exists', () => {
    expect(normalizePathPrefix('/path/')).toBe('/path');
  });

  it('should remove a trailing slash and add a leading slash if needed', () => {
    expect(normalizePathPrefix('path/')).toBe('/path');
  });

  it('should return the same input when it starts with a slash and does not end with a slash', () => {
    expect(normalizePathPrefix('/path/subpath')).toBe('/path/subpath');
  });
});
