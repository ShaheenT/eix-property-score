import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateReport } from '../lib/report-engine';
import type { PropertyEvidence, PropertyFacts } from '../lib/property-types';

const facts: PropertyFacts = {
  title: 'Verified Test Property', address: '1 Test Road, Cape Town, Western Cape', suburb: 'Test Suburb', city: 'Cape Town', province: 'Western Cape', postalCode: '8000', askingPriceCents: 200000000, bedrooms: 3, bathrooms: 2, propertyType: 'House', floorSizeM2: 150, landSizeM2: 400,
  leviesCents: null, ratesAndTaxesCents: null, garages: null, parking: null,
  hasStudy: null, hasPool: null, hasGarden: null, hasFibre: null,
  hasSolar: null, hasBatteryBackup: null,
};
const evidence: PropertyEvidence[] = [
  { field: 'title', value: facts.title!, source: 'json_ld' }, { field: 'address', value: facts.address!, source: 'json_ld' },
  { field: 'askingPriceCents', value: '200000000', source: 'json_ld' }, { field: 'bedrooms', value: '3', source: 'json_ld' },
  { field: 'bathrooms', value: '2', source: 'json_ld' }, { field: 'propertyType', value: 'House', source: 'json_ld' },
  { field: 'floorSizeM2', value: '150', source: 'json_ld' }, { field: 'landSizeM2', value: '400', source: 'json_ld' },
];

test('complete verified listing does not receive a market-facing score without three achieved sales', () => {
  const result = calculateReport({ facts, evidence, goal: 'Buy to Live' });
  assert.equal(result.investmentScore, null);
  assert.equal(result.aiConfidence, 70);
  assert.equal(result.confidenceLabel, 'Medium');
  assert.equal(result.scoreBreakdown.verifiedAchievedSaleCount, 0);
  assert.ok(result.limitations.some((item) => item.includes('Market position is evidence-limited')));
});

test('does not fabricate rental yield without verified rent', () => {
  const result = calculateReport({ facts, evidence, goal: 'Rental' });

  assert.equal(result.rentalYieldPercent, null);
  assert.equal(result.decision.decision, 'INSUFFICIENT_DATA');
  assert.equal(result.recommendation, 'Insufficient Data');
  assert.ok(
    result.limitations.some((item) => item.includes('Verified rental income is unavailable.')),
  );
});

test('bond scenario is explicitly assumption-based', () => {
  const result = calculateReport({ facts, evidence, goal: 'Buy to Live' });

  assert.ok(result.bondMonthlyPaymentCents !== null);
  assert.ok(result.assumptions.some((item) => item.includes('Deposit scenario assumes 10% of asking price.')));
});

test('low evidence cannot produce a confident recommendation', () => {
  const sparse: PropertyFacts = { ...facts, askingPriceCents: null, address: null, floorSizeM2: null, landSizeM2: null };
  const result = calculateReport({ facts: sparse, evidence: [], goal: 'Rental' });
  assert.equal(result.recommendation, 'Insufficient Data');
  assert.equal(result.investmentScore, null);
  assert.equal(result.riskLevel, 'Unrated');
});

test('report engine exposes acquisition intelligence as the authoritative bond scenario', () => {
  const result = calculateReport({
    facts,
    evidence,
    goal: 'Buy to Live',
  });

  assert.equal(result.bondLoanAmountCents, result.acquisitionIntelligence.loanAmountCents);
  assert.equal(result.bondMonthlyPaymentCents, result.acquisitionIntelligence.bondMonthlyPaymentCents);
  assert.equal(result.acquisitionIntelligence.purchasePriceCents, facts.askingPriceCents);
});

test('report engine requires three achieved sales before a market decision', () => {
  const comparables = [250000000, 260000000, 270000000].map((askingPriceCents, index) => ({
    listingId: `sale-${index + 1}`,
    sourceUrl: `https://www.property24.com/for-sale/house/cape-town/sale-${index + 1}`,
    facts: { ...facts, title: `Achieved sale ${index + 1}`, askingPriceCents, floorSizeM2: 150 },
    evidence: [],
    similarity: 0.95,
    saleStatus: 'registered_sale' as const,
  }));

  const result = calculateReport({ facts, evidence, goal: 'Buy to Live', comparables });
  assert.equal(result.marketIntelligence.verifiedAchievedSaleCount, 3);
  assert.equal(result.decision.decision, 'NEGOTIATE');
  assert.equal(result.recommendation, 'Consider');
  assert.equal(result.investmentScore !== null, true);
});

test('report engine preserves insufficient-data decision for rental', () => {
  const result = calculateReport({ facts, evidence, goal: 'Rental' });

  assert.equal(result.decision.decision, 'INSUFFICIENT_DATA');
  assert.equal(result.recommendation, 'Insufficient Data');
  assert.equal(result.rentalYieldPercent, null);
});
