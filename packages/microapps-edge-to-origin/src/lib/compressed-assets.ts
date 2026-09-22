import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { CloudFrontRequest } from 'aws-lambda';

const clients = new Map<string, S3Client>();

/** Rank acceptable encodings, honoring explicit refusals and identity preference. */
function encodingWeights(header: string): Map<string, number> {
  const weights = new Map<string, number>();
  for (const part of header.toLowerCase().split(',')) {
    const [name, ...parameters] = part.trim().split(';');
    if (!name) continue;
    let weight = 1;
    for (const parameter of parameters) {
      const [key, value] = parameter.trim().split('=');
      if (key === 'q') {
        weight = /^(0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/.test(value ?? '') ? Number(value) : 0;
      }
    }
    weights.set(name, weight);
  }
  return weights;
}

export function acceptsIdentity(header: string): boolean {
  const weights = encodingWeights(header);
  return (weights.get('identity') ?? (weights.get('*') === 0 ? 0 : 1)) > 0;
}

export function acceptedEncodings(header: string): Array<'br' | 'gzip'> {
  const weights = encodingWeights(header);
  const weight = (name: string) => weights.get(name) ?? weights.get('*') ?? 0;
  return (['br', 'gzip'] as const)
    .filter((name) => weight(name) > 0 && weight(name) >= (weights.get('identity') ?? 0))
    .sort((left, right) => weight(right) - weight(left));
}

/**
 * Probe sidecars on S3 origin misses, then let CloudFront fetch the selected object.
 * Missing variants (including old deployments) leave the original path intact.
 */
export async function selectCompressedAsset(
  request: CloudFrontRequest,
): Promise<'original' | 'compressed' | 'missing'> {
  if (!['GET', 'HEAD'].includes(request.method) || request.headers.range) return 'original';
  const origin = request.origin?.s3;
  if (!origin) return 'original';
  const encodings = acceptedEncodings(
    (request.headers['accept-encoding'] ?? []).map((header) => header.value).join(','),
  );
  if (!encodings.length || /\.microapps\.(br|gz)$/.test(request.uri)) return 'original';

  // S3 origins use virtual-hosted regional or global bucket endpoints.
  const match = origin.domainName.match(
    /^(.+)\.s3(?:[.-](?:dualstack\.)?([a-z0-9-]+))?\.amazonaws\.com(?:\.cn)?$/,
  );
  if (!match) return 'original';
  const region = origin.region || match[2] || 'us-east-1';
  let client = clients.get(region);
  if (!client) {
    client = new S3Client({ region, maxAttempts: 2 });
    clients.set(region, client);
  }
  const originalUri = request.uri;
  const key = decodeURIComponent(`${origin.path || ''}${originalUri}`).replace(/^\//, '');
  let metadata: Record<string, string> | undefined;
  try {
    metadata = (await client.send(new HeadObjectCommand({ Bucket: match[1], Key: key }))).Metadata;
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status === 403 || status === 404) return 'missing';
    throw error;
  }
  const available = metadata?.['microapps-encodings']?.split(',') ?? [];
  const digest = metadata?.['microapps-sha256'];
  if (!digest) return 'original';
  for (const encoding of encodings.filter((candidate) => available.includes(candidate))) {
    const suffix = encoding === 'br' ? '.microapps.br' : '.microapps.gz';
    try {
      const head = await client.send(
        new HeadObjectCommand({ Bucket: match[1], Key: key + suffix }),
      );
      // Never serve arbitrary files at reserved paths as compressed responses.
      if (head.ContentEncoding !== encoding || head.Metadata?.['microapps-sha256'] !== digest)
        continue;
      request.uri = originalUri + suffix;
      return 'compressed';
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata
        ?.httpStatusCode;
      // S3 returns 403 for missing keys when the role has no ListBucket permission.
      if (status === 403 || status === 404) continue;
      throw error;
    }
  }
  return 'original';
}
