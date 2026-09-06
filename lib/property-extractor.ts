import { validatePropertyInput } from '@/lib/property-input';

export type PropertyExtractionStatus =
  | 'extracted'
  | 'insufficient_data'
  | 'extraction_failed'
  | 'unsupported_source';

export interface PropertyFacts {
  title: string | null;
  address: string | null;
  suburb: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  askingPriceCents: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  propertyType: string | null;
  floorSizeM2: number | null;
  landSizeM2: number | null;
}

export interface PropertyEvidence {
  field: keyof PropertyFacts;
  value: string;
  source: 'json_ld' | 'open_graph' | 'meta' | 'html';
}

export interface PropertyExtractionResult {
  status: PropertyExtractionStatus;
  sourceUrl: string;
  finalUrl: string | null;
  source: string | null;
  facts: PropertyFacts;
  evidence: PropertyEvidence[];
  errors: string[];
}

export interface ExtractPropertyOptions {
  timeoutMs?: number;
  maxResponseBytes?: number;
}

export const DEFAULT_EXTRACTION_TIMEOUT_MS = 10_000;
export const DEFAULT_MAX_RESPONSE_BYTES = 2_000_000;

function emptyFacts(): PropertyFacts {
  return {
    title: null,
    address: null,
    suburb: null,
    city: null,
    province: null,
    postalCode: null,
    askingPriceCents: null,
    bedrooms: null,
    bathrooms: null,
    propertyType: null,
    floorSizeM2: null,
    landSizeM2: null,
  };
}

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');

  if (
    host === 'localhost' ||
    host === 'localhost.localdomain' ||
    host === '0.0.0.0' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local')
  ) {
    return true;
  }

  const ipv4 = host.match(
    /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
  );

  if (!ipv4) {
    return false;
  }

  const octets = ipv4.slice(1).map(Number);

  if (octets.some((octet) => octet > 255)) {
    return true;
  }

  const [a, b] = octets;

  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 192 && b === 168) ||
    (a === 172 && b >= 16 && b <= 31)
  );
}

function isAllowedSourceUrl(sourceUrl: string): boolean {
  const validation = validatePropertyInput(sourceUrl);

  if (!validation.ok || validation.kind !== 'url') {
    return false;
  }

  try {
    const url = new URL(validation.normalizedInput);

    return !isBlockedHostname(url.hostname);
  } catch {
    return false;
  }
}

function createTimeoutSignal(timeoutMs: number): AbortSignal {
  return AbortSignal.timeout(timeoutMs);
}

async function readResponseWithLimit(
  response: Response,
  maxResponseBytes: number
): Promise<string> {
  const contentLength = response.headers.get('content-length');

  if (contentLength) {
    const declaredLength = Number(contentLength);

    if (
      Number.isFinite(declaredLength) &&
      declaredLength > maxResponseBytes
    ) {
      throw new Error('Property page exceeds the response size limit.');
    }
  }

  if (!response.body) {
    throw new Error('Property page returned an empty response body.');
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      if (!value) {
        continue;
      }

      totalBytes += value.byteLength;

      if (totalBytes > maxResponseBytes) {
        await reader.cancel();
        throw new Error('Property page exceeds the response size limit.');
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const combined = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder('utf-8', { fatal: false }).decode(combined);
}

function createResult(
  sourceUrl: string,
  status: PropertyExtractionStatus,
  errors: string[] = [],
  finalUrl: string | null = null,
  source: string | null = null
): PropertyExtractionResult {
  return {
    status,
    sourceUrl,
    finalUrl,
    source,
    facts: emptyFacts(),
    evidence: [],
    errors,
  };
}

export async function extractPropertyFromUrl(
  sourceUrl: string,
  options: ExtractPropertyOptions = {}
): Promise<PropertyExtractionResult> {
  const timeoutMs =
    options.timeoutMs ?? DEFAULT_EXTRACTION_TIMEOUT_MS;

  const maxResponseBytes =
    options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;

  const validation = validatePropertyInput(sourceUrl);

  if (!validation.ok) {
    if (validation.errorCode === 'UNSUPPORTED_URL') {
      return createResult(
        sourceUrl,
        'unsupported_source',
        [
          validation.errorMessage ||
            'The property source is not currently supported.',
        ]
      );
    }

    return createResult(
      sourceUrl,
      'extraction_failed',
      [
        validation.errorMessage ||
          'The supplied property URL is not valid.',
      ]
    );
  }

  if (validation.kind !== 'url') {
    return createResult(
      sourceUrl,
      'extraction_failed',
      ['A property listing URL is required for URL extraction.']
    );
  }

  if (!isAllowedSourceUrl(validation.normalizedInput)) {
    return createResult(
      sourceUrl,
      'unsupported_source',
      ['The property source is not permitted for server-side fetching.']
    );
  }

  const initialUrl = new URL(validation.normalizedInput);

  try {
    const response = await fetch(initialUrl, {
      method: 'GET',
      redirect: 'manual',
      signal: createTimeoutSignal(timeoutMs),
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent':
          'EiX-Property-Score/1.0 (+https://eix-property-score-beta.vercel.app)',
      },
    });

    const redirectLocation = response.headers.get('location');

    if (
      response.status >= 300 &&
      response.status < 400 &&
      redirectLocation
    ) {
      const redirectUrl = new URL(
        redirectLocation,
        initialUrl
      );

      if (!isAllowedSourceUrl(redirectUrl.toString())) {
        return createResult(
          sourceUrl,
          'extraction_failed',
          ['The property page redirected to a blocked or unsupported destination.'],
          redirectUrl.toString(),
          validation.source
        );
      }

      return createResult(
        sourceUrl,
        'extraction_failed',
        [
          'The property page uses a redirect. Redirect following will be enabled only after destination validation is fully hardened.',
        ],
        redirectUrl.toString(),
        validation.source
      );
    }

    if (!response.ok) {
      return createResult(
        sourceUrl,
        'extraction_failed',
        [`Property page returned HTTP ${response.status}.`],
        response.url || initialUrl.toString(),
        validation.source
      );
    }

    const contentType = response.headers.get('content-type') || '';

    if (
      !contentType.toLowerCase().includes('text/html') &&
      !contentType.toLowerCase().includes('application/xhtml+xml')
    ) {
      return createResult(
        sourceUrl,
        'extraction_failed',
        ['The property source did not return an HTML page.'],
        response.url || initialUrl.toString(),
        validation.source
      );
    }

    const html = await readResponseWithLimit(
      response,
      maxResponseBytes
    );

    if (!html.trim()) {
      return createResult(
        sourceUrl,
        'extraction_failed',
        ['The property page returned an empty HTML document.'],
        response.url || initialUrl.toString(),
        validation.source
      );
    }

    return createResult(
      sourceUrl,
      'insufficient_data',
      [
        'The property page was fetched successfully, but property fact extraction is not implemented yet.',
      ],
      response.url || initialUrl.toString(),
      validation.source
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown property extraction error.';

    return createResult(
      sourceUrl,
      'extraction_failed',
      [message],
      null,
      validation.source
    );
  }
}
