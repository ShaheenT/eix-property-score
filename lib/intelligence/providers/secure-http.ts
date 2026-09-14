const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_BYTES = 2_000_000;

const PRIVATE_IPV4 = /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/;

export class ProviderHttpError extends Error {
  constructor(message: string, public readonly code: 'INVALID_URL' | 'BLOCKED_HOST' | 'TIMEOUT' | 'HTTP_ERROR' | 'PAYLOAD_TOO_LARGE' | 'INVALID_CONTENT') {
    super(message);
    this.name = 'ProviderHttpError';
  }
}

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host === '0.0.0.0' || host === '::1') return true;
  if (PRIVATE_IPV4.test(host)) return true;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return true;
  if (host.includes(':')) return true;
  return false;
}

export async function providerFetch<T>(
  rawUrl: string,
  options: {
    allowedHosts: readonly string[];
    timeoutMs?: number;
    maxBytes?: number;
    userAgent: string;
    parse: (response: Response) => Promise<T>;
  },
): Promise<T> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ProviderHttpError('Provider URL is invalid.', 'INVALID_URL');
  }

  if (url.protocol !== 'https:' || isBlockedHostname(url.hostname)) {
    throw new ProviderHttpError('Provider URL is not permitted.', 'BLOCKED_HOST');
  }

  const allowed = options.allowedHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  if (!allowed) throw new ProviderHttpError('Provider hostname is not allowlisted.', 'BLOCKED_HOST');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'error',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': options.userAgent,
      },
      cache: 'no-store',
    });

    if (!response.ok) throw new ProviderHttpError(`Provider returned HTTP ${response.status}.`, 'HTTP_ERROR');

    const contentLength = Number(response.headers.get('content-length') ?? 0);
    if (contentLength > (options.maxBytes ?? DEFAULT_MAX_BYTES)) {
      throw new ProviderHttpError('Provider response exceeds the maximum size.', 'PAYLOAD_TOO_LARGE');
    }

    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > (options.maxBytes ?? DEFAULT_MAX_BYTES)) {
      throw new ProviderHttpError('Provider response exceeds the maximum size.', 'PAYLOAD_TOO_LARGE');
    }

    const boundedResponse = new Response(text, { status: response.status, headers: response.headers });
    return await options.parse(boundedResponse);
  } catch (error) {
    if (error instanceof ProviderHttpError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ProviderHttpError('Provider request timed out.', 'TIMEOUT');
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ProviderHttpError('Provider request timed out.', 'TIMEOUT');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
