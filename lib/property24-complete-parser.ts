import type { PropertyEvidence, PropertyFacts } from '@/lib/property-types';

export interface Property24PointOfInterest {
  category: string | null;
  name: string;
  distanceKm: number;
}

export interface Property24RecentSaleRecord {
  address: string;
  priceCents: number | null;
  soldDate: string | null;
  sourceUrl: string | null;
}

export interface Property24NarrativeClaim {
  type: 'income_use' | 'rental_use' | 'tenant' | 'studio_suites' | 'renovation' | 'heritage' | 'security' | 'development' | 'amenity' | 'other';
  text: string;
  verification: 'listing_claim';
}

export interface Property24SourceDocument {
  source: 'property24';
  canonicalSource: string;
  listingNumber: string | null;
  title: string | null;
  address: string | null;
  listingDate: string | null;
  description: string | null;
  claims: Property24NarrativeClaim[];
  recentSales: Property24RecentSaleRecord[];
  sectionsPresent: string[];
}

export interface Property24ListingDetails {
  listingNumber: string | null;
  listingDate: string | null;
  kitchens: number | null;
  receptionRooms: number | null;
  petsAllowed: boolean | null;
  parkingDetails: string[];
  flooring: string[];
  backupWater: string[];
  backupPower: string[];
  flatlet: boolean | null;
  pointsOfInterest: Property24PointOfInterest[];
  calculator: {
    monthlyRepaymentCents: number | null;
    onceOffCostsCents: number | null;
    minimumGrossMonthlyIncomeCents: number | null;
  };
  recentSales: Property24RecentSaleRecord[];
  claims: Property24NarrativeClaim[];
  description: string | null;
}

const SECTION_NAMES = [
  'Property Overview',
  'Rooms',
  'External Features',
  'Building',
  'Other Features',
  'Points of Interest',
  'Bond Calculator',
];

function decode(value: string): string {
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

function parseMoneyCents(value: string): number | null {
  const cleaned = decode(value).replace(/[^\d.]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

function sectionText(body: string, heading: string): string {
  const normalized = decode(body);
  const start = normalized.toLowerCase().indexOf(heading.toLowerCase());
  if (start < 0) return '';
  const after = normalized.slice(start + heading.length);
  let end = after.length;
  for (const next of SECTION_NAMES) {
    if (next.toLowerCase() === heading.toLowerCase()) continue;
    const index = after.toLowerCase().indexOf(next.toLowerCase());
    if (index >= 0 && index < end) end = index;
  }
  return after.slice(0, end).trim();
}

function listingNumber(body: string): string | null {
  const match = body.match(/(?:data-listingnumber\s*=\s*["']|Listing Number\s*|P24-)(\d{6,})/i);
  return match?.[1] ?? null;
}

function addEvidence(
  evidence: PropertyEvidence[],
  field: keyof PropertyFacts,
  value: string | number | boolean,
): void {
  evidence.push({ field, value, source: 'html' });
}

export function parseProperty24CompleteSections(
  body: string,
): {
  facts: Partial<PropertyFacts>;
  details: Property24ListingDetails;
  evidence: PropertyEvidence[];
  sourceDocument: Property24SourceDocument;
} {
  const facts: Partial<PropertyFacts> = {};
  const evidence: PropertyEvidence[] = [];
  const overview = sectionText(body, 'Property Overview');
  const rooms = sectionText(body, 'Rooms');
  const external = sectionText(body, 'External Features');
  const building = sectionText(body, 'Building');
  const other = sectionText(body, 'Other Features');
  const poiText = sectionText(body, 'Points of Interest');
  const calculator = sectionText(body, 'Bond Calculator');
  const normalized = decode(body);
  const descriptionMatch =
    normalized.match(/(?:4|\d+)\s+(?:individual\s+)?studio\s+suites?[\s\S]*?(?=Read full description|Features\b)/i) ??
    normalized.match(/(?:Positioned|Situated|Located)\s+[\s\S]*?(?=Read full description|Features\b)/i);
  const description = descriptionMatch?.[0]?.trim() || null;
  const claims: Property24NarrativeClaim[] = [];
  const addClaim = (type: Property24NarrativeClaim['type'], pattern: RegExp) => {
    const match = description?.match(pattern);
    if (match?.[0]) claims.push({ type, text: match[0].trim(), verification: 'listing_claim' });
  };
  addClaim('studio_suites', /(?:four|4)\s+(?:individual\s+)?studio\s+suites?[\s\S]*?(?=\.|$)/i);
  addClaim('rental_use', /(?:three|3)\s+of\s+the\s+suites?\s+(?:operate|are)\s+as\s+(?:curated\s+)?Airbnb[\s\S]*?(?=\.|$)/i);
  addClaim('tenant', /(?:the\s+)?fourth\s+(?:suite|unit)\s+is\s+(?:secured\s+with\s+)?a\s+long-term\s+tenant[\s\S]*?(?=\.|$)/i);
  addClaim('income_use', /income\s+potential/i);
  addClaim('heritage', /heritage|Victorian|period\s+character/i);
  addClaim('renovation', /reimagined|renovat(?:ed|ion)/i);
  addClaim('security', /security|secure/i);
  addClaim('development', /development/i);

  const listingId = listingNumber(body);

  const addressMatch =
    normalized.match(/Street Address\s+(.+?)(?=\s+Listing Date\b)/i) ??
    normalized.match(/\b(\d+\s+[A-Za-z0-9' .-]+,\s*Woodstock(?:,\s*Cape Town)?)/i);
  if (addressMatch?.[1]) {
    facts.address = addressMatch[1].trim();
    addEvidence(evidence, 'address', facts.address);
  }

  const titleMatch = body.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (titleMatch?.[1]) {
    const title = decode(titleMatch[1]);
    if (title) {
      facts.title = title;
      addEvidence(evidence, 'title', title);
    }
  }
  if (listingId) {
    facts.listingNumber = listingId;
    addEvidence(evidence, 'listingNumber', listingId);
  }

  const listingDate = overview.match(/Listing Date\s+(.+?)(?=\s+(?:Erf Size|Floor Size|Rates and Taxes|Levies|Pets Allowed|$))/i)?.[1]?.trim() ?? null;
  if (listingDate) {
    facts.listingDate = listingDate;
    addEvidence(evidence, 'listingDate', listingDate);
  }

  const type = overview.match(/Type of Property\s+(.+?)(?=\s+(?:Description|Lifestyle|Listing Date|Erf Size|Floor Size|Rates and Taxes|$))/i)?.[1]?.trim();
  if (type) {
    facts.propertyType = type;
    addEvidence(evidence, 'propertyType', type);
  }

  const floor = overview.match(/Floor Size\s+([\d\s,.]+\s*m(?:2|²))/i)?.[1];
  if (floor) {
    const n = Number(floor.replace(/[^\d.]/g, ''));
    if (Number.isFinite(n) && n > 1) {
      facts.floorSizeM2 = n;
      addEvidence(evidence, 'floorSizeM2', floor);
    }
  }

  const erf = overview.match(/Erf Size\s+([\d\s,.]+\s*m(?:2|²))/i)?.[1];
  if (erf) {
    const n = Number(erf.replace(/[^\d.]/g, ''));
    if (Number.isFinite(n) && n > 1) {
      facts.landSizeM2 = n;
      addEvidence(evidence, 'landSizeM2', erf);
    }
  }

  const rates = overview.match(/Rates and Taxes\s+(R\s*[\d\s,.]+)/i)?.[1];
  if (rates) {
    const n = parseMoneyCents(rates);
    if (n !== null) {
      facts.ratesAndTaxesCents = n;
      addEvidence(evidence, 'ratesAndTaxesCents', rates);
    }
  }

  const levies = overview.match(/Levies\s+(R\s*[\d\s,.]+)/i)?.[1];
  if (levies) {
    const n = parseMoneyCents(levies);
    if (n !== null) {
      facts.leviesCents = n;
      addEvidence(evidence, 'leviesCents', levies);
    }
  }

  const pets = overview.match(/Pets Allowed\s+(Yes|No)/i)?.[1];
  if (pets) {
    facts.petsAllowed = pets.toLowerCase() === 'yes';
    addEvidence(evidence, 'petsAllowed', facts.petsAllowed);
  }

  const bedrooms = rooms.match(/Bedrooms\s+(\d+(?:\.\d+)?)/i)?.[1];
  if (bedrooms) {
    facts.bedrooms = Number(bedrooms);
    addEvidence(evidence, 'bedrooms', bedrooms);
  }
  const bathrooms = rooms.match(/Bathrooms\s+(\d+(?:\.\d+)?)/i)?.[1];
  if (bathrooms) {
    facts.bathrooms = Number(bathrooms);
    addEvidence(evidence, 'bathrooms', bathrooms);
  }
  const kitchens = rooms.match(/Kitchens\s+(\d+)/i)?.[1];
  if (kitchens) {
    facts.kitchens = Number(kitchens);
    addEvidence(evidence, 'kitchens', kitchens);
  }
  const reception = rooms.match(/Reception Rooms\s+(\d+)/i)?.[1];
  if (reception) {
    facts.receptionRooms = Number(reception);
    addEvidence(evidence, 'receptionRooms', reception);
  }

  const parkingDetails = Array.from(
    external.matchAll(/Parking\s+\d+\s+(.+?)(?=\s+Parking\s+\d+\s+|\s+Garage\s+|\s+Garden\s+|\s+Pool\s+|\s+Outbuilding\s+|$)/gi),
  ).map((m) => m[1].trim()).filter(Boolean);
  if (parkingDetails.length) {
    facts.parkingDetails = parkingDetails;
    for (const value of parkingDetails) addEvidence(evidence, 'parkingDetails', value);
  }

  const flooring = building.match(/Floor\s+(.+?)(?=\s+(?:Backup Water|Backup Power|Roof|Wall|Window|$))/i)?.[1]?.trim();
  const flooringValues = flooring
    ? flooring.split(/,|\s+and\s+/i).map((s) => s.trim()).filter(Boolean)
    : [];
  if (flooringValues.length) {
    facts.flooring = flooringValues;
    for (const value of flooringValues) addEvidence(evidence, 'flooring', value);
  }

  const backupWater = building.match(/Backup Water\s+(.+?)(?=\s+(?:Backup Power|Roof|Wall|Window|Floor|$))/i)?.[1]?.trim();
  const waterValues = backupWater ? [backupWater] : [];
  if (waterValues.length) {
    facts.backupWater = waterValues;
    for (const value of waterValues) addEvidence(evidence, 'backupWater', value);
  }

  const backupPower = building.match(/Backup Power\s+(.+?)(?=\s+(?:Solar|Roof|Wall|Window|Floor|$))/i)?.[1]?.trim();
  const powerValues = backupPower ? [backupPower] : [];
  if (powerValues.length) {
    facts.backupPower = powerValues;
    for (const value of powerValues) addEvidence(evidence, 'backupPower', value);
  }

  const flatlet = /Flatlet\s+Yes/i.test(other);
  if (flatlet) {
    facts.flatlet = true;
    addEvidence(evidence, 'flatlet', true);
  }

  const pois: Property24PointOfInterest[] = [];
  const categories = [
    'Education',
    'Food and Entertainment',
    'Shopping',
    'Transport and Public Services',
  ];
  for (let i = 0; i < categories.length; i += 1) {
    const category = categories[i];
    const nextCategories = categories.slice(i + 1).join('|');
    const pattern = nextCategories
      ? new RegExp(category + '\\s+([\\s\\S]*?)(?=\\s+(?:' + nextCategories + '|Bond Calculator)\\b)', 'i')
      : new RegExp(category + '\\s+([\\s\\S]*?)(?=\\s+Bond Calculator\\b|$)', 'i');
    const block = poiText.match(pattern)?.[1] ?? '';
    for (const item of block.matchAll(/([A-Za-z0-9][A-Za-z0-9'&()./ -]{2,80}?)\s+(\d+(?:\.\d+)?)\s*km\b/gi)) {
      pois.push({ category, name: item[1].trim(), distanceKm: Number(item[2]) });
    }
  }
  if (pois.length) {
    facts.pointsOfInterest = pois;
    for (const poi of pois) {
      addEvidence(evidence, 'pointsOfInterest', poi.name + ' — ' + poi.distanceKm + ' km');
    }
  }

  const monthly = calculator.match(/Monthly Repayment\s*:?\s*R\s*([\d\s,.]+)/i)?.[1];
  const onceOff = calculator.match(/Total Once-off Costs\s*:?\s*R\s*([\d\s,.]+)/i)?.[1];
  const income = calculator.match(/Min Gross Monthly Income\s*:?\s*R\s*([\d\s,.]+)/i)?.[1];

  const recentSales: Property24RecentSaleRecord[] = [];
  const recentSalesMatch = body.match(/Recent Sales in and around Woodstock([\s\S]*?)(?:Trends and Statistics|View more Sold Prices|$)/i);
  if (recentSalesMatch) {
    const salesBlock = recentSalesMatch[1];
    const salesRegex = /<a\b[^>]*href=["']([^"']*(?:property-values|property-value)[^"']*)["'][^>]*>[\s\S]*?<strong>\s*([^<]+?)\s*<\/strong>|<a\b[^>]*href=["']([^"']*(?:property-values|property-value)[^"']*)["'][^>]*>\s*([^<]+?)\s*<\/a>/gi;
    for (const match of salesBlock.matchAll(salesRegex)) {
      const sourceUrl = match[1] ?? match[3] ?? null;
      const address = (match[2] ?? match[4] ?? '').replace(/\s+/g, ' ').trim();
      if (address && !recentSales.some((sale) => sale.address.toLowerCase() === address.toLowerCase())) {
        recentSales.push({ address, priceCents: null, soldDate: null, sourceUrl });
      }
    }
  }

  const calc = {
    monthlyRepaymentCents: monthly ? parseMoneyCents(monthly) : null,
    onceOffCostsCents: onceOff ? parseMoneyCents(onceOff) : null,
    minimumGrossMonthlyIncomeCents: income ? parseMoneyCents(income) : null,
  };
  if (calc.monthlyRepaymentCents !== null) {
    facts.property24MonthlyRepaymentCents = calc.monthlyRepaymentCents;
    addEvidence(evidence, 'property24MonthlyRepaymentCents', monthly!);
  }
  if (calc.onceOffCostsCents !== null) {
    facts.property24OnceOffCostsCents = calc.onceOffCostsCents;
    addEvidence(evidence, 'property24OnceOffCostsCents', onceOff!);
  }
  if (calc.minimumGrossMonthlyIncomeCents !== null) {
    facts.property24MinimumGrossMonthlyIncomeCents = calc.minimumGrossMonthlyIncomeCents;
    addEvidence(evidence, 'property24MinimumGrossMonthlyIncomeCents', income!);
  }

  const sourceDocument: Property24SourceDocument = {
    source: 'property24',
    canonicalSource: 'Property24',
    listingNumber: listingId,
    title: facts.title ?? null,
    address: facts.address ?? null,
    listingDate,
    description,
    claims,
    recentSales,
    sectionsPresent: SECTION_NAMES.filter((name) => normalized.toLowerCase().includes(name.toLowerCase())),
  };

  return {
    facts,
    details: {
      listingNumber: listingId,
      listingDate,
      kitchens: kitchens ? Number(kitchens) : null,
      receptionRooms: reception ? Number(reception) : null,
      petsAllowed: pets ? pets.toLowerCase() === 'yes' : null,
      parkingDetails,
      flooring: flooringValues,
      backupWater: waterValues,
      backupPower: powerValues,
      flatlet: flatlet ? true : null,
      pointsOfInterest: pois,
      calculator: calc,
      recentSales,
      claims,
      description,
    },
    evidence,
    sourceDocument,
  };
}
