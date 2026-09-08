import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateInvestorReport,
} from '../lib/investor-report-engine';

import type {
  PropertyEvidence,
  PropertyFacts,
} from '../lib/property-types';

import type {
  ComparableProperty,
} from '../lib/property24-comparables';

function facts(
  overrides: Partial<PropertyFacts> = {},
): PropertyFacts {
  return {
    title: '3 Bedroom House',
    address: '1 Example Street, Cape Town',
    suburb: 'Steenberg Golf Estate',
    city: 'Cape Town',
    province: 'Western Cape',
    postalCode: '7945',
    askingPriceCents: 30_000_000_00,
    bedrooms: 3,
    bathrooms: 2,
    propertyType: 'House',
    floorSizeM2: 307,
    landSizeM2: 709,
    leviesCents: 13_880_00,
    ratesAndTaxesCents: 6_564_00,
    garages: 2,
    parking: 2,
    hasStudy: true,
    hasPool: true,
    hasGarden: true,
    hasFibre: true,
    hasSolar: true,
    hasBatteryBackup: true,
    ...overrides,
  };
}

function evidence(
  fields: (keyof PropertyFacts)[],
): PropertyEvidence[] {
  return fields.map((field) => ({
    field,
    value: facts()[field] as string | number | boolean,
    source: 'html',
  }));
}

function comparable(
  id: string,
  priceCents: number,
  floorSizeM2: number,
  similarity = 0.95,
): ComparableProperty {
  return {
    listingId: id,
    sourceUrl:
      `https://www.property24.com/for-sale/example/${id}`,
    facts: facts({
      title: `Comparable ${id}`,
      askingPriceCents: priceCents,
      floorSizeM2,
    }),
    evidence: evidence([
      'askingPriceCents',
      'floorSizeM2',
      'propertyType',
    ]),
    similarity,
  };
}

test('builds a Pro report from verified active comparable evidence', () => {
  const result = calculateInvestorReport({
    facts: facts(),
    evidence: evidence([
      'title',
      'address',
      'askingPriceCents',
      'bedrooms',
      'bathrooms',
      'propertyType',
      'floorSizeM2',
      'landSizeM2',
      'leviesCents',
      'ratesAndTaxesCents',
    ]),
    comparables: [
      comparable('a', 28_000_000_00, 290),
      comparable('b', 32_000_000_00, 310),
      comparable('c', 34_000_000_00, 330),
    ],
  });

  assert.equal(
    result.comparableSales.status,
    'SUPPORTED',
  );

  assert.equal(
    result.comparableSales.methodology,
    'active_asking_price',
  );

  assert.equal(
    result.comparableSales.isHistoricalSalesData,
    false,
  );

  assert.equal(
    result.negotiationOpportunities.status,
    'SUPPORTED',
  );

  assert.ok(
    result.investmentRisks.items.length > 0,
  );
});

test('does not fabricate rental demand evidence', () => {
  const result = calculateInvestorReport({
    facts: facts(),
    evidence: evidence([
      'askingPriceCents',
      'propertyType',
      'floorSizeM2',
    ]),
    comparables: [],
  });

  assert.equal(
    result.rentalDemand.status,
    'INSUFFICIENT_DATA',
  );

  assert.equal(
    result.rentalDemand.verifiedRentalEvidence,
    false,
  );
});

test('does not fabricate growth forecasts', () => {
  const result = calculateInvestorReport({
    facts: facts(),
    evidence: evidence([
      'askingPriceCents',
      'propertyType',
      'floorSizeM2',
    ]),
    comparables: [],
  });

  assert.equal(
    result.growthOutlook.status,
    'INSUFFICIENT_DATA',
  );

  assert.equal(
    result.growthOutlook.projectedGrowthPercent,
    null,
  );
});

test('does not fabricate an exit value', () => {
  const result = calculateInvestorReport({
    facts: facts(),
    evidence: evidence([
      'askingPriceCents',
      'propertyType',
      'floorSizeM2',
    ]),
    comparables: [],
  });

  assert.equal(
    result.exitStrategy.status,
    'INSUFFICIENT_DATA',
  );

  assert.equal(
    result.exitStrategy.estimatedExitValueCents,
    null,
  );
});

test('identifies price-based negotiation opportunity below comparable median', () => {
  const result = calculateInvestorReport({
    facts: facts({
      askingPriceCents: 27_000_000_00,
    }),
    evidence: evidence([
      'askingPriceCents',
      'propertyType',
      'floorSizeM2',
      'leviesCents',
      'ratesAndTaxesCents',
    ]),
    comparables: [
      comparable('a', 30_000_000_00, 300),
      comparable('b', 32_000_000_00, 310),
      comparable('c', 34_000_000_00, 320),
    ],
  });

  assert.equal(
    result.negotiationOpportunities.status,
    'SUPPORTED',
  );

  assert.ok(
    result.negotiationOpportunities.opportunities.some(
      (item) =>
        item.toLowerCase().includes('asking price'),
    ),
  );
});

test('reports evidence gaps explicitly when Pro data is limited', () => {
  const result = calculateInvestorReport({
    facts: facts({
      askingPriceCents: null,
      address: null,
      floorSizeM2: null,
      landSizeM2: null,
    }),
    evidence: [],
    comparables: [],
  });

  assert.equal(
    result.comparableSales.status,
    'INSUFFICIENT_DATA',
  );

  assert.equal(
    result.rentalDemand.status,
    'INSUFFICIENT_DATA',
  );

  assert.equal(
    result.growthOutlook.status,
    'INSUFFICIENT_DATA',
  );

  assert.equal(
    result.exitStrategy.status,
    'INSUFFICIENT_DATA',
  );

  assert.ok(
    result.limitations.length > 0,
  );
});
