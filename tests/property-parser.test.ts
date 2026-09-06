import assert from 'node:assert/strict';
import test from 'node:test';

import {
  extractJsonLdFacts,
  parseBathroomCount,
  parseNumber,
  parsePriceCents,
} from '../lib/property-parser';

test('parses South African grouped price correctly', () => {
  assert.equal(
    parsePriceCents('R2,495,000'),
    249500000
  );
});

test('preserves decimal bathroom counts', () => {
  assert.equal(
    parseBathroomCount('2.5'),
    2.5
  );
});

test('parses grouped numeric values', () => {
  assert.equal(
    parseNumber('1,250'),
    1250
  );

  assert.equal(
    parseNumber('1,250.50'),
    1250.5
  );
});

test('extracts a complete property JSON-LD object', () => {
  const result = extractJsonLdFacts({
    '@type': 'SingleFamilyResidence',
    name: 'Modern Cape Town Family Home',
    propertyType: 'House',
    numberOfBedrooms: 3,
    numberOfBathrooms: 2.5,
    floorSize: {
      '@type': 'QuantitativeValue',
      value: 185,
      unitCode: 'MTK',
    },
    lotSize: 420,
    address: {
      '@type': 'PostalAddress',
      streetAddress: '12 Main Road',
      addressLocality: 'Observatory',
      addressRegion: 'Western Cape',
      postalCode: '7925',
    },
    offers: {
      '@type': 'Offer',
      price: 2495000,
      priceCurrency: 'ZAR',
    },
  });

  assert.deepEqual(result.facts, {
    title: 'Modern Cape Town Family Home',
    address: '12 Main Road',
    suburb: 'Observatory',
    province: 'Western Cape',
    postalCode: '7925',
    bedrooms: 3,
    bathrooms: 2.5,
    floorSizeM2: 185,
    landSizeM2: 420,
    askingPriceCents: 249500000,
    propertyType: 'House',
  });

  assert.equal(
    result.evidence.length,
    11
  );

  assert.ok(
    result.evidence.every(
      (item) => item.source === 'json_ld'
    )
  );
});

test('extracts property data from @graph', () => {
  const result = extractJsonLdFacts({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: 'Example Estate Agency',
      },
      {
        '@type': 'RealEstateListing',
        name: 'Sea Point Apartment',
        numberOfBedrooms: 2,
        numberOfBathrooms: 2,
        address: {
          streetAddress: '50 Main Road',
          addressLocality: 'Sea Point',
          addressRegion: 'Western Cape',
        },
        offers: {
          price: 'R3,250,000',
        },
      },
    ],
  });

  assert.equal(
    result.facts.title,
    'Sea Point Apartment'
  );

  assert.equal(
    result.facts.bedrooms,
    2
  );

  assert.equal(
    result.facts.bathrooms,
    2
  );

  assert.equal(
    result.facts.askingPriceCents,
    325000000
  );

  assert.equal(
    result.facts.suburb,
    'Sea Point'
  );
});

test('extracts nested mainEntity property data', () => {
  const result = extractJsonLdFacts({
    '@type': 'WebPage',
    mainEntity: {
      '@type': 'Apartment',
      name: 'Claremont Apartment',
      numberOfBedrooms: 2,
      numberOfBathrooms: 1.5,
      propertyType: 'Apartment',
    },
  });

  assert.equal(
    result.facts.title,
    'Claremont Apartment'
  );

  assert.equal(
    result.facts.bedrooms,
    2
  );

  assert.equal(
    result.facts.bathrooms,
    1.5
  );

  assert.equal(
    result.facts.propertyType,
    'Apartment'
  );
});

test('does not infer unsupported fields', () => {
  const result = extractJsonLdFacts({
    '@type': 'House',
    name: 'Property With Limited Data',
    numberOfBedrooms: 3,
  });

  assert.equal(
    result.facts.title,
    'Property With Limited Data'
  );

  assert.equal(
    result.facts.bedrooms,
    3
  );

  assert.equal(
    result.facts.bathrooms,
    undefined
  );

  assert.equal(
    result.facts.address,
    undefined
  );

  assert.equal(
    result.facts.askingPriceCents,
    undefined
  );

  assert.equal(
    result.facts.floorSizeM2,
    undefined
  );
});

test('ignores unrelated JSON-LD objects', () => {
  const result = extractJsonLdFacts({
    '@type': 'Organization',
    name: 'Example Estate Agency',
    address: {
      streetAddress: '1 Agency Road',
    },
  });

  assert.deepEqual(
    result.facts,
    {}
  );

  assert.deepEqual(
    result.evidence,
    []
  );
});

test('handles JSON-LD arrays', () => {
  const result = extractJsonLdFacts([
    {
      '@type': 'Organization',
      name: 'Example Agency',
    },
    {
      '@type': 'Residence',
      name: 'Observatory Residence',
      numberOfBedrooms: 4,
    },
  ]);

  assert.equal(
    result.facts.title,
    'Observatory Residence'
  );

  assert.equal(
    result.facts.bedrooms,
    4
  );
});

test('handles malformed JSON-LD input without throwing', () => {
  assert.doesNotThrow(() => {
    extractJsonLdFacts(
      '{"not-valid-json":'
    );
  });

  const result = extractJsonLdFacts(
    '{"not-valid-json":'
  );

  assert.deepEqual(
    result.facts,
    {}
  );

  assert.deepEqual(
    result.evidence,
    []
  );
});
