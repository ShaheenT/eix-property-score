import type {
  PropertyFacts,
  PropertyEvidence,
} from './property-types';

type JsonLdObject = Record<string, unknown>;

function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const cleaned = value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, String.fromCharCode(34))
    .replace(/&#39;/gi, "'")
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned || null;
}

function isObject(value: unknown): value is JsonLdObject {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getJsonLdTypes(value: JsonLdObject): string[] {
  const type = value['@type'];

  if (typeof type === 'string') {
    return [type];
  }

  if (Array.isArray(type)) {
    return type.filter(
      (item): item is string => typeof item === 'string'
    );
  }

  return [];
}

function normaliseType(type: string): string {
  return type
    .toLowerCase()
    .replace(/[\s_-]/g, '');
}

function isPropertyJsonLd(value: JsonLdObject): boolean {
  const types = getJsonLdTypes(value).map(normaliseType);

  return types.some((type) =>
    [
      'product',
      'residence',
      'singlefamilyresidence',
      'house',
      'apartment',
      'realestatelisting',
    ].includes(type)
  );
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  let normalized = value
    .replace(/[^\d.,-]/g, '')
    .trim();

  if (!normalized) {
    return null;
  }

  const commaCount = (normalized.match(/,/g) || []).length;
  const dotCount = (normalized.match(/\./g) || []).length;

  if (commaCount > 0 && dotCount > 0) {
    const lastComma = normalized.lastIndexOf(',');
    const lastDot = normalized.lastIndexOf('.');

    if (lastComma > lastDot) {
      normalized = normalized
        .replace(/\./g, '')
        .replace(',', '.');
    } else {
      normalized = normalized.replace(/,/g, '');
    }
  } else if (commaCount > 0) {
    const parts = normalized.split(',');

    if (
      commaCount === 1 &&
      parts[1] &&
      parts[1].length >= 1 &&
      parts[1].length <= 2
    ) {
      normalized = normalized.replace(',', '.');
    } else {
      normalized = normalized.replace(/,/g, '');
    }
  } else if (dotCount > 0) {
    const parts = normalized.split('.');

    if (
      dotCount !== 1 ||
      !parts[1] ||
      parts[1].length < 1 ||
      parts[1].length > 2
    ) {
      normalized = normalized.replace(/\./g, '');
    }
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function parsePositiveNumber(value: unknown): number | null {
  const parsed = parseNumber(value);

  return parsed !== null && parsed > 0 ? parsed : null;
}

function parsePriceCents(value: unknown): number | null {
  const amount = parsePositiveNumber(value);

  return amount !== null ? Math.round(amount * 100) : null;
}

function parseBathroomCount(value: unknown): number | null {
  return parsePositiveNumber(value);
}

function getStringValue(value: unknown): string | null {
  if (typeof value === 'string') {
    return cleanText(value);
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function getObjectProperty(
  object: JsonLdObject,
  key: string
): JsonLdObject | null {
  const value = object[key];

  return isObject(value) ? value : null;
}

function addStringFact(
  facts: Partial<PropertyFacts>,
  evidence: PropertyEvidence[],
  field: keyof PropertyFacts,
  value: unknown
): void {
  if (facts[field] !== undefined) {
    return;
  }

  const cleaned = getStringValue(value);

  if (!cleaned) {
    return;
  }

  facts[field] = cleaned as never;

  evidence.push({
    field,
    value: cleaned,
    source: 'json_ld',
  });
}

function addNumberFact(
  facts: Partial<PropertyFacts>,
  evidence: PropertyEvidence[],
  field: keyof PropertyFacts,
  value: unknown
): void {
  if (facts[field] !== undefined) {
    return;
  }

  const parsed = parsePositiveNumber(value);

  if (parsed === null) {
    return;
  }

  facts[field] = parsed as never;

  evidence.push({
    field,
    value: String(parsed),
    source: 'json_ld',
  });
}

function addPriceFact(
  facts: Partial<PropertyFacts>,
  evidence: PropertyEvidence[],
  value: unknown
): void {
  if (facts.askingPriceCents !== undefined) {
    return;
  }

  const parsed = parsePriceCents(value);

  if (parsed === null) {
    return;
  }

  facts.askingPriceCents = parsed;

  evidence.push({
    field: 'askingPriceCents',
    value: String(parsed),
    source: 'json_ld',
  });
}

function extractObjectFacts(
  jsonLd: JsonLdObject
): {
  facts: Partial<PropertyFacts>;
  evidence: PropertyEvidence[];
} {
  const facts: Partial<PropertyFacts> = {};
  const evidence: PropertyEvidence[] = [];

  if (!isPropertyJsonLd(jsonLd)) {
    return { facts, evidence };
  }

  addStringFact(
    facts,
    evidence,
    'title',
    jsonLd['name']
  );

  const address = getObjectProperty(
    jsonLd,
    'address'
  );

  if (address) {
    addStringFact(
      facts,
      evidence,
      'address',
      address['streetAddress']
    );

    addStringFact(
      facts,
      evidence,
      'suburb',
      address['addressLocality']
    );

    addStringFact(
      facts,
      evidence,
      'province',
      address['addressRegion']
    );

    addStringFact(
      facts,
      evidence,
      'postalCode',
      address['postalCode']
    );
  }

  addNumberFact(
    facts,
    evidence,
    'bedrooms',
    jsonLd['numberOfBedrooms']
  );

  addNumberFact(
    facts,
    evidence,
    'bathrooms',
    jsonLd['numberOfBathrooms']
  );

  const floorSize = getObjectProperty(
    jsonLd,
    'floorSize'
  );

  if (floorSize) {
    addNumberFact(
      facts,
      evidence,
      'floorSizeM2',
      floorSize['value']
    );
  } else {
    addNumberFact(
      facts,
      evidence,
      'floorSizeM2',
      jsonLd['floorSize']
    );
  }

  const lotSize = getObjectProperty(
    jsonLd,
    'lotSize'
  );

  if (lotSize) {
    addNumberFact(
      facts,
      evidence,
      'landSizeM2',
      lotSize['value']
    );
  } else {
    addNumberFact(
      facts,
      evidence,
      'landSizeM2',
      jsonLd['lotSize']
    );
  }

  const offers = getObjectProperty(
    jsonLd,
    'offers'
  );

  if (offers) {
    addPriceFact(
      facts,
      evidence,
      offers['price']
    );
  }

  addPriceFact(
    facts,
    evidence,
    jsonLd['price']
  );

  const propertyType =
    getStringValue(jsonLd['propertyType']) ??
    getStringValue(jsonLd['additionalType']);

  addStringFact(
    facts,
    evidence,
    'propertyType',
    propertyType
  );

  return {
    facts,
    evidence,
  };
}

export function mergeFacts(
  target: PropertyFacts,
  ...sources: Array<Partial<PropertyFacts>>
): PropertyFacts;
export function mergeFacts(
  target: Partial<PropertyFacts>,
  ...sources: Array<Partial<PropertyFacts>>
): Partial<PropertyFacts>;
export function mergeFacts(
  target: Partial<PropertyFacts>,
  ...sources: Array<Partial<PropertyFacts>>
): Partial<PropertyFacts> {
  for (const source of sources) {
    for (const key of Object.keys(source) as Array<keyof PropertyFacts>) {
      if (
        (target[key] === undefined || target[key] === null) &&
        source[key] !== undefined && source[key] !== null
      ) {
        (target as Record<keyof PropertyFacts, PropertyFacts[keyof PropertyFacts]>)[key] =
          source[key] as PropertyFacts[keyof PropertyFacts];
      }
    }
  }

  return target;
}

export function mergeEvidence(
  target: PropertyEvidence[],
  ...sources: Array<PropertyEvidence[]>
): PropertyEvidence[] {
  const existingFields = new Set(
    target.map((item) => item.field)
  );

  for (const source of sources) {
    for (const item of source) {
      if (!existingFields.has(item.field)) {
        target.push(item);
        existingFields.add(item.field);
      }
    }
  }

  return target;
}

function collectJsonLdObjects(
  value: unknown
): JsonLdObject[] {
  const objects: JsonLdObject[] = [];

  if (Array.isArray(value)) {
    for (const item of value) {
      objects.push(...collectJsonLdObjects(item));
    }

    return objects;
  }

  if (!isObject(value)) {
    return objects;
  }

  if (isPropertyJsonLd(value)) {
    objects.push(value);
  }

  const graph = value['@graph'];

  if (Array.isArray(graph)) {
    for (const item of graph) {
      objects.push(...collectJsonLdObjects(item));
    }
  }

  const nestedKeys = [
    'mainEntity',
    'item',
    'itemOffered',
  ];

  for (const key of nestedKeys) {
    const nested = value[key];

    if (nested !== undefined) {
      objects.push(...collectJsonLdObjects(nested));
    }
  }

  return objects;
}

function extractJsonLdFacts(
  jsonLd: unknown
): {
  facts: PropertyFacts;
  evidence: PropertyEvidence[];
} {
  const facts: PropertyFacts = {
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
  const evidence: PropertyEvidence[] = [];

  const objects = collectJsonLdObjects(jsonLd);

  for (const object of objects) {
    const result = extractObjectFacts(object);

    mergeFacts(facts, result.facts);
    mergeEvidence(evidence, result.evidence);

    if (
      Object.keys(facts).length ===
      12
    ) {
      break;
    }
  }

  return {
    facts,
    evidence,
  };
}

export {
  cleanText,
  parseNumber,
  parsePositiveNumber,
  parsePriceCents,
  parseBathroomCount,
  extractJsonLdFacts,
};
