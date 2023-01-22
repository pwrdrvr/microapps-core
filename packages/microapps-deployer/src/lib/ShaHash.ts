import crypto from 'crypto';

export function SHA256Hash(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function SHA1Hash(input: string): string {
  return crypto.createHash('sha1').update(input).digest('hex');
}
