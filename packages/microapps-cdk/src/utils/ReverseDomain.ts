/**
 * Input like 'example.com.' will return as 'com.example'
 */
export function reverseDomain(domain: string): string {
  let parts = domain.split('.').reverse();
  if (parts[0] === '') {
    parts = parts.slice(1);
  }
  return parts.join('.');
}
