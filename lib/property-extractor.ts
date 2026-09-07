import { validatePropertyInput } from '@/lib/property-input';
import {
  extractJsonLdFacts,
  mergeFacts,
  mergeEvidence,
} from '@/lib/property-parser';
import type {
  PropertyEvidence,
  PropertyFacts,
} from '@/lib/property-types';

export type PropertyExtractionStatus =
  | 'extracted'
  | 'insufficient_data'
  | 'extraction_failed'
  | 'unsupported_source';

export interface PropertyExtractionResult {
  status: PropertyExtractionStatus;
  facts: PropertyFacts;
  evidence: PropertyEvidence[];
  source: string;
  sourceUrl: string;
  errors: string[];
}

export const DEFAULT_EXTRACTION_TIMEOUT_MS = 10_000;
export const DEFAULT_MAX_RESPONSE_BYTES = 2_000_000;

const EXTRACTION_USER_AGENT =
  'EiX-Property-Score/1.0 (+https://eix-property-score-beta.vercel.app)';

const EMPTY_FACTS: PropertyFacts = {
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

interface FetchOptions {
  timeoutMs?: number;
  maxResponseBytes?: number;
}

interface FetchedPage {
  finalUrl: string;
  contentType: string;
  body: string;
}

function emptyFacts(): PropertyFacts {
  return { ...EMPTY_FACTS };
}

function extractJsonLdBlocks(body: string): unknown[] {
  const blocks: unknown[] = [];

  const scriptPattern =
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  for (const match of Array.from(body.matchAll(scriptPattern))) {
    const raw = match[1].trim();

    if (!raw) {
      continue;
    }

    try {
      blocks.push(JSON.parse(raw));
    } catch {
      // Ignore malformed JSON-LD and continue safely.
    }
  }

  return blocks;
}

function isPrivateOrLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');

  if (
    host === 'localhost' ||
    host === 'localhost.localdomain' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host === '0.0.0.0' ||
    host === '::1'
  ) {
    return true;
  }

  const ipv4 = host.match(
    /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/,
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
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254)
  );
}

function validateFetchUrl(input: string): URL {
  const parsed = new URL(input);

  if (
    parsed.protocol !== 'http:' &&
    parsed.protocol !== 'https:'
  ) {
    throw new Error('Unsupported URL protocol.');
  }

  if (parsed.username || parsed.password) {
    throw new Error('Credential-bearing URLs are not allowed.');
  }

  if (isPrivateOrLocalHostname(parsed.hostname)) {
    throw new Error(
      'Private or local network destinations are not allowed.',
    );
  }

  return parsed;
}

function getContentType(response: Response): string {
  return (
    response.headers.get('content-type')?.toLowerCase() ?? ''
  );
}

function isAllowedContentType(contentType: string): boolean {
  if (!contentType) {
    return true;
  }

  return (
    contentType.includes('text/html') ||
    contentType.includes('application/xhtml+xml')
  );
}

async function readResponseBodyWithLimit(
  response: Response,
  maxBytes: number,
): Promise<string> {
  const contentLength = response.headers.get('content-length');

  if (contentLength) {
    const declaredLength = Number(contentLength);

    if (
      Number.isFinite(declaredLength) &&
      declaredLength > maxBytes
    ) {
      throw new Error(
        'Response exceeds the maximum allowed size.',
      );
    }
  }

  if (!response.body) {
    const body = await response.text();

    if (
      new TextEncoder().encode(body).byteLength >
      maxBytes
    ) {
      throw new Error(
        'Response exceeds the maximum allowed size.',
      );
    }

    return body;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let totalBytes = 0;
  let body = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      totalBytes += value.byteLength;

      if (totalBytes > maxBytes) {
        await reader.cancel();

        throw new Error(
          'Response exceeds the maximum allowed size.',
        );
      }

      body += decoder.decode(value, {
        stream: true,
      });
    }

    body += decoder.decode();

    return body;
  } finally {
    reader.releaseLock();
  }
}

async function fetchPage(
  inputUrl: string,
  options: FetchOptions = {},
): Promise<FetchedPage> {
  const timeoutMs =
    options.timeoutMs ??
    DEFAULT_EXTRACTION_TIMEOUT_MS;

  const maxResponseBytes =
    options.maxResponseBytes ??
    DEFAULT_MAX_RESPONSE_BYTES;

  const url = validateFetchUrl(inputUrl);

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        Accept:
          'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1',
        'User-Agent': EXTRACTION_USER_AGENT,
      },
    });

    if (
      response.status >= 300 &&
      response.status < 400
    ) {
      const location =
        response.headers.get('location');

      if (!location) {
        throw new Error(
          'Redirect response has no destination.',
        );
      }

      const redirectUrl = new URL(
        location,
        url.toString(),
      );

      validateFetchUrl(redirectUrl.toString());

      throw new Error(
        'Redirect destination requires additional validation before following.',
      );
    }

    if (!response.ok) {
      throw new Error(
        `Property page returned HTTP ${response.status}.`,
      );
    }

    const contentType = getContentType(response);

    if (!isAllowedContentType(contentType)) {
      throw new Error(
        `Unsupported response content type: ${
          contentType || 'unknown'
        }.`,
      );
    }

    const body =
      await readResponseBodyWithLimit(
        response,
        maxResponseBytes,
      );

    return {
      finalUrl: url.toString(),
      contentType,
      body,
    };
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === 'AbortError'
    ) {
      throw new Error(
        'Property page request timed out.',
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function countExtractedFacts(
  facts: PropertyFacts,
): number {
  return Object.values(facts).filter(
    (value) =>
      value !== null &&
      value !== undefined &&
      value !== '',
  ).length;
}

function hasMinimumPropertyEvidence(
  facts: PropertyFacts,
): boolean {
  const identityFields = [
    facts.title,
    facts.address,
    facts.propertyType,
  ];

  const physicalOrCommercialFields = [
    facts.askingPriceCents,
    facts.bedrooms,
    facts.bathrooms,
    facts.floorSizeM2,
    facts.landSizeM2,
  ];

  const hasIdentity = identityFields.some(
    (value) =>
      value !== null &&
      value !== undefined &&
      value !== '',
  );

  const hasPhysicalOrCommercialData =
    physicalOrCommercialFields.some(
      (value) =>
        value !== null &&
        value !== undefined,
    );

  return (
    hasIdentity &&
    hasPhysicalOrCommercialData
  );
}

function parseMetaAttributes(
  body: string,
): {
  facts: PropertyFacts;
  evidence: PropertyEvidence[];
} {
  const facts = emptyFacts();
  const evidence: PropertyEvidence[] = [];

  const metaPattern = /<meta\b[^>]*>/gi;
  const tags = body.match(metaPattern) ?? [];

  for (const tag of tags) {
    const nameMatch = tag.match(
      /\b(?:name|property)\s*=\s*["']([^"']+)["']/i,
    );

    const contentMatch = tag.match(
      /\bcontent\s*=\s*["']([^"']*)["']/i,
    );

    if (!nameMatch || !contentMatch) {
      continue;
    }

    const name = nameMatch[1]
      .toLowerCase()
      .trim();

    const content = contentMatch[1].trim();

    if (!content) {
      continue;
    }

    if (
      name === 'og:title' ||
      name === 'twitter:title'
    ) {
      if (!facts.title) {
        facts.title = content;

        evidence.push({
          field: 'title',
          value: content,
          source: 'open_graph',
        });
      }
    }

    if (
      name === 'og:street-address' ||
      name === 'property:street_address'
    ) {
      if (!facts.address) {
        facts.address = content;

        evidence.push({
          field: 'address',
          value: content,
          source:
            name.startsWith('og:')
              ? 'open_graph'
              : 'meta',
        });
      }
    }
  }

  return {
    facts,
    evidence,
  };
}

function parseVisibleTitle(
  body: string,
): {
  facts: PropertyFacts;
  evidence: PropertyEvidence[];
} {
  const facts = emptyFacts();
  const evidence: PropertyEvidence[] = [];

  const titleMatch = body.match(
    /<title\b[^>]*>([\s\S]*?)<\/title>/i,
  );

  if (!titleMatch) {
    return {
      facts,
      evidence,
    };
  }

  const title = titleMatch[1]
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!title) {
    return {
      facts,
      evidence,
    };
  }

  facts.title = title;

  evidence.push({
    field: 'title',
    value: title,
    source: 'html',
  });

  return {
    facts,
    evidence,
  };
}

function parseFallbackFacts(
  body: string,
): {
  facts: PropertyFacts;
  evidence: PropertyEvidence[];
} {
  const meta = parseMetaAttributes(body);
  const title = parseVisibleTitle(body);

  const facts = mergeFacts(
    emptyFacts(),
    meta.facts,
    title.facts,
  );

  const evidence = mergeEvidence(
    [],
    meta.evidence,
    title.evidence,
  );

  return {
    facts,
    evidence,
  };
}

export async function extractPropertyFromUrl(
  input: string,
  options: FetchOptions = {},
): Promise<PropertyExtractionResult> {
  const validation =
    validatePropertyInput(input);

  if (!validation.ok) {
    return {
      status: 'unsupported_source',
      facts: emptyFacts(),
      evidence: [],
      source: validation.source ?? 'unknown',
      sourceUrl: validation.normalizedInput,
      errors: [
        validation.errorMessage ??
          'Invalid property input.',
      ],
    };
  }

  if (
    validation.kind === 'address' ||
    validation.source === 'address_only'
  ) {
    return {
      status: 'unsupported_source',
      facts: emptyFacts(),
      evidence: [],
      source: 'address_only',
      sourceUrl: validation.normalizedInput,
      errors: [
        'Direct address verification requires a trusted property or geospatial data source.',
      ],
    };
  }

  const source =
    validation.source ?? 'unknown';

  const sourceUrl =
    validation.normalizedInput;

  try {
    const fetched = await fetchPage(
      sourceUrl,
      options,
    );

    const jsonLdBlocks =
      extractJsonLdBlocks(fetched.body);

    const jsonLd = {
      facts: emptyFacts(),
      evidence: [] as PropertyEvidence[],
    };

    for (const block of jsonLdBlocks) {
      const parsed = extractJsonLdFacts(block);

      mergeFacts(jsonLd.facts, parsed.facts);
      mergeEvidence(jsonLd.evidence, parsed.evidence);
    }

    const fallback =
      parseFallbackFacts(fetched.body);

    const facts = mergeFacts(
      emptyFacts(),
      jsonLd.facts,
      fallback.facts,
    );

    const evidence = mergeEvidence(
      [],
      jsonLd.evidence,
      fallback.evidence,
    );

    const factCount =
      countExtractedFacts(facts);

    if (
      factCount === 0 ||
      !hasMinimumPropertyEvidence(facts)
    ) {
      return {
        status: 'insufficient_data',
        facts,
        evidence,
        source,
        sourceUrl: fetched.finalUrl,
        errors: [
          'The page was fetched successfully, but insufficient property facts were found to safely generate a score.',
        ],
      };
    }

    return {
      status: 'extracted',
      facts,
      evidence,
      source,
      sourceUrl: fetched.finalUrl,
      errors: [],
    };
  } catch (error) {
    return {
      status: 'extraction_failed',
      facts: emptyFacts(),
      evidence: [],
      source,
      sourceUrl,
      errors: [
        error instanceof Error
          ? error.message
          : 'Property extraction failed.',
      ],
    };
  }
}
