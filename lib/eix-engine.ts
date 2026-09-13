export type SourceType = 'property24' | 'private_property' | 'agent_website' | 'generic_url' | 'manual';
export type Verdict = 'BUY' | 'NEGOTIATE' | 'INVESTIGATE' | 'AVOID';

export interface CanonicalProperty {
  sourceType: SourceType;
  sourceUrl?: string;
  title?: string;
  address?: string;
  suburb?: string;
  city?: string;
  province?: string;
  country?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  parking?: number;
  floorAreaM2?: number;
  erfAreaM2?: number;
  propertyType?: string;
  description?: string;
  features: string[];
  evidence: Evidence[];
}

export interface Evidence {
  type: string;
  source: string;
  value: string | number | boolean;
  confidence: number;
  observedAt: string;
  notes?: string;
}

export interface Comparable {
  label: string;
  price: number;
  relevance: number;
  rationale: string;
}

export interface ScoreComponent {
  key: string;
  label: string;
  score: number;
  weight: number;
  confidence: number;
  rationale: string;
}

export interface PropertyAnalysis {
  property: CanonicalProperty;
  identity: {
    fingerprint: string;
    normalizedAddress?: string;
  };
  evidenceGraph: Evidence[];
  comparables: Comparable[];
  components: ScoreComponent[];
  score: number;
  confidence: number;
  verdict: Verdict;
  price: {
    asking?: number;
    low?: number;
    high?: number;
    premiumOrDiscountPct?: number;
    signal: 'UNDERPRICED' | 'FAIR' | 'OVERPRICED' | 'INSUFFICIENT_DATA';
  };
  negotiation?: {
    opening?: number;
    target?: number;
    maximum?: number;
    rationale: string;
  };
  nextActions: string[];
}

export interface AnalyzeInput {
  url?: string;
  property?: Partial<CanonicalProperty>;
}

const now = () => new Date().toISOString();

export function detectSource(url?: string): SourceType {
  if (!url) return 'manual';
  const host = new URL(url).hostname.toLowerCase();
  if (host.includes('property24')) return 'property24';
  if (host.includes('privateproperty')) return 'private_property';
  return host.includes('property') || host.includes('estate') || host.includes('realty') ? 'agent_website' : 'generic_url';
}

function cleanText(value?: string | null): string | undefined {
  if (!value) return undefined;
  const text = value.replace(/\\s+/g, ' ').trim();
  return text || undefined;
}

function numberFrom(value?: string | number | null): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (!value) return undefined;
  const digits = String(value).replace(/[^0-9.,-]/g, '').replace(/,/g, '');
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseListingHtml(html: string, url: string): CanonicalProperty {
  const sourceType = detectSource(url);
  const title = cleanText(html.match(/<title[^>]*>([\\s\\S]*?)<\\/title>/i)?.[1]);
  const description = cleanText(html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["']/i)?.[1]);
  const priceMatch = html.match(/(?:R|ZAR)\\s*([0-9][0-9\\s,]*(?:\\.[0-9]+)?)/i);
  const bedrooms = numberFrom(html.match(/(?:bedrooms?|beds?)[^0-9]{0,20}([0-9]{1,2})/i)?.[1]);
  const bathrooms = numberFrom(html.match(/(?:bathrooms?|baths?)[^0-9]{0,20}([0-9]{1,2})/i)?.[1]);
  const floorAreaM2 = numberFrom(html.match(/(?:floor|living|house|building)[^0-9]{0,30}([0-9]{2,5})\\s*m[²2]/i)?.[1]);
  const erfAreaM2 = numberFrom(html.match(/(?:erf|land|plot)[^0-9]{0,30}([0-9]{2,6})\\s*m[²2]/i)?.[1]);
  const address = cleanText(html.match(/(?:address|location)[^>]{0,80}>\\s*([^<]{8,140})</i)?.[1]);
  const jsonLdBlocks = [...html.matchAll(/<script[^>]+type=["']application\\/ld\\+json["'][^>]*>([\\s\\S]*?)<\\/script>/gi)];
  let jsonLd: Record<string, unknown> = {};
  for (const match of jsonLdBlocks) {
    try {
      const parsed = JSON.parse(match[1]);
      const candidates = Array.isArray(parsed) ? parsed : [parsed];
      const property = candidates.find((x) => x && typeof x === 'object' && ('offers' in x || '@type' in x));
      if (property && typeof property === 'object') jsonLd = property as Record<string, unknown>;
    } catch { /* malformed third-party JSON-LD is ignored */ }
  }
  const offers = typeof jsonLd.offers === 'object' && jsonLd.offers ? jsonLd.offers as Record<string, unknown> : {};
  const geo = typeof jsonLd.address === 'object' && jsonLd.address ? jsonLd.address as Record<string, unknown> : {};
  const finalPrice = numberFrom(offers.price as string | number | undefined) ?? numberFrom(priceMatch?.[1]);
  const finalAddress = cleanText(String(jsonLd.address ?? '')) ?? address;
  const features = [bedrooms ? `${bedrooms} bedrooms` : '', bathrooms ? `${bathrooms} bathrooms` : '', floorAreaM2 ? `${floorAreaM2}m² floor area` : '', erfAreaM2 ? `${erfAreaM2}m² erf` : ''].filter(Boolean);
  const evidence: Evidence[] = [];
  const addEvidence = (type: string, value: string | number | undefined, confidence = 0.72) => { if (value !== undefined) evidence.push({ type, source: url, value, confidence, observedAt: now() }); };
  addEvidence('title', title, 0.9); addEvidence('asking_price', finalPrice, 0.72); addEvidence('address', finalAddress, 0.7); addEvidence('bedrooms', bedrooms, 0.7); addEvidence('bathrooms', bathrooms, 0.7); addEvidence('floor_area_m2', floorAreaM2, 0.7); addEvidence('erf_area_m2', erfAreaM2, 0.65);
  return { sourceType, sourceUrl: url, title, address: finalAddress, city: cleanText(String(geo.addressLocality ?? '')) || undefined, province: cleanText(String(geo.addressRegion ?? '')) || undefined, country: cleanText(String(geo.addressCountry ?? '')) || 'South Africa', price: finalPrice, bedrooms, bathrooms, floorAreaM2, erfAreaM2, description, features, evidence };
}

function fingerprint(property: CanonicalProperty): string {
  const raw = [property.address, property.suburb, property.city, property.province, property.bedrooms, property.floorAreaM2, property.erfAreaM2].filter(Boolean).join('|').toLowerCase().replace(/[^a-z0-9|]/g, '');
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i++) { hash ^= raw.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return `eix_${(hash >>> 0).toString(16)}`;
}

function clamp(n: number, min = 0, max = 100) { return Math.max(min, Math.min(max, Math.round(n))); }

export function analyzeProperty(property: CanonicalProperty, comparables: Comparable[] = []): PropertyAnalysis {
  const price = property.price;
  const dataCoverage = [price, property.bedrooms, property.bathrooms, property.floorAreaM2, property.address].filter((x) => x !== undefined).length / 5;
  const priceScore = price ? (comparables.length ? clamp(78 + Math.min(18, comparables.reduce((a, c) => a + c.relevance, 0) / comparables.length * 10)) : 62) : 45;
  const locationScore = property.address || property.city ? 78 : 45;
  const marketScore = property.city || property.suburb ? 72 : 50;
  const rentalScore = property.price && property.bedrooms ? clamp(55 + property.bedrooms * 5) : 48;
  const liquidityScore = property.propertyType || property.bedrooms ? 70 : 50;
  const riskScore = dataCoverage >= 0.8 ? 78 : 55;
  const components: ScoreComponent[] = [
    { key: 'price', label: 'Price Position', score: priceScore, weight: 0.24, confidence: price ? 0.7 : 0.35, rationale: comparables.length ? 'Comparable evidence is available for price positioning.' : 'No verified comparable set is available yet; price signal is provisional.' },
    { key: 'location', label: 'Location', score: locationScore, weight: 0.18, confidence: property.address || property.city ? 0.7 : 0.35, rationale: property.address ? 'A location signal was extracted from the listing.' : 'Location is incomplete.' },
    { key: 'market', label: 'Market', score: marketScore, weight: 0.16, confidence: property.city || property.suburb ? 0.55 : 0.3, rationale: 'Market score remains provisional until current market evidence is attached.' },
    { key: 'rental', label: 'Rental Potential', score: rentalScore, weight: 0.14, confidence: property.price && property.bedrooms ? 0.5 : 0.25, rationale: 'Rental potential is indicative until verified rental comparables are attached.' },
    { key: 'liquidity', label: 'Liquidity', score: liquidityScore, weight: 0.12, confidence: 0.4, rationale: 'Liquidity is provisional without verified time-on-market and transaction evidence.' },
    { key: 'risk', label: 'Property Risk', score: riskScore, weight: 0.16, confidence: dataCoverage >= 0.8 ? 0.55 : 0.3, rationale: 'Risk confidence rises with verified property attributes and source evidence.' },
  ];
  const weighted = components.reduce((sum, c) => sum + c.score * c.weight, 0);
  const confidence = clamp(components.reduce((sum, c) => sum + c.confidence * c.weight, 0) * 100);
  const score = clamp(weighted);
  let verdict: Verdict = 'INVESTIGATE';
  if (confidence < 55 || !price) verdict = 'INVESTIGATE';
  else if (score >= 86) verdict = 'BUY';
  else if (score >= 72) verdict = 'NEGOTIATE';
  else if (score < 55) verdict = 'AVOID';
  const low = price ? Math.round(price * (score >= 80 ? 0.94 : 0.88)) : undefined;
  const high = price ? Math.round(price * (score >= 80 ? 1.02 : 0.97)) : undefined;
  const signal = !price ? 'INSUFFICIENT_DATA' : score >= 82 ? 'UNDERPRICED' : score >= 68 ? 'FAIR' : 'OVERPRICED';
  const negotiation = price && low && high ? { opening: Math.round(low * 0.98), target: Math.round((low + high) / 2), maximum: Math.round(high * 1.01), rationale: 'Provisional negotiation range derived from the current EiX score and available evidence; replace with verified comparable evidence when available.' } : undefined;
  return { property, identity: { fingerprint: fingerprint(property), normalizedAddress: property.address?.replace(/\\s+/g, ' ').trim() }, evidenceGraph: property.evidence, comparables, components, score, confidence, verdict, price: { asking: price, low, high, premiumOrDiscountPct: price && low ? Math.round(((price - low) / low) * 1000) / 10 : undefined, signal }, negotiation, nextActions: [!price ? 'Confirm the asking price.' : 'Verify asking price against the live listing.', 'Attach verified comparable-sale evidence before treating the price range as decision-grade.', 'Confirm rental evidence if investment yield is important.', 'Review legal, structural and municipal due diligence before making an offer.'] };
}

export async function fetchAndAnalyze(url: string): Promise<PropertyAnalysis> {
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only HTTP(S) property URLs are supported.');
  if (['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(parsed.hostname)) throw new Error('Local URLs are not allowed.');
  const response = await fetch(url, { headers: { 'user-agent': 'EiX-Property-Engine/1.0 (+https://eix-property-score-beta.vercel.app)' }, signal: AbortSignal.timeout(12000), redirect: 'follow' });
  if (!response.ok) throw new Error(`Listing fetch failed with HTTP ${response.status}.`);
  const html = await response.text();
  if (html.length > 5_000_000) throw new Error('Listing response is too large.');
  return analyzeProperty(parseListingHtml(html, url));
}
