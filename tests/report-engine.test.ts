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
  assert.equal(result.aiConfidence, 100);
  assert.equal(result.confidenceLabel, 'High');
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

test('report engine exposes market intelligence and canonical decision', () => {
  const comparable: import('../lib/property24-comparables').ComparableProperty = {
    listingId: 'comparable-1',
    sourceUrl: 'https://www.property24.com/for-sale/house/cape-town/comparable-1',
    facts: { ...facts, title: 'Comparable', askingPriceCents: 250000000, floorSizeM2: 150 },
    evidence: [],
    similarity: 0.95,
    saleStatus: 'active_listing',
  };

  const result = calculateReport({ facts, evidence, goal: 'Buy to Live', comparables: [comparable] });

  assert.equal(result.marketIntelligence.comparableCount, 1);
  assert.equal(result.decision.decision, 'NEGOTIATE');
  assert.equal(result.recommendation, 'Consider');
  assert.equal(result.scoreBreakdown.marketComparableCount, 1);
  assert.ok(result.scoreBreakdown.marketPosition > 0);
});

test('report engine can propagate a BUY decision from the decision engine', () => {
  const comparable: import('../lib/property24-comparables').ComparableProperty = {
    listingId: 'comparable-1',
    sourceUrl: 'https://www.property24.com/for-sale/house/cape-town/comparable-1',
    facts: { ...facts, title: 'Comparable', askingPriceCents: 250000000, floorSizeM2: 150 },
    evidence: [],
    similarity: 0.95,
  };

  const result = calculateReport({
    facts,
    evidence,
    goal: 'Buy to Live',
    comparables: [comparable],
    constraints: { maxKnownUpfrontCashCents: 1000000000 },
  });

  assert.equal(result.decision.decision, 'BUY');
  assert.equal(result.recommendation, 'Buy');
});

test('score is bounded when market evidence is available', () => {
  const comparable: import('../lib/property24-comparables').ComparableProperty = {
    listingId: 'comparable-1',
    sourceUrl: 'https://www.property24.com/for-sale/house/cape-town/comparable-1',
    facts: { ...facts, title: 'Comparable', askingPriceCents: 200000000, floorSizeM2: 150 },
    evidence: [],
    similarity: 0.95,
  };

  const result = calculateReport({ facts, evidence, goal: 'Buy to Live', comparables: [comparable] });
  assert.ok(result.investmentScore !== null);
  assert.ok(result.investmentScore >= 0 && result.investmentScore <= 100);
});

test('report engine preserves insufficient-data decision for rental', () => {
  const result = calculateReport({ facts, evidence, goal: 'Rental' });

  assert.equal(result.decision.decision, 'INSUFFICIENT_DATA');
  assert.equal(result.recommendation, 'Insufficient Data');
  assert.equal(result.rentalYieldPercent, null);
});
