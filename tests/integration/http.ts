type HttpResponse = {
  status: number;
  headers: Record<string, string>;
  data: unknown;
};

function normalizeHeaders(headers: Headers): Record<string, string> {
  return Object.fromEntries(
    Array.from(headers.entries(), ([key, value]) => [key.toLowerCase(), value]),
  );
}

async function request(url: string, init?: RequestInit): Promise<HttpResponse> {
  const response = await fetch(url, init);
  const contentType = response.headers.get('content-type') ?? '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  return {
    status: response.status,
    headers: normalizeHeaders(response.headers),
    data,
  };
}

export async function get(url: string, init?: RequestInit): Promise<HttpResponse> {
  return request(url, init);
}

export async function post(url: string, init?: RequestInit): Promise<HttpResponse> {
  return request(url, { ...init, method: 'POST' });
}
