import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRiskExposures, riskExposuresToLimitations } from '@/lib/risk-exposure';
import type { PropertyFacts } from '@/lib/property-types';
import type { MarketIntelligence } from '@/lib/market-intelligence';

test('risk exposure converts missing price evidence into buyer action', () => {
  const facts = { askingPriceCents: 3_500_000_00, ratesAndTaxesCents: null, leviesCents: null, floorSizeM2: null, landSizeM2: 200 } as PropertyFacts;
  const market = { verifiedAchievedSaleCount: 0 } as MarketIntelligence;

  const exposures = buildRiskExposures(facts, market);
  const limitations = riskExposuresToLimitations(exposures);

  assert.ok(exposures.some((item) => item.category === 'PRICE'));
  assert.ok(limitations.some((item) => item.includes('Overpayment exposure is therefore unquantified')));
  assert.ok(limitations.some((item) => item.includes('Obtain independent market and property-record evidence')));
  assert.ok(limitations.some((item) => item.includes('legal review')));
});

test('three achieved sales remove the price evidence risk exposure', () => {
  const facts = { askingPriceCents: 3_500_000_00, ratesAndTaxesCents: 7_000_00, leviesCents: 0, floorSizeM2: 200, landSizeM2: 400 } as PropertyFacts;
  const market = { verifiedAchievedSaleCount: 3 } as MarketIntelligence;

  const exposures = buildRiskExposures(facts, market);

  assert.equal(exposures.some((item) => item.category === 'PRICE'), false);
});
