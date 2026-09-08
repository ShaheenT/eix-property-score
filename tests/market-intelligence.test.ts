import test from 'node:test';
import assert from 'node:assert/strict';

import type { PropertyFacts } from '@/lib/property-types';
import {
  calculateMarketIntelligence,
} from '@/lib/market-intelligence';
import type { ComparableProperty } from '@/lib/property24-comparables';

const subject: PropertyFacts = {
  title: 'Subject',
  address: null,
  suburb: 'Steenberg',
  city: 'Cape Town',
  province: 'Western Cape',
  postalCode: null,
  askingPriceCents: 30_000_000_00,
  bedrooms: 3,
  bathrooms: 2,
  propertyType: 'House',
  floorSizeM2: 307,
  landSizeM2: 709,
  garages: 2,
  parking: 2,
  hasStudy: true,
  hasPool: true,
  hasGarden: true,
  hasFibre: true,
  hasSolar: true,
  hasBatteryBackup: true,
  leviesCents: 1_388_000,
  ratesAndTaxesCents: 656_400,
};

function comparable(
  id: string,
  priceCents: number | null,
  floorM2: number | null,
): ComparableProperty {
  return {
    listingId: id,
    sourceUrl: `https://www.property24.com/for-sale/${id}`,
    facts: {
      ...subject,
      title: id,
      askingPriceCents: priceCents,
      floorSizeM2: floorM2,
    },
    evidence: [],
    similarity: 1,
  };
}

test('calculates deterministic active asking-price statistics', () => {
  const result = calculateMarketIntelligence(subject, [
    comparable('a', 30_000_000_00, 300),
    comparable('b', 35_000_000_00, 350),
  ]);

  assert.equal(result.comparableCount, 2);
  assert.equal(result.askingPriceCents.min, 30_000_000_00);
  assert.equal(result.askingPriceCents.median, 32_500_000_00);
  assert.equal(result.askingPriceCents.max, 35_000_000_00);
});

test('calculates subject price per square metre', () => {
  const result = calculateMarketIntelligence(subject, []);

  assert.equal(
    Math.round(result.subjectPricePerM2Cents ?? 0),
    Math.round(30_000_000_00 / 307),
  );
});

test('calculates subject position against comparable median', () => {
  const result = calculateMarketIntelligence(subject, [
    comparable('a', 32_000_000_00, 300),
    comparable('b', 34_000_000_00, 350),
  ]);

  assert.equal(result.askingPriceCents.median, 33_000_000_00);
  assert.ok(result.subjectVsMedianPercent !== null);
  assert.equal(result.marketPosition, 'Below Comparable Median');
});

test('calculates comparable price per square metre only from verified fields', () => {
  const result = calculateMarketIntelligence(subject, [
    comparable('valid', 30_000_000_00, 300),
    comparable('missing-floor', 35_000_000_00, null),
    comparable('missing-price', null, 300),
  ]);

  assert.equal(result.pricePerM2Cents.median, 10_000_000);
});

test('returns insufficient data when there are no usable comparables', () => {
  const result = calculateMarketIntelligence(subject, []);

  assert.equal(result.comparableCount, 0);
  assert.equal(result.askingPriceCents.min, null);
  assert.equal(result.askingPriceCents.median, null);
  assert.equal(result.askingPriceCents.max, null);
  assert.equal(result.subjectVsMedianPercent, null);
  assert.equal(result.marketPosition, 'Insufficient Data');
});

test('does not describe active asking prices as a valuation', () => {
  const result = calculateMarketIntelligence(subject, []);

  assert.equal(
    result.disclaimer,
    'Active asking-price comparison — not a valuation.',
  );
});
