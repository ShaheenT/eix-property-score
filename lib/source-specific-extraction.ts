import type { PropertyFacts } from '@/lib/property-types';
import type { EvidenceItem, SupportedSource } from '@/lib/secure-extraction-engine';

function emptyFacts(): PropertyFacts {
  return {
    title: null, address: null, suburb: null, city: null, province: null, postalCode: null,
    askingPriceCents: null, bedrooms: null, bathrooms: null, propertyType: null,
    floorSizeM2: null, landSizeM2: null, leviesCents: null, ratesAndTaxesCents: null,
    garages: null, parking: null, hasStudy: null, hasPool: null, hasGarden: null,
    hasFibre: null, hasSolar: null, hasBatteryBackup: null,
  };
}

function textFromHtml(body: string): string {
  return body
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&#xB2;|&#178;/gi, '²')
    .replace(/\s+/g, ' ')
    .trim();
}

function clean(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function randCents(value: string): number | null {
  const match = value.replace(/\u00a0/g, ' ').match(/R\s*([0-9][0-9\s,]*(?:\.\d{2})?)/i);
  if (!match) return null;
  const amount = Number(match[1].replace(/[\s,]/g, ''));
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) : null;
}

function number(value: string): number | null {
  const match = value.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function labelNumber(text: string, labels: string[]): { value: number; raw: string } | null {
  const pattern = new RegExp(`(?:${labels.join('|')})\\s*[:\\-]?\\s*(\\d+(?:[.,]\\d+)?)`, 'i');
  const match = text.match(pattern);
  if (!match) return null;
  const value = Number(match[1].replace(',', '.'));
  return Number.isFinite(value) ? { value, raw: match[0] } : null;
}

function size(text: string, labels: string[]): { value: number; raw: string } | null {
  const pattern = new RegExp(`(?:${labels.join('|')})\\s*[:\\-]?\\s*([0-9][0-9\\s,]*(?:\\.[0-9]+)?)\\s*m(?:2|²)\\b`, 'i');
  const match = text.match(pattern);
  if (!match) return null;
  const value = Number(match[1].replace(/[\s,]/g, ''));
  return Number.isFinite(value) && value > 1 ? { value, raw: match[0] } : null;
}

function firstHeading(body: string): string | null {
  const match = body.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  return match ? clean(match[1].replace(/<[^>]+>/g, ' ')) : null;
}

function add(
  facts: PropertyFacts,
  evidence: EvidenceItem[],
  field: keyof PropertyFacts,
  value: string | number | boolean | null,
  raw: string,
  sourceUrl: string,
): void {
  if (value === null || value === undefined || value === '' || facts[field] !== null) return;
  facts[field] = value as never;
  evidence.push({
    field,
    value: raw,
    source: 'html',
    status: 'supported',
    retrievalMethod: 'legacy_adapter',
    sourceUrl,
  });
}

export function extractSourceSpecificFacts(
  source: SupportedSource,
  body: string,
  sourceUrl: string,
): { facts: PropertyFacts; evidence: EvidenceItem[] } {
  const facts = emptyFacts();
  const evidence: EvidenceItem[] = [];
  const text = textFromHtml(body);

  // These adapters intentionally use labelled fields rather than broad numeric matches.
  // A value is only accepted when the source page itself supplies a recognisable label.
  if (['rawson', 'pam_golding', 'seeff', 'remax', 'harcourts', 'century21', 'jawitz'].includes(source)) {
    add(facts, evidence, 'title', firstHeading(body), firstHeading(body) ?? '', sourceUrl);

    const price = text.match(/(?:Price|Asking Price|Selling Price|List Price)\s*[:\-]?\s*(R\s*[0-9][0-9\s,]*(?:\.\d{2})?)/i);
    if (price) add(facts, evidence, 'askingPriceCents', randCents(price[1]), price[0], sourceUrl);

    const bedrooms = labelNumber(text, ['Bedrooms?', 'Beds?']);
    if (bedrooms) add(facts, evidence, 'bedrooms', bedrooms.value, bedrooms.raw, sourceUrl);

    const bathrooms = labelNumber(text, ['Bathrooms?', 'Baths?']);
    if (bathrooms) add(facts, evidence, 'bathrooms', bathrooms.value, bathrooms.raw, sourceUrl);

    const land = size(text, ['Land Size', 'Erf Size', 'Land Area', 'Erf Area', 'Site Area']);
    if (land) add(facts, evidence, 'landSizeM2', land.value, land.raw, sourceUrl);

    const floor = size(text, ['Floor Size', 'Building Size', 'Building Area', 'House Size', 'Living Area']);
    if (floor) add(facts, evidence, 'floorSizeM2', floor.value, floor.raw, sourceUrl);

    const garages = labelNumber(text, ['Garages?', 'Garage Parking']);
    if (garages) add(facts, evidence, 'garages', garages.value, garages.raw, sourceUrl);

    const parking = labelNumber(text, ['Parking', 'Open Parking', 'Parking Bays?']);
    if (parking) add(facts, evidence, 'parking', parking.value, parking.raw, sourceUrl);

    const levy = text.match(/(?:Monthly Levy|Levies?|Levy)\s*[:\-]?\s*(R\s*[0-9][0-9\s,]*(?:\.\d{2})?)/i);
    if (levy) add(facts, evidence, 'leviesCents', randCents(levy[1]), levy[0], sourceUrl);

    const rates = text.match(/(?:Rates(?: and Taxes)?|Monthly Rates|Rates & Taxes)\s*[:\-]?\s*(R\s*[0-9][0-9\s,]*(?:\.\d{2})?)/i);
    if (rates) add(facts, evidence, 'ratesAndTaxesCents', randCents(rates[1]), rates[0], sourceUrl);

    const type = text.match(/(?:Property Type|Type)\s*[:\-]?\s*(House|Apartment|Townhouse|Duplex|Farm|Vacant Land|Land|Commercial|Industrial|Mixed Use)\b/i);
    if (type) add(facts, evidence, 'propertyType', type[1], type[0], sourceUrl);

    if (/\bsolar\b|\bsolar system\b|\bphotovoltaic\b/i.test(text)) add(facts, evidence, 'hasSolar', true, 'Solar', sourceUrl);
    if (/\binverter\b|\bbattery backup\b|\bbackup power\b|\blithium battery\b/i.test(text)) add(facts, evidence, 'hasBatteryBackup', true, 'Backup power', sourceUrl);
    if (/\bfibre\b|\bfiber\b/i.test(text)) add(facts, evidence, 'hasFibre', true, 'Fibre', sourceUrl);
    if (/\bswimming pool\b|\bpool\b/i.test(text)) add(facts, evidence, 'hasPool', true, 'Pool', sourceUrl);
    if (/\bgarden\b/i.test(text)) add(facts, evidence, 'hasGarden', true, 'Garden', sourceUrl);
    if (/\bstudy\b/i.test(text)) add(facts, evidence, 'hasStudy', true, 'Study', sourceUrl);
  }

  return { facts, evidence };
}
