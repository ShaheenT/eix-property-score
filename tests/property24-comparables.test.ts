import test from 'node:test';
import assert from 'node:assert/strict';
import type { PropertyFacts } from '@/lib/property-types';
import {
  extractProperty24ListingId,
  selectProperty24Comparables,
  type ComparableProperty,
} from '@/lib/property24-comparables';

const subject: PropertyFacts = {
  title: 'Subject', address: null, suburb: 'Steenberg', city: 'Cape Town',
  province: 'Western Cape', postalCode: null, askingPriceCents: 30_000_000_00,
  bedrooms: 3, bathrooms: 2, propertyType: 'House', floorSizeM2: 307,
  landSizeM2: 709, garages: 2, parking: 2, hasStudy: true, hasPool: true,
  hasGarden: true, hasFibre: true, hasSolar: true, hasBatteryBackup: true,
  leviesCents: 1_388_000, ratesAndTaxesCents: 656_400,
};

function comparable(id: string, price: number | null, floor: number | null, similarity: number | null = 1): ComparableProperty {
  return {
    listingId: id,
    sourceUrl: `https://www.property24.com/for-sale/house/cape-town/${id}`,
    facts: { ...subject, title: id, askingPriceCents: price, floorSizeM2: floor },
    evidence: [],
    similarity,
  };
}

test('extracts a Property24 listing id from a listing URL', () => {
  assert.equal(extractProperty24ListingId('https://www.property24.com/for-sale/house/steenberg/117227369'), '117227369');
});

test('rejects non-Property24 URLs for listing-id extraction', () => {
  assert.equal(extractProperty24ListingId('https://example.com/property/117227369'), null);
});

test('excludes the subject listing', () => {
  const result = selectProperty24Comparables(subject, [comparable('117227369', 30_000_000_00, 307), comparable('other', 35_000_000_00, 320)], { subjectListingId: '117227369' });
  assert.deepEqual(result.map((x) => x.listingId), ['other']);
});

test('requires verified asking price and floor size', () => {
  const result = selectProperty24Comparables(subject, [
    comparable('price-missing', null, 300),
    comparable('floor-missing', 35_000_000_00, null),
    comparable('valid', 32_000_000_00, 310),
  ]);
  assert.deepEqual(result.map((x) => x.listingId), ['valid']);
});

test('prefers matching property type and deterministic similarity ordering', () => {
  const apartment = comparable('apartment', 28_000_000_00, 300, 0.99);
  apartment.facts.propertyType = 'Apartment';
  const house = comparable('house', 35_000_000_00, 320, 0.8);
  const result = selectProperty24Comparables(subject, [house, apartment]);
  assert.deepEqual(result.map((x) => x.listingId), ['house']);
});
