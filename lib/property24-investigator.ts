import type { PropertyEvidence, PropertyFacts } from '@/lib/property-types';

export interface Property24InvestigatorResult {
  facts: Partial<PropertyFacts>;
  evidence: PropertyEvidence[];
  description: string | null;
  recentSales: Array<{ address: string; priceCents: number | null; soldDate: string | null; sourceUrl: string | null }>;
}

function stripNonContent(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ');
}

function text(html: string): string {
  return stripNonContent(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function moneyCents(value: string): number | null {
  const n = Number(value.replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

function add(evidence: PropertyEvidence[], field: keyof PropertyFacts, value: string | number | boolean): void {
  evidence.push({ field, value, source: 'html' });
}

export function investigateProperty24(html: string): Property24InvestigatorResult {
  const facts: Partial<PropertyFacts> = {};
  const evidence: PropertyEvidence[] = [];
  const visible = text(html);

  const listingNumber = visible.match(/Listing Number\s+(\d{6,})/i)?.[1] ?? html.match(/P24-(\d{6,})/i)?.[1] ?? null;
  if (listingNumber) { facts.listingNumber = listingNumber; add(evidence, 'listingNumber', listingNumber); }

  const listingDate = visible.match(/Listing Date\s+(.+?)(?=\s+(?:Erf Size|Floor Size|Rates and Taxes|Levies|$))/i)?.[1]?.trim() ?? null;
  if (listingDate) { facts.listingDate = listingDate; add(evidence, 'listingDate', listingDate); }

  const title = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  if (title) {
    const cleanTitle = text(title);
    if (cleanTitle) { facts.title = cleanTitle; add(evidence, 'title', cleanTitle); }
  }

  const address = visible.match(/Street Address\s+(.+?)(?=\s+Listing Date\b)/i)?.[1]?.trim();
  if (address) { facts.address = address; add(evidence, 'address', address); }

  const price = visible.match(/(?:Asking Price|Sale Price|^|\s)R\s*([\d\s,.]+)(?=\s+(?:Bond Calculator|$))/i)?.[1]
    ?? visible.match(/\b(?:House|Apartment|Townhouse|Duplex)\s+for\s+(?:Sale|sale)\s+in\s+[^R]{0,120}R\s*([\d\s,.]+)/i)?.[1];
  if (price) {
    const cents = moneyCents(price);
    if (cents !== null) { facts.askingPriceCents = cents; add(evidence, 'askingPriceCents', price); }
  }

  const overview = visible.match(/Property Overview\s+([\s\S]*?)(?=\s+Rooms\b)/i)?.[1] ?? visible;
  const type = overview.match(/Type of Property\s+(.+?)(?=\s+(?:Street Address|Listing Date|Erf Size|Floor Size|Rates and Taxes|$))/i)?.[1]?.trim();
  if (type) { facts.propertyType = type; add(evidence, 'propertyType', type); }

  const erf = overview.match(/Erf Size\s+([\d\s,.]+)\s*m(?:2|²)/i)?.[1];
  if (erf) { const n = Number(erf.replace(/[^\d.]/g, '')); if (Number.isFinite(n)) { facts.landSizeM2 = n; add(evidence, 'landSizeM2', erf); } }

  const floor = overview.match(/Floor Size\s+([\d\s,.]+)\s*m(?:2|²)/i)?.[1];
  if (floor) { const n = Number(floor.replace(/[^\d.]/g, '')); if (Number.isFinite(n)) { facts.floorSizeM2 = n; add(evidence, 'floorSizeM2', floor); } }

  const rates = overview.match(/Rates and Taxes\s+R\s*([\d\s,.]+)/i)?.[1];
  if (rates) { const cents = moneyCents(rates); if (cents !== null) { facts.ratesAndTaxesCents = cents; add(evidence, 'ratesAndTaxesCents', rates); } }

  const rooms = visible.match(/Rooms\s+([\s\S]*?)(?=\s+(?:Points of Interest|External Features|Building|Other Features|Bond Calculator)\b)/i)?.[1] ?? visible;
  const bedrooms = rooms.match(/Bedrooms\s+(\d+(?:\.\d+)?)/i)?.[1];
  const bathrooms = rooms.match(/Bathrooms\s+(\d+(?:\.\d+)?)/i)?.[1];
  const reception = rooms.match(/Reception Rooms\s+(\d+)/i)?.[1];
  const kitchens = rooms.match(/Kitchens\s+(\d+)/i)?.[1];
  if (bedrooms) { facts.bedrooms = Number(bedrooms); add(evidence, 'bedrooms', bedrooms); }
  if (bathrooms) { facts.bathrooms = Number(bathrooms); add(evidence, 'bathrooms', bathrooms); }
  if (reception) { facts.receptionRooms = Number(reception); add(evidence, 'receptionRooms', reception); }
  if (kitchens) { facts.kitchens = Number(kitchens); add(evidence, 'kitchens', kitchens); }

  const calculator = visible.match(/Bond Calculator\s+([\s\S]*?)(?=\s+(?:Recent Sales|Trends and Statistics|$))/i)?.[1] ?? '';
  const monthly = calculator.match(/Monthly Repayment\s*:?\s*R\s*([\d\s,.]+)/i)?.[1];
  const onceOff = calculator.match(/Total Once-off Costs\s*:?\s*R\s*([\d\s,.]+)/i)?.[1];
  const income = calculator.match(/Min Gross Monthly Income\s*:?\s*R\s*([\d\s,.]+)/i)?.[1];
  if (monthly) { const cents = moneyCents(monthly); if (cents !== null) { facts.property24MonthlyRepaymentCents = cents; add(evidence, 'property24MonthlyRepaymentCents', monthly); } }
  if (onceOff) { const cents = moneyCents(onceOff); if (cents !== null) { facts.property24OnceOffCostsCents = cents; add(evidence, 'property24OnceOffCostsCents', onceOff); } }
  if (income) { const cents = moneyCents(income); if (cents !== null) { facts.property24MinimumGrossMonthlyIncomeCents = cents; add(evidence, 'property24MinimumGrossMonthlyIncomeCents', income); } }

  const recentSales: Property24InvestigatorResult['recentSales'] = [];
  const salesBlock = visible.match(/Recent Sales in and around\s+[\s\S]*?(?=\s+Trends and Statistics\b|\s+View more Sold Prices\b|$)/i)?.[0] ?? '';
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']*(?:property-values|property-value)[^"']*)["'][^>]*>\s*([^<]+?)\s*<\/a>/gi)) {
    const addressValue = text(match[2]);
    if (addressValue && salesBlock.toLowerCase().includes(addressValue.toLowerCase()) && !recentSales.some(s => s.address.toLowerCase() === addressValue.toLowerCase())) {
      recentSales.push({ address: addressValue, priceCents: null, soldDate: null, sourceUrl: match[1] });
    }
  }
  if (!recentSales.length && salesBlock) {
    for (const match of salesBlock.matchAll(/\b(\d+\s+[A-Za-z0-9' .-]+?\s+(?:Street|Road|Avenue|Rd|St|Ave))\b/gi)) {
      const addressValue = match[1].trim();
      if (!recentSales.some(s => s.address.toLowerCase() === addressValue.toLowerCase())) recentSales.push({ address: addressValue, priceCents: null, soldDate: null, sourceUrl: null });
    }
  }
  if (recentSales.length) add(evidence, 'property24RecentSales', JSON.stringify(recentSales));

  const descriptionMatch = visible.match(/(?:4|\d+)\s+(?:individual\s+)?studio\s+suites?[\s\S]*?(?=\s+Property Overview\b)/i)
    ?? visible.match(/(?:Positioned|Situated|Located)\s+[\s\S]*?(?=\s+Property Overview\b)/i);
  const description = descriptionMatch?.[0]?.trim() || null;
  if (description) {
    facts.description = description;
    add(evidence, 'description', description);
  }

  const claims: PropertyFacts['property24NarrativeClaims'] = [];
  const claim = (type: NonNullable<PropertyFacts['property24NarrativeClaims']>[number]['type'], pattern: RegExp) => {
    const m = description?.match(pattern);
    if (m?.[0]) claims.push({ type, text: m[0].trim(), verification: 'listing_claim' });
  };
  claim('studio_suites', /(?:four|4)\s+(?:individual\s+)?studio\s+suites?[\s\S]*?(?=\.|$)/i);
  claim('rental_use', /(?:three|3)\s+(?:of\s+the\s+)?suites?\s+(?:operate|are)\s+as\s+(?:curated\s+)?Airbnb[\s\S]*?(?=\.|$)/i);
  claim('tenant', /fourth\s+(?:suite|unit)\s+is\s+(?:secured\s+with\s+)?a\s+long-term\s+tenant[\s\S]*?(?=\.|$)/i);
  if (/income potential/i.test(description ?? '')) claims.push({ type: 'income_use', text: 'The listing describes income potential.', verification: 'listing_claim' });
  if (claims.length) { facts.property24NarrativeClaims = claims; add(evidence, 'property24NarrativeClaims', JSON.stringify(claims)); }

  return { facts, evidence, description, recentSales };
}
