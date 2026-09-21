import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRiskExposures, riskExposuresToLimitations } from '@/lib/risk-exposure';
import type { PropertyFacts } from '@/lib/property-types';
import type { MarketIntelligence } from '@/lib/market-intelligence';

const facts = (overrides: Partial<PropertyFacts> = {}): PropertyFacts => ({
  title: null,
  address: null,
  suburb: null,
  city: null,
  province: null,
  postalCode: null,
  askingPriceCents: 350_000_000,
  bedrooms: 3,
  bathrooms: 2,
  propertyType: 'House',
  floorSizeM2: 200,
  landSizeM2: 400,
  description: null,
  primaryImageUrl: null,
  leviesCents: 0,
  ratesAndTaxesCents: 70_000,
  garages: null,
  parking: null,
  hasStudy: null,
  hasPool: null,
  hasGarden: null,
  hasFibre: null,
  hasSolar: null,
  hasBatteryBackup: null,
  ...overrides,
});

test('risk exposure converts missing price evidence into buyer action', () => {
  const result = buildRiskExposures(facts({ ratesAndTaxesCents: null, leviesCents: null, floorSizeM2: null }), { verifiedAchievedSaleCount: 0 } as MarketIntelligence);
  const limitations = riskExposuresToLimitations(result);
  assert.ok(result.some((item) => item.category === 'PRICE'));
  assert.ok(limitations.some((item) => item.includes('Overpayment exposure is therefore unquantified')));
  assert.ok(limitations.some((item) => item.includes('Obtain independent market and property-record evidence')));
  assert.ok(limitations.some((item) => item.includes('legal review')));
});

test('three achieved sales remove the price evidence risk exposure', () => {
  const result = buildRiskExposures(facts(), { verifiedAchievedSaleCount: 3 } as MarketIntelligence);
  assert.equal(result.some((item) => item.category === 'PRICE'), false);
});
