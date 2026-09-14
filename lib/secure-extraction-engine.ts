import dns from 'node:dns/promises';
import net from 'node:net';
import type { PropertyExtractionResult } from '@/lib/property-extractor';
import type { PropertyEvidence, PropertyFacts } from '@/lib/property-types';

export type SupportedSource =
  | 'property24'
  | 'private_property'
  | 'rawson'
  | 'pam_golding'
  | 'seeff'
  | 'remax'
  | 'harcourts'
  | 'century21'
  | 'jawitz';

export type PageType =
  | 'property_listing'
  | 'property_search'
  | 'agency_home'
  | 'agent_profile'
  | 'error_page'
  | 'unknown';

export type EvidenceStatus =
  | 'verified'
  | 'supported'
  | 'conflict'
  | 'missing'
  | 'not_applicable'
  | 'unavailable';

export interface EvidenceItem extends PropertyEvidence {
  status: EvidenceStatus;
  retrievalMethod: 'json_ld' | 'meta' | 'html' | 'legacy_adapter';
  sourceUrl: string;
}

export interface PropertyConflict {
  field: string;
  values: Array<{ value: string | number | boolean; source: string }>;
  resolution: 'unresolved' | 'page_evidence' | 'structured_data' | 'source_adapter';
}

export interface SecureExtractionMetadata {
  canonicalUrl: string;
  source: SupportedSource;
  pageType: PageType;
  listingId: string | null;
  propertyIdentityVerified: boolean;
  reportEligible: boolean;
  evidenceCompleteness: number;
  conflicts: PropertyConflict[];
  security: {
    https: boolean;
    allowlistedHost: boolean;
    privateNetworkBlocked: boolean;
    redirectsValidated: boolean;
  };
}

export interface SecureExtractionResult extends PropertyExtractionResult {
  metadata?: SecureExtractionMetadata;
  evidence: EvidenceItem[];
}

interface SourceDefinition {
  source: SupportedSource;
  label: string;
  hosts: string[];
  listingPatterns: RegExp[];
  searchPatterns: RegExp[];
}

const SOURCES: SourceDefinition[] = [
  { source: 'property24', label: 'Property24', hosts: ['property24.com', 'www.property24.com'], listingPatterns: [/\/for-sale\/.+\/\d+\/\d+\/?$/i], searchPatterns: [/\/property-search/i, /\/for-sale\/?$/i] },
  { source: 'private_property', label: 'Private Property', hosts: ['privateproperty.co.za', 'www.privateproperty.co.za'], listingPatterns: [/\/for-sale\/.+\/T\d+/i], searchPatterns: [/\/property-search/i, /\/for-sale\/[^/]+\/?$/i] },
  { source: 'rawson', label: 'Rawson', hosts: ['rawson.co.za', 'www.rawson.co.za'], listingPatterns: [/\/property\/for-sale\/.+\/\d+\/?$/i], searchPatterns: [/\/property\/for-sale\/?$/i] },
  { source: 'pam_golding', label: 'Pam Golding', hosts: ['pamgolding.co.za', 'www.pamgolding.co.za'], listingPatterns: [/\/property-details\/.+/i], searchPatterns: [/\/property-search\//i] },
  { source: 'seeff', label: 'Seeff', hosts: ['seeff.com', 'www.seeff.com'], listingPatterns: [/\/results\/residential\/for-sale\/.+/i], searchPatterns: [/\/results\/residential\/for-sale\/?$/i] },
  { source: 'remax', label: 'RE/MAX', hosts: ['remax.co.za', 'www.remax.co.za'], listingPatterns: [/\/property-for-sale-south-africa\/.+/i], searchPatterns: [/\/property-for-sale-south-africa\/?$/i] },
  { source: 'harcourts', label: 'Harcourts', hosts: ['harcourts.co.za', 'www.harcourts.co.za'], listingPatterns: [/\/results\/residential\/for-sale\/.+/i], searchPatterns: [/\/results\/residential\/for-sale\/?$/i] },
  { source: 'century21', label: 'Century 21', hosts: ['century21.co.za', 'www.century21.co.za'], listingPatterns: [/\/results\/residential\/for-sale\/.+/i], searchPatterns: [/\/results\/residential\/for-sale\/?$/i] },
  { source: 'jawitz', label: 'Jawitz', hosts: ['jawitz.co.za', 'www.jawitz.co.za', 'm.jawitz.co.za'], listingPatterns: [/\/results\/residential\/for-sale\/.+/i], searchPatterns: [/\/results\/residential\/for-sale\/?$/i] },
];

const TRACKING_KEYS = new Set(['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','gbraid','fbclid','msclkid','_gl','_up','_gs']);
const MAX_URL_LENGTH = 2000;
const MAX_RESPONSE_BYTES = 4_000_000;
const TIMEOUT_MS = 12_000;
const MAX_REDIRECTS = 3;

function emptyFacts(): PropertyFacts {
  return {
    title: null, address: null, suburb: null, city: null, province: null, postalCode: null,
    askingPriceCents: null, bedrooms: null, bathrooms: null, propertyType: null,
    floorSizeM2: null, landSizeM2: null, leviesCents: null, ratesAndTaxesCents: null,
    garages: null, parking: null, hasStudy: null, hasPool: null, hasGarden: null,
    hasFibre: null, hasSolar: null, hasBatteryBackup: null,
  };
}

function hostMatches(hostname: string, allowed: string[]): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  return allowed.some((item) => host === item || host.endsWith(`.${item}`));
}

function isPrivateIp(value: string): boolean {
  const normalized = value.toLowerCase().replace(/^\[|\]$/g, '');
  if (normalized === '::1' || normalized === '0.0.0.0') return true;
  if (net.isIPv4(normalized)) {
    const [a,b] = normalized.split('.').map(Number);
    return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || a >= 224;
  }
  if (net.isIPv6(normalized)) {
    return normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80:') || normalized.startsWith('ff');
  }
  return true;
}

async function assertPublicResolution(hostname: string): Promise<void> {
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) throw new Error('Private or local network destinations are not allowed.');
    return;
  }
  const records = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!records.length || records.some((record) => isPrivateIp(record.address))) {
    throw new Error('Destination resolves to a private, local, multicast, or link-local network.');
  }
}

export function canonicalizeListingUrl(input: string): URL {
  if (typeof input !== 'string' || input.length === 0 || input.length > MAX_URL_LENGTH) throw new Error('Invalid property listing URL.');
  const url = new URL(input);
  if (url.protocol !== 'https:') throw new Error('Only HTTPS property listing URLs are supported.');
  if (url.username || url.password) throw new Error('Credential-bearing URLs are not allowed.');
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) if (TRACKING_KEYS.has(key.toLowerCase())) url.searchParams.delete(key);
  return url;
}

export function identifySource(url: URL): SourceDefinition | null {
  return SOURCES.find((definition) => hostMatches(url.hostname, definition.hosts)) ?? null;
}

export function extractListingId(source: SupportedSource, url: URL): string | null {
  const path = decodeURIComponent(url.pathname);
  const patterns: Record<SupportedSource, RegExp[]> = {
    property24: [/\/(\d+)\/?$/],
    private_property: [\/(T\d+)\/?$/i],
    rawson: [\/(\d+)\/?$/],
    pam_golding: [\/([A-Za-z0-9]+)\/?$/],
    seeff: [\/(\d+)\/?$/],
    remax: [\/(\d+)\/?$/],
    harcourts: [\/(\d+)\/?$/],
    century21: [\/(\d+)\/?$/],
    jawitz: [\/(\d+)\/?$/],
  };
  for (const pattern of patterns[source]) {
    const match = path.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function classifyPage(definition: SourceDefinition, url: URL, body: string, status: number): PageType {
  if (status >= 400) return 'error_page';
  const lower = body.toLowerCase();
  if (definition.searchPatterns.some((pattern) => pattern.test(url.pathname))) return 'property_search';
  if (/property-search|search results|\bresults\b.{0,80}\bproperties\b|\bproperties found\b/i.test(lower) && !definition.listingPatterns.some((pattern) => pattern.test(url.pathname))) return 'property_search';
  if (/agent profile|estate agent profile|our agents/i.test(lower) && !definition.listingPatterns.some((pattern) => pattern.test(url.pathname))) return 'agent_profile';
  if (definition.listingPatterns.some((pattern) => pattern.test(url.pathname))) return 'property_listing';
  if (/property details|for sale|bedroom|bathroom|asking price/i.test(lower)) return 'property_listing';
  if (/\b404\b|page not found|listing not found/i.test(lower)) return 'error_page';
  return 'unknown';
}

async function fetchTrustedPage(initial: URL, definition: SourceDefinition): Promise<{ url: URL; body: string; status: number; redirectsValidated: boolean }> {
  let current = initial;
  let redirects = 0;
  while (true) {
    if (!hostMatches(current.hostname, definition.hosts)) throw new Error('Redirect left the trusted source domain.');
    await assertPublicResolution(current.hostname);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(current.toString(), {
        method: 'GET', redirect: 'manual', signal: controller.signal,
        headers: {
          Accept: 'text/html,application/xhtml+xml;q=0.9',
          'User-Agent': 'EiXPropScore/2.0 (+https://eix-property-score-beta.vercel.app)',
        },
      });
      if (response.status >= 300 && response.status < 400) {
        if (++redirects > MAX_REDIRECTS) throw new Error('Too many redirects.');
        const location = response.headers.get('location');
        if (!location) throw new Error('Redirect response has no destination.');
        const next = canonicalizeListingUrl(new URL(location, current).toString());
        if (!identifySource(next) || !hostMatches(next.hostname, definition.hosts)) throw new Error('Redirect destination is not an allowed listing source.');
        current = next;
        continue;
      }
      const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) throw new Error(`Unsupported response content type: ${contentType || 'unknown'}.`);
      const declared = Number(response.headers.get('content-length') ?? '0');
      if (declared > MAX_RESPONSE_BYTES) throw new Error('Response exceeds the maximum allowed size.');
      if (!response.body) throw new Error('Response body unavailable.');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let body = '';
      let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_RESPONSE_BYTES) { await reader.cancel(); throw new Error('Response exceeds the maximum allowed size.'); }
        body += decoder.decode(value, { stream: true });
      }
      body += decoder.decode();
      return { url: current, body, status: response.status, redirectsValidated: redirects > 0 };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw new Error('Property page request timed out.');
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function decodeHtml(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/&#x27;/gi, "'").replace(/\s+/g, ' ').trim();
}

function jsonLdBlocks(body: string): unknown[] {
  const results: unknown[] = [];
  const pattern = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of body.matchAll(pattern)) {
    try { results.push(JSON.parse(match[1].trim())); } catch { /* malformed third-party JSON-LD is ignored */ }
  }
  return results;
}

function genericEvidence(body: string, sourceUrl: string): { facts: PropertyFacts; evidence: EvidenceItem[] } {
  const facts = emptyFacts();
  const evidence: EvidenceItem[] = [];
  const text = decodeHtml(body);
  const add = (field: keyof PropertyFacts, value: string | number | boolean, raw: string, method: EvidenceItem['retrievalMethod'] = 'html') => {
    if (facts[field] !== null) return;
    facts[field] = value as never;
    evidence.push({ field, value: raw, source: method === 'json_ld' ? 'json_ld' : method === 'meta' ? 'meta' : 'html', status: method === 'json_ld' ? 'verified' : 'supported', retrievalMethod: method, sourceUrl });
  };

  const title = body.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? body.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if (title) add('title', decodeHtml(title), decodeHtml(title));
  const price = text.match(/\bR\s*([0-9][0-9\s,]*(?:\.\d{2})?)\b/);
  if (price) {
    const amount = Number(price[1].replace(/\s/g, '').replace(/,/g, ''));
    if (Number.isFinite(amount) && amount > 0) add('askingPriceCents', Math.round(amount * 100), price[0]);
  }
  const bedroom = text.match(/\b(\d+(?:\.\d+)?)\s*(?:Bedroom|Bedrooms)\b/i);
  if (bedroom) add('bedrooms', Number(bedroom[1]), bedroom[0]);
  const bathroom = text.match(/\b(\d+(?:\.\d+)?)\s*(?:Bathroom|Bathrooms)\b/i);
  if (bathroom) add('bathrooms', Number(bathroom[1]), bathroom[0]);
  const land = text.match(/\b(?:Land|Erf)\s*(?:size)?\s*[:\-]?\s*([0-9][0-9\s,]*(?:\.\d+)?)\s*m(?:2|²)\b/i);
  if (land) add('landSizeM2', Number(land[1].replace(/\s|,/g, '')), land[0]);
  const floor = text.match(/\b(?:Floor|Building|House)\s*(?:size|area)?\s*[:\-]?\s*([0-9][0-9\s,]*(?:\.\d+)?)\s*m(?:2|²)\b/i);
  if (floor) add('floorSizeM2', Number(floor[1].replace(/\s|,/g, '')), floor[0]);
  const propertyType = text.match(/\b(?:Property type|Type)\s*[:\-]?\s*(House|Apartment|Townhouse|Duplex|Farm|Vacant Land|Land|Commercial|Industrial|Mixed Use)\b/i) ?? text.match(/\b\d+(?:\.\d+)?\s+Bedroom\s+(House|Apartment|Townhouse|Duplex|Farm)\b/i);
  if (propertyType) add('propertyType', propertyType[1], propertyType[0]);
  if (/\bsolar\b|photovoltaic|pv system/i.test(text)) add('hasSolar', true, 'Solar/PV');
  if (/\binverter\b|backup power|battery backup|lithium battery/i.test(text)) add('hasBatteryBackup', true, 'Backup power/inverter');
  if (/\bfibre\b|\bfiber\b/i.test(text)) add('hasFibre', true, 'Fibre');
  if (/\bswimming pool\b|\bpool\b/i.test(text)) add('hasPool', true, 'Pool');
  if (/\bgarden\b/i.test(text)) add('hasGarden', true, 'Garden');
  return { facts, evidence };
}

function jsonLdEvidence(block: unknown, sourceUrl: string): { facts: PropertyFacts; evidence: EvidenceItem[] } {
  const facts = emptyFacts();
  const evidence: EvidenceItem[] = [];
  const candidates = Array.isArray(block) ? block : [block];
  const objects = candidates.flatMap((candidate) => candidate && typeof candidate === 'object' && '@graph' in candidate && Array.isArray((candidate as { '@graph'?: unknown[] })['@graph']) ? (candidate as { '@graph': unknown[] })['@graph'] : [candidate]);
  for (const item of objects) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const type = String(obj['@type'] ?? '').toLowerCase();
    if (!/house|apartment|residence|singlefamily|product|offer|realestate/i.test(type)) continue;
    const add = (field: keyof PropertyFacts, value: string | number | boolean) => {
      if (facts[field] !== null && facts[field] !== undefined) return;
      facts[field] = value as never;
      evidence.push({ field, value, source: 'json_ld', status: 'verified', retrievalMethod: 'json_ld', sourceUrl });
    };
    if (typeof obj.name === 'string') add('title', obj.name);
    const address = obj.address;
    if (address && typeof address === 'object') {
      const a = address as Record<string, unknown>;
      if (typeof a.streetAddress === 'string') add('address', a.streetAddress);
      if (typeof a.addressLocality === 'string') add('suburb', a.addressLocality);
      if (typeof a.addressRegion === 'string') add('province', a.addressRegion);
      if (typeof a.postalCode === 'string') add('postalCode', a.postalCode);
    }
    const offers = obj.offers && typeof obj.offers === 'object' ? obj.offers as Record<string, unknown> : obj;
    if (typeof offers.price === 'number' || typeof offers.price === 'string') {
      const amount = Number(offers.price);
      if (Number.isFinite(amount) && amount > 0) add('askingPriceCents', Math.round(amount * 100));
    }
    if (typeof obj.numberOfRooms === 'number') add('bedrooms', obj.numberOfRooms);
    if (typeof obj.numberOfBedrooms === 'number') add('bedrooms', obj.numberOfBedrooms);
    if (typeof obj.numberOfBathroomsTotal === 'number') add('bathrooms', obj.numberOfBathroomsTotal);
    if (typeof obj.floorSize === 'object' && obj.floorSize) {
      const fs = obj.floorSize as Record<string, unknown>;
      const value = Number(fs.value);
      if (Number.isFinite(value) && value > 0) add('floorSizeM2', value);
    }
    if (typeof obj.lotSize === 'object' && obj.lotSize) {
      const ls = obj.lotSize as Record<string, unknown>;
      const value = Number(ls.value);
      if (Number.isFinite(value) && value > 0) add('landSizeM2', value);
    }
    if (typeof obj.additionalType === 'string') add('propertyType', obj.additionalType);
  }
  return { facts, evidence };
}

function mergeFacts(preferred: PropertyFacts, fallback: PropertyFacts): PropertyFacts {
  const result = { ...preferred };
  for (const key of Object.keys(result) as Array<keyof PropertyFacts>) if (result[key] === null || result[key] === undefined || result[key] === '') result[key] = fallback[key];
  return result;
}

function detectConflicts(items: EvidenceItem[]): PropertyConflict[] {
  const grouped = new Map<string, Map<string, string[]>>();
  for (const item of items) {
    const key = String(item.field);
    const value = String(item.value);
    if (!grouped.has(key)) grouped.set(key, new Map());
    const values = grouped.get(key)!;
    if (!values.has(value)) values.set(value, []);
    values.get(value)!.push(item.retrievalMethod);
  }
  return [...grouped.entries()].filter(([, values]) => values.size > 1).map(([field, values]) => ({
    field,
    values: [...values.entries()].map(([value, sources]) => ({ value, source: sources.join(',') })),
    resolution: values.has('structured_data') ? 'structured_data' : 'unresolved',
  }));
}

function completeness(facts: PropertyFacts): number {
  const values = Object.values(facts).filter((value) => value !== null && value !== undefined && value !== '').length;
  return Math.round((values / Object.keys(facts).length) * 100);
}

export async function runSecureExtraction(input: string, options: { legacyExtract?: (url: string) => Promise<PropertyExtractionResult> } = {}): Promise<SecureExtractionResult> {
  let url: URL;
  try { url = canonicalizeListingUrl(input); } catch (error) {
    return { status: 'unsupported_source', facts: emptyFacts(), evidence: [], source: 'unknown', sourceUrl: input, errors: [error instanceof Error ? error.message : 'Invalid URL.'] };
  }
  const definition = identifySource(url);
  if (!definition) return { status: 'unsupported_source', facts: emptyFacts(), evidence: [], source: 'unknown', sourceUrl: url.toString(), errors: ['Unsupported property source.'] };

  try {
    const fetched = await fetchTrustedPage(url, definition);
    const pageType = classifyPage(definition, fetched.url, fetched.body, fetched.status);
    const listingId = extractListingId(definition.source, fetched.url);
    if (pageType !== 'property_listing') {
      return { status: 'insufficient_data', facts: emptyFacts(), evidence: [], source: definition.source, sourceUrl: fetched.url.toString(), errors: [`The supplied URL is a ${pageType.replace(/_/g, ' ')} page, not a specific property listing.`], metadata: { canonicalUrl: fetched.url.toString(), source: definition.source, pageType, listingId, propertyIdentityVerified: false, reportEligible: false, evidenceCompleteness: 0, conflicts: [], security: { https: true, allowlistedHost: true, privateNetworkBlocked: true, redirectsValidated: fetched.redirectsValidated } } };
    }

    let facts = emptyFacts();
    let evidence: EvidenceItem[] = [];
    for (const block of jsonLdBlocks(fetched.body)) {
      const parsed = jsonLdEvidence(block, fetched.url.toString());
      facts = mergeFacts(facts, parsed.facts);
      evidence.push(...parsed.evidence);
    }
    const generic = genericEvidence(fetched.body, fetched.url.toString());
    facts = mergeFacts(facts, generic.facts);
    evidence.push(...generic.evidence);

    if (options.legacyExtract) {
      try {
        const legacy = await options.legacyExtract(fetched.url.toString());
        if (legacy.status === 'extracted') {
          facts = mergeFacts(facts, legacy.facts);
          evidence.push(...legacy.evidence.map((item) => ({ ...item, status: 'supported' as const, retrievalMethod: 'legacy_adapter' as const, sourceUrl: fetched.url.toString() })));
        }
      } catch {
        // Legacy adapters are supplemental. Their failure cannot turn verified evidence into a fake success.
      }
    }

    const conflicts = detectConflicts(evidence);
    const hasIdentity = Boolean(facts.title || facts.address || facts.propertyType || listingId);
    const hasCommercialOrPhysical = facts.askingPriceCents !== null || facts.bedrooms !== null || facts.bathrooms !== null || facts.floorSizeM2 !== null || facts.landSizeM2 !== null;
    const criticalConflict = conflicts.some((conflict) => ['askingPriceCents','bedrooms','bathrooms','propertyType'].includes(conflict.field));
    const reportEligible = hasIdentity && hasCommercialOrPhysical && !criticalConflict;
    const status = reportEligible ? 'extracted' : 'insufficient_data';
    return {
      status, facts, evidence, source: definition.source, sourceUrl: fetched.url.toString(),
      errors: reportEligible ? [] : ['Insufficient or conflicting evidence to safely generate a property report.'],
      metadata: { canonicalUrl: fetched.url.toString(), source: definition.source, pageType, listingId, propertyIdentityVerified: hasIdentity && Boolean(listingId || facts.title), reportEligible, evidenceCompleteness: completeness(facts), conflicts, security: { https: true, allowlistedHost: true, privateNetworkBlocked: true, redirectsValidated: fetched.redirectsValidated } },
    };
  } catch (error) {
    return { status: 'extraction_failed', facts: emptyFacts(), evidence: [], source: definition.source, sourceUrl: url.toString(), errors: [error instanceof Error ? error.message : 'Secure extraction failed.'], metadata: { canonicalUrl: url.toString(), source: definition.source, pageType: 'unknown', listingId: extractListingId(definition.source, url), propertyIdentityVerified: false, reportEligible: false, evidenceCompleteness: 0, conflicts: [], security: { https: true, allowlistedHost: true, privateNetworkBlocked: true, redirectsValidated: false } } };
  }
}

export const EXTRACTION_SOURCE_REGISTRY = SOURCES.map(({ source, label, hosts }) => ({ source, label, hosts: [...hosts] }));
