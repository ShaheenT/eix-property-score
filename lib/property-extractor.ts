import { validatePropertyInput } from '@/lib/property-input';
import {
  extractJsonLdFacts,
  mergeFacts,
  mergeEvidence,
} from '@/lib/property-parser';
import type { PropertyEvidence, PropertyFacts } from '@/lib/property-types';
import { parseProperty24CompleteSections } from '@/lib/property24-complete-parser';

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
  garages: null,
  parking: null,
  hasStudy: null,
  hasPool: null,
  hasGarden: null,
  hasFibre: null,
  hasSolar: null,
  hasBatteryBackup: null,
  leviesCents: null,
  ratesAndTaxesCents: null,
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

function parseProperty24SizeM2(value: string): number | null {
  const normalized = decodeHtmlEntities(value).replace(/,/g, ' ').trim();
  const m2Match = normalized.match(/([0-9][0-9\s]*(?:\.\d+)?)\s*m(?:2|²)\b/i);
  const raw = m2Match?.[1] ?? normalized.match(/[0-9][0-9\s]*(?:\.\d+)?/)?.[0];
  if (!raw) return null;
  const parsed = Number(raw.replace(/\s/g, ''));
  if (!Number.isFinite(parsed) || parsed <= 1) return null;
  return parsed;
}

function extractJsonLdBlocks(body: string): unknown[] {
  const blocks: unknown[] = [];
  const scriptPattern = /<script\b[^>]*type=["']([^"']+)["'][^>]*>([\s\S]*?)<\/script>/gi;

  for (const match of Array.from(body.matchAll(scriptPattern))) {
    const type = match[1]
      .replace(/&#x2b;/gi, '+')
      .replace(/&#43;/gi, '+')
      .replace(/&plus;/gi, '+')
      .trim()
      .toLowerCase();

    if (type !== 'application/ld+json') continue;

    const raw = match[2].trim();
    if (!raw) continue;

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
  ) return true;

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;
  const octets = ipv4.slice(1).map(Number);
  if (octets.some((octet) => octet > 255)) return true;
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
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Unsupported URL protocol.');
  }
  if (parsed.username || parsed.password) {
    throw new Error('Credential-bearing URLs are not allowed.');
  }
  if (isPrivateOrLocalHostname(parsed.hostname)) {
    throw new Error('Private or local network destinations are not allowed.');
  }
  return parsed;
}

function getContentType(response: Response): string {
  return response.headers.get('content-type')?.toLowerCase() ?? '';
}

function isAllowedContentType(contentType: string): boolean {
  if (!contentType) return true;
  return contentType.includes('text/html') || contentType.includes('application/xhtml+xml');
}

async function readResponseBodyWithLimit(response: Response, maxBytes: number): Promise<string> {
  const contentLength = response.headers.get('content-length');
  if (contentLength) {
    const declaredLength = Number(contentLength);
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      throw new Error('Response exceeds the maximum allowed size.');
    }
  }

  if (!response.body) {
    const body = await response.text();
    if (new TextEncoder().encode(body).byteLength > maxBytes) {
      throw new Error('Response exceeds the maximum allowed size.');
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
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new Error('Response exceeds the maximum allowed size.');
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
    return body;
  } finally {
    reader.releaseLock();
  }
}

async function fetchPage(inputUrl: string, options: FetchOptions = {}): Promise<FetchedPage> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_EXTRACTION_TIMEOUT_MS;
  const maxResponseBytes = options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
  const url = validateFetchUrl(inputUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1',
        'User-Agent': EXTRACTION_USER_AGENT,
      },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error('Redirect response has no destination.');
      const redirectUrl = new URL(location, url.toString());
      validateFetchUrl(redirectUrl.toString());
      throw new Error('Redirect destination requires additional validation before following.');
    }
    if (!response.ok) throw new Error(`Property page returned HTTP ${response.status}.`);

    const contentType = getContentType(response);
    if (!isAllowedContentType(contentType)) {
      throw new Error(`Unsupported response content type: ${contentType || 'unknown'}.`);
    }

    const body = await readResponseBodyWithLimit(response, maxResponseBytes);
    return { finalUrl: url.toString(), contentType, body };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Property page request timed out.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function countExtractedFacts(facts: PropertyFacts): number {
  return Object.values(facts).filter((value) => value !== null && value !== undefined && value !== '').length;
}

function hasMinimumPropertyEvidence(facts: PropertyFacts): boolean {
  const identityFields = [facts.title, facts.address, facts.propertyType];
  const physicalOrCommercialFields = [facts.askingPriceCents, facts.bedrooms, facts.bathrooms, facts.floorSizeM2, facts.landSizeM2];
  const hasIdentity = identityFields.some((value) => value !== null && value !== undefined && value !== '');
  const hasPhysicalOrCommercialData = physicalOrCommercialFields.some((value) => value !== null && value !== undefined);
  return hasIdentity && hasPhysicalOrCommercialData;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#160;/gi, ' ')
    .replace(/&#xB2;/gi, '²')
    .replace(/&#178;/gi, '²')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseRandCents(value: string): number | null {
  const cleaned = decodeHtmlEntities(value).replace(/[^\d.-]/g, '');
  if (!cleaned) return null;
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

function parsePositiveInteger(value: string): number | null {
  const cleaned = decodeHtmlEntities(value).replace(/[^\d]/g, '');
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function getProperty24City(sourceUrl: string): string | null {
  try {
    const url = new URL(sourceUrl);

    const segments = url.pathname
      .split('/')
      .map((segment) => decodeURIComponent(segment))
      .filter(Boolean);

    const forSaleIndex = segments.findIndex(
      (segment) => segment.toLowerCase() === 'for-sale',
    );

    if (forSaleIndex === -1 || segments.length < forSaleIndex + 6) {
      return null;
    }

    const city = segments[forSaleIndex + 2];

    if (!city) {
      return null;
    }

    return city
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  } catch {
    return null;
  }
}

function extractProperty24ListingId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/(\d+)\/?$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function hasMatchingProperty24Listing(body: string, listingId: string): boolean {
  const escaped = listingId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`data-listingnumber\\s*=\\s*["']${escaped}["']`, 'i'),
    new RegExp(`listing(?:Number|number)\\s*[:=]\\s*["']?${escaped}["']?`, 'i'),
    new RegExp(`Listing Number\\s*${escaped}`, 'i'),
    new RegExp(`P24-${escaped}\\b`, 'i'),
  ];
  return patterns.some((pattern) => pattern.test(body));
}

function parseProperty24Overview(
  body: string,
): { facts: PropertyFacts; evidence: PropertyEvidence[] } {
  const facts = emptyFacts();
  const evidence: PropertyEvidence[] = [];
  const rowStart = /<div\b[^>]*class=["'][^"']*\bp24_propertyOverviewRow\b[^"']*["'][^>]*>/gi;
  const starts = Array.from(body.matchAll(rowStart)).map((match) => match.index ?? -1).filter((index) => index >= 0);

  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index];
    const end = starts[index + 1] ?? body.length;
    const row = body.slice(start, end);

    const keyMatch = row.match(
      /<div\b[^>]*class=["'][^"']*\bp24_propertyOverviewKey\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    );
    const valueMatch = row.match(
      /<div\b[^>]*class=["'][^"']*\bp24_propertyOverviewResult\b[^"']*["'][^>]*>[\s\S]*?<div\b[^>]*class=["'][^"']*\bp24_info\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    );

    if (!keyMatch || !valueMatch) continue;

    const key = decodeHtmlEntities(keyMatch[1]).toLowerCase();
    const value = decodeHtmlEntities(valueMatch[1]);
    if (!value) continue;

    if (key === 'erf size') {
      const landSizeM2 = parseProperty24SizeM2(value);
      if (landSizeM2 !== null && facts.landSizeM2 === null) {
        facts.landSizeM2 = landSizeM2;
        evidence.push({ field: 'landSizeM2', value, source: 'html' });
      }
    } else if (key === 'levies') {
      const cents = parseRandCents(value);
      if (cents !== null && facts.leviesCents === null) {
        facts.leviesCents = cents;
        evidence.push({ field: 'leviesCents', value, source: 'html' });
      }
    } else if (key === 'rates and taxes') {
      const cents = parseRandCents(value);
      if (cents !== null && facts.ratesAndTaxesCents === null) {
        facts.ratesAndTaxesCents = cents;
        evidence.push({ field: 'ratesAndTaxesCents', value, source: 'html' });
      }
    } else if (key === 'parking') {
      const parking = parsePositiveInteger(value);
      if (parking !== null && facts.parking === null) {
        facts.parking = parking;
        evidence.push({ field: 'parking', value, source: 'html' });
      }
    } else if (key === 'garden') {
      facts.hasGarden = value.toLowerCase() === 'yes';
      evidence.push({ field: 'hasGarden', value, source: 'html' });
    } else if (key === 'pool') {
      facts.hasPool = value.toLowerCase() === 'yes';
      evidence.push({ field: 'hasPool', value, source: 'html' });
    } else if (key === 'solar') {
      facts.hasSolar = true;
      evidence.push({ field: 'hasSolar', value, source: 'html' });
    } else if (key === 'backup power') {
      facts.hasBatteryBackup = true;
      evidence.push({ field: 'hasBatteryBackup', value, source: 'html' });
    } else if (key === 'internet access' && value.toLowerCase().includes('fibre')) {
      facts.hasFibre = true;
      evidence.push({ field: 'hasFibre', value, source: 'html' });
    }
  }

  return { facts, evidence };
}

function parseProperty24KeyFeatures(
  body: string,
): { facts: PropertyFacts; evidence: PropertyEvidence[] } {
  const facts = emptyFacts();
  const evidence: PropertyEvidence[] = [];
  const marker = /<div\b[^>]*class=["'][^"']*\bp24_listingFeatures\b[^"']*["'][^>]*>/gi;
  const starts = Array.from(body.matchAll(marker)).map((match) => match.index ?? -1).filter((index) => index >= 0);

  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index];
    const end = starts[index + 1] ?? body.length;
    const block = body.slice(start, end);

    const labelMatch = block.match(
      /<span\b[^>]*class=["'][^"']*\bp24_feature\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
    );
    const amountMatch = block.match(
      /<span\b[^>]*class=["'][^"']*\bp24_featureAmount\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
    );
    const iconMatch = block.match(/<img\b[^>]*alt=["']([^"']+)["'][^>]*>/i);

    const label = labelMatch
      ? decodeHtmlEntities(labelMatch[1]).replace(/:$/, '').toLowerCase()
      : iconMatch
        ? decodeHtmlEntities(iconMatch[1]).toLowerCase()
        : '';
    const amount = amountMatch ? decodeHtmlEntities(amountMatch[1]) : '';

    if (label === 'bedrooms') {
      const bedrooms = parsePositiveInteger(amount);
      if (bedrooms !== null && facts.bedrooms === null) {
        facts.bedrooms = bedrooms;
        evidence.push({ field: 'bedrooms', value: amount, source: 'html' });
      }
    } else if (label === 'bathrooms') {
      const bathrooms = parsePositiveInteger(amount);
      if (bathrooms !== null && facts.bathrooms === null) {
        facts.bathrooms = bathrooms;
        evidence.push({ field: 'bathrooms', value: amount, source: 'html' });
      }
    } else if (label === 'garages') {
      const garages = parsePositiveInteger(amount);
      if (garages !== null && facts.garages === null) {
        facts.garages = garages;
        evidence.push({ field: 'garages', value: amount, source: 'html' });
      }
    } else if (label === 'parking') {
      const parking = parsePositiveInteger(amount);
      if (parking !== null && facts.parking === null) {
        facts.parking = parking;
        evidence.push({ field: 'parking', value: amount, source: 'html' });
      }
    } else if (label === 'study') {
      facts.hasStudy = true;
      evidence.push({ field: 'hasStudy', value: 'Study', source: 'html' });
    } else if (label === 'pool') {
      facts.hasPool = true;
      evidence.push({ field: 'hasPool', value: 'Pool', source: 'html' });
    } else if (label === 'garden') {
      facts.hasGarden = true;
      evidence.push({ field: 'hasGarden', value: 'Garden', source: 'html' });
    } else if (label.includes('fibre')) {
      facts.hasFibre = true;
      evidence.push({ field: 'hasFibre', value: 'Fibre Internet', source: 'html' });
    } else if (label.includes('solar')) {
      facts.hasSolar = true;
      evidence.push({ field: 'hasSolar', value: 'Solar Panels', source: 'html' });
    } else if (label.includes('backup battery') || label.includes('backup power')) {
      facts.hasBatteryBackup = true;
      evidence.push({ field: 'hasBatteryBackup', value: 'Backup Battery / Inverter', source: 'html' });
    }
  }

  return { facts, evidence };
}

function parseProperty24LabeledOverview(
  body: string,
): { facts: PropertyFacts; evidence: PropertyEvidence[] } {
  const facts = emptyFacts();
  const evidence: PropertyEvidence[] = [];
  const text = decodeHtmlEntities(body);

  const add = <K extends keyof PropertyFacts>(
    field: K,
    value: Exclude<PropertyFacts[K], null>,
    raw: string,
  ) => {
    if (facts[field] !== null && facts[field] !== undefined) return;
    facts[field] = value;
    evidence.push({ field, value: raw, source: 'html' });
  };

  const address = text.match(/\bStreet Address\s+(.+?)\s+(?=Listing Date\b)/i);
  if (address?.[1]) add('address', address[1].trim(), address[1].trim());

  const floorSize = text.match(/\bFloor Size\s*[:\-]?\s*([0-9][0-9\s,]*(?:\.\d+)?)\s*m(?:2|²)\b/i);
  if (floorSize?.[1]) {
    const parsed = parseProperty24SizeM2(floorSize[1]);
    if (parsed !== null) add('floorSizeM2', parsed, floorSize[0]);
  }

  const landSize = text.match(/\bErf Size\s*[:\-]?\s*([0-9][0-9\s,]*(?:\.\d+)?)\s*m(?:2|²)\b/i);
  if (landSize?.[1]) {
    const parsed = parseProperty24SizeM2(landSize[1]);
    if (parsed !== null) add('landSizeM2', parsed, landSize[0]);
  }

  const rates = text.match(/\bRates and Taxes\s*[:\-]?\s*R\s*([0-9][0-9\s,]*(?:\.\d+)?)\b/i);
  if (rates?.[1]) {
    const cents = parseRandCents(rates[1]);
    if (cents !== null) add('ratesAndTaxesCents', cents, rates[0]);
  }

  const parking = text.match(/\bParking\s*[:\-]?\s*([0-9]+)\b/i);
  if (parking?.[1]) {
    const parsed = parsePositiveInteger(parking[1]);
    if (parsed !== null) add('parking', parsed, parking[0]);
  }

  return { facts, evidence };
}

function parseProperty24Heading(body: string): { facts: PropertyFacts; evidence: PropertyEvidence[] } {
  const facts = emptyFacts();
  const evidence: PropertyEvidence[] = [];
  const candidates = [
    /<h1\b[^>]*>([\s\S]*?)<\/h1>/i,
    /<div\b[^>]*class=["'][^"']*p24_listingTitle[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  ];
  for (const pattern of candidates) {
    const match = body.match(pattern);
    if (!match) continue;
    const title = decodeHtmlEntities(match[1]);
    if (!title || title.length > 180 || /window\.loader|addCallback|renderComponent|bond calculator/i.test(title)) continue;
    facts.title = title;
    evidence.push({ field: 'title', value: title, source: 'html' });
    break;
  }
  return { facts, evidence };
}

function parseProperty24Facts(
  body: string,
  sourceUrl: string,
): { facts: PropertyFacts; evidence: PropertyEvidence[] } {
  const listingId = extractProperty24ListingId(sourceUrl);
  if (!listingId || !hasMatchingProperty24Listing(body, listingId)) {
    return { facts: emptyFacts(), evidence: [] };
  }

  const overview = parseProperty24Overview(body);
  const labeledOverview = parseProperty24LabeledOverview(body);
  const keyFeatures = parseProperty24KeyFeatures(body);
  const heading = parseProperty24Heading(body);
  const complete = parseProperty24CompleteSections(body);

  return {
    facts: mergeFacts(
      emptyFacts(),
      overview.facts,
      labeledOverview.facts,
      keyFeatures.facts,
      heading.facts,
      complete.facts,
    ),
    evidence: mergeEvidence(
      [],
      overview.evidence,
      labeledOverview.evidence,
      keyFeatures.evidence,
      heading.evidence,
      complete.evidence,
    ),
  };
}

function parseMetaAttributes(body: string): { facts: PropertyFacts; evidence: PropertyEvidence[] } {
  const facts = emptyFacts();
  const evidence: PropertyEvidence[] = [];
  const metaPattern = /<meta\b[^>]*>/gi;
  const tags = body.match(metaPattern) ?? [];

  for (const tag of tags) {
    const nameMatch = tag.match(/\b(?:name|property)\s*=\s*["']([^"']+)["']/i);
    const contentMatch = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i);
    if (!nameMatch || !contentMatch) continue;
    const name = nameMatch[1].toLowerCase().trim();
    const content = contentMatch[1].trim();
    if (!content) continue;

    if (name === 'og:title' || name === 'twitter:title') {
      if (!facts.title && !/property24/i.test(content)) {
        facts.title = content;
        evidence.push({ field: 'title', value: content, source: 'open_graph' });
      }
    }
    if (name === 'og:image' || name === 'twitter:image') {
      if (!facts.primaryImageUrl && /^https?:\/\//i.test(content)) {
        facts.primaryImageUrl = content;
        evidence.push({ field: 'primaryImageUrl', value: content, source: 'open_graph' });
      }
    }
    if (name === 'og:street-address' || name === 'property:street_address') {
      if (!facts.address) {
        facts.address = content;
        evidence.push({ field: 'address', value: content, source: name.startsWith('og:') ? 'open_graph' : 'meta' });
      }
    }
  }
  return { facts, evidence };
}

function parseVisibleTitle(body: string): { facts: PropertyFacts; evidence: PropertyEvidence[] } {
  const facts = emptyFacts();
  const evidence: PropertyEvidence[] = [];
  const titleMatch = body.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (!titleMatch) return { facts, evidence };

  const title = decodeHtmlEntities(titleMatch[1]);
  if (!title) return { facts, evidence };

  // Property portals can return client-rendered script/component payloads as
  // document-title content. Never persist page chrome as the property title.
  const looksLikePageChrome =
    title.length > 180 ||
    /window\.loader|addCallback|renderComponent|googletag|<script|function\s*\(/i.test(title) ||
    /resetPasswordUrl|listingSendAgentAMessageActionUrl|bond calculator|tell us what you think/i.test(title);

  if (looksLikePageChrome) return { facts, evidence };

  facts.title = title;
  evidence.push({ field: 'title', value: title, source: 'html' });
  return { facts, evidence };
}


function parsePrivatePropertyFacts(
  body: string,
  sourceUrl: string,
): { facts: PropertyFacts; evidence: PropertyEvidence[] } {
  const facts = emptyFacts();
  const evidence: PropertyEvidence[] = [];

  try {
    const hostname = new URL(sourceUrl).hostname.toLowerCase();
    if (hostname !== "privateproperty.co.za" && hostname.endsWith(".privateproperty.co.za") === false) {
      return { facts, evidence };
    }
  } catch {
    return { facts, evidence };
  }

  const text = decodeHtmlEntities(body);

  const addString = (
    field: keyof PropertyFacts,
    value: string | null,
  ) => {
    if (!value || facts[field] !== null) return;
    facts[field] = value as never;
    evidence.push({ field, value, source: 'html' });
  };

  const addNumber = (
    field: keyof PropertyFacts,
    value: number | null,
    raw: string,
  ) => {
    if (value === null || facts[field] !== null) return;
    facts[field] = value as never;
    evidence.push({ field, value: raw, source: 'html' });
  };

  const priceElementMatch = body.match(/<div\b[^>]*class=[\"'][^\"']*\blisting-price-display__price\b[^\"']*[\"'][^>]*>([\s\S]*?)<\/div>/i);
  if (priceElementMatch) {
    const priceText = decodeHtmlEntities(priceElementMatch[1]).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const currencyMatch = priceText.match(/\bR\s*([\d\s\u00a0]+(?:[.,]\d{2})?)/i);
    const price = currencyMatch ? parseRandCents(currencyMatch[1]) : null;
    addNumber('askingPriceCents', price, priceText);
  }

  const titleMatch = body.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (titleMatch) {
    const title = decodeHtmlEntities(titleMatch[1]);
    addString('title', title);
  }

  const propertyTypeMatch = text.match(/\bProperty type\s+(House|Apartment|Townhouse|Duplex|Farm|Land|Vacant Land|Commercial)\b/i);
  if (propertyTypeMatch) {
    addString('propertyType', propertyTypeMatch[1]);
  } else {
    const houseTitleMatch = text.match(/\b\d+\s+Bedroom\s+(House|Apartment|Townhouse|Duplex)\b/i);
    if (houseTitleMatch) addString('propertyType', houseTitleMatch[1]);
  }

  const landDetailsMatch = body.match(
    /Land size\s*<span\b[^>]*class=[\"'][^\"']*property-details__value[^\"']*[\"'][^>]*>([\s\S]*?)<\/span>/i,
  );

  const landMatch =
    landDetailsMatch ??
    text.match(/\bLand size\s+([\d\s.,]+)\s*m(?:2|\u00b2)\b/i);

  if (landMatch) {
    const rawLandSize = landMatch[1];
    const normalizedLandSize = decodeHtmlEntities(rawLandSize)
      .replace(/[^\d.,]/g, '')
      .replace(/,/g, '');

    const landSize = Number(normalizedLandSize);

    if (
      Number.isFinite(landSize) &&
      landSize > 1 &&
      facts.landSizeM2 === null
    ) {
      facts.landSizeM2 = landSize;
      evidence.push({
        field: 'landSizeM2',
        value: rawLandSize,
        source: 'html',
      });
    }
  }

  const floorDetailsMatch = body.match(
    /Floor size\s*<span\b[^>]*class=[\"'][^\"']*property-details__value[^\"']*[\"'][^>]*>([\s\S]*?)<\/span>/i,
  );

  const floorMatch =
    floorDetailsMatch ??
    text.match(/\bFloor size\s+([\d\s.,]+)\s*m(?:2|\u00b2)\b/i);

  if (floorMatch) {
    const rawFloorSize = floorMatch[1];
    const normalizedFloorSize = decodeHtmlEntities(rawFloorSize)
      .replace(/[^\d.,]/g, '')
      .replace(/,/g, '');

    const floorSize = Number(normalizedFloorSize);

    if (
      Number.isFinite(floorSize) &&
      floorSize > 1 &&
      facts.floorSizeM2 === null
    ) {
      facts.floorSizeM2 = floorSize;
      evidence.push({
        field: 'floorSizeM2',
        value: rawFloorSize,
        source: 'html',
      });
    }
  }

  const bedroomsMatch = text.match(/\bBedrooms\s+(\d+)\b/i);
  if (bedroomsMatch) {
    addNumber('bedrooms', Number(bedroomsMatch[1]), bedroomsMatch[0]);
  }

  const bathroomsMatch = text.match(/\bBathrooms\s+(\d+(?:[.,]\d+)?)\b/i);
  if (bathroomsMatch) {
    const bathrooms = Number(bathroomsMatch[1].replace(',', '.'));
    if (Number.isFinite(bathrooms)) {
      addNumber('bathrooms', bathrooms, bathroomsMatch[0]);
    }
  }

  const garagesMatch = text.match(/\bGarage parking\s+(\d+)\b/i);
  if (garagesMatch) {
    addNumber('garages', Number(garagesMatch[1]), garagesMatch[0]);
  }

  const openParkingMatch = text.match(/\bOpen parking\s+(\d+)\b/i);
  if (openParkingMatch) {
    addNumber('parking', Number(openParkingMatch[1]), openParkingMatch[0]);
  }

  if (/\b(?:Property features|Included house features|BASEMENT|GROUND FLOOR)[\s\S]*?\bStudy\b/i.test(text)) {
    facts.hasStudy = true;
    evidence.push({ field: 'hasStudy', value: 'Study', source: 'html' });
  }

  if (/\bProperty features[\s\S]*?\bPool\b/i.test(text) || /\bSwimming Pool\b/i.test(text)) {
    facts.hasPool = true;
    evidence.push({ field: 'hasPool', value: 'Pool', source: 'html' });
  }

  if (/\bProperty features[\s\S]*?\bGarden\b/i.test(text) || /\bExternal Beams in Garden\b/i.test(text)) {
    facts.hasGarden = true;
    evidence.push({ field: 'hasGarden', value: 'Garden', source: 'html' });
  }

  if (/\b(?:Fibre|Fiber)\b/i.test(text)) {
    facts.hasFibre = true;
    evidence.push({ field: 'hasFibre', value: 'Fibre', source: 'html' });
  }

  if (/\b(?:Solar|PV Solar|Solar System)\b/i.test(text)) {
    facts.hasSolar = true;
    evidence.push({ field: 'hasSolar', value: 'Solar / PV system', source: 'html' });
  }

  if (/\b(?:Lithium Battery|Backup Power|Inverter)\b/i.test(text)) {
    facts.hasBatteryBackup = true;
    evidence.push({ field: 'hasBatteryBackup', value: 'Inverter / lithium battery', source: 'html' });
  }

  try {
    const url = new URL(sourceUrl);
    const segments = url.pathname
      .split('/')
      .map((segment) => decodeURIComponent(segment))
      .filter(Boolean);

    const forSaleIndex = segments.findIndex(
      (segment) => segment.toLowerCase() === 'for-sale',
    );

    if (forSaleIndex >= 0) {
      const province = segments[forSaleIndex + 1];
      const city = segments[forSaleIndex + 2];
      const suburb = segments[forSaleIndex + 5];

      if (province) {
        addString(
          'province',
          province.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        );
      }

      if (city) {
        addString(
          'city',
          city.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        );
      }

      if (suburb) {
        addString(
          'suburb',
          suburb.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        );
      }
    }
  } catch {
    // URL location parsing is supplementary evidence only.
  }

  return { facts, evidence };
}

function parseFallbackFacts(body: string, sourceUrl: string): { facts: PropertyFacts; evidence: PropertyEvidence[] } {
  const meta = parseMetaAttributes(body);
  const title = parseVisibleTitle(body);
  const property24 = parseProperty24Facts(body, sourceUrl);
  const privateProperty = parsePrivatePropertyFacts(body, sourceUrl);

  return {
    facts: mergeFacts(
      emptyFacts(),
      meta.facts,
      title.facts,
      property24.facts,
      privateProperty.facts,
    ),
    evidence: mergeEvidence(
      [],
      meta.evidence,
      title.evidence,
      property24.evidence,
      privateProperty.evidence,
    ),
  };
}

export async function extractPropertyFromUrl(input: string, options: FetchOptions = {}): Promise<PropertyExtractionResult> {
  const validation = validatePropertyInput(input);
  if (!validation.ok) {
    return {
      status: 'unsupported_source', facts: emptyFacts(), evidence: [],
      source: validation.source ?? 'unknown', sourceUrl: validation.normalizedInput,
      errors: [validation.errorMessage ?? 'Invalid property input.'],
    };
  }

  if (validation.kind === 'address' || validation.source === 'address_only') {
    return {
      status: 'unsupported_source', facts: emptyFacts(), evidence: [],
      source: 'address_only', sourceUrl: validation.normalizedInput,
      errors: ['Direct address verification requires a trusted property or geospatial data source.'],
    };
  }

  const source = validation.source ?? 'unknown';
  const sourceUrl = validation.normalizedInput;

  try {
    const fetched = await fetchPage(sourceUrl, options);
    const jsonLdBlocks = extractJsonLdBlocks(fetched.body);
    const jsonLd = { facts: emptyFacts(), evidence: [] as PropertyEvidence[] };

    for (const block of jsonLdBlocks) {
      const parsed = extractJsonLdFacts(block);
      mergeFacts(jsonLd.facts, parsed.facts);
      mergeEvidence(jsonLd.evidence, parsed.evidence);
    }

    const fallback = parseFallbackFacts(fetched.body, fetched.finalUrl);

    if (source === 'property24' && !jsonLd.facts.city) {
      const property24City = getProperty24City(fetched.finalUrl);

      if (property24City) {
        jsonLd.facts.city = property24City;
        jsonLd.evidence.push({
          field: 'city',
          value: property24City,
          source: 'html',
        });
      }
    }
    // Property24's visible listing summary / overview is the bounded source evidence
    // for listing-specific physical facts. Structured metadata can conflict with it
    // (e.g. bathrooms), so do not let JSON-LD silently override the listing page.
    const facts =
      source === 'private_property'
        ? mergeFacts(emptyFacts(), fallback.facts, jsonLd.facts)
        : mergeFacts(emptyFacts(), fallback.facts, jsonLd.facts);

    const evidence =
      source === 'private_property'
        ? mergeEvidence([], fallback.evidence, jsonLd.evidence)
        : mergeEvidence([], fallback.evidence, jsonLd.evidence);
    const factCount = countExtractedFacts(facts);

    if (factCount === 0 || !hasMinimumPropertyEvidence(facts)) {
      return {
        status: 'insufficient_data', facts, evidence, source,
        sourceUrl: fetched.finalUrl,
        errors: ['The page was fetched successfully, but insufficient property facts were found to safely generate a score.'],
      };
    }

    return { status: 'extracted', facts, evidence, source, sourceUrl: fetched.finalUrl, errors: [] };
  } catch (error) {
    return {
      status: 'extraction_failed', facts: emptyFacts(), evidence: [], source, sourceUrl,
      errors: [error instanceof Error ? error.message : 'Property extraction failed.'],
    };
  }
}
