import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateReport } from '../lib/report-engine';
import type { PropertyEvidence, PropertyFacts } from '../lib/property-types';

const facts: PropertyFacts = {
  title: 'Verified Test Property',
  address: '1 Test Road, Cape Town, Western Cape',
  suburb: 'Test Suburb',
  city: 'Cape Town',
  province: 'Western Cape',
  postalCode: '8000',
  askingPriceCents: 200000000,
  bedrooms: 3,
  bathrooms: 2,
  propertyType: 'House',
  floorSizeM2: 150,
  landSizeM2: 400,
};

const evidence: PropertyEvidence[] = [
  { field: 'title', value: facts.title!, source: 'json_ld' },
  { field: 'address', value: facts.address!, source: 'json_ld' },
  { field: 'askingPriceCents', value: '200000000', source: 'json_ld' },
  { field: 'bedrooms', value: '3', source: 'json_ld' },
  { field: 'bathrooms', value: '2', source: 'json_ld' },
  { field: 'propertyType', value: 'House', source: 'json_ld' },
  { field: 'floorSizeM2', value: '150', source: 'json_ld' },
  { field: 'landSizeM2', value: '400', source: 'json_ld' },
];

test('calculates a deterministic score from verified facts', () => {
  const result = calculateReport({ facts, evidence, goal: 'Rental' });
  assert.equal(result.investmentScore, 100);
  assert.equal(result.aiConfidence, 100);
  assert.equal(result.confidenceLabel, 'High');
  assert.equal(result.recommendation, 'Strong Buy');
});

test('does not fabricate rental yield without verified rent', () => {
  const result = calculateReport({ facts, evidence, goal: 'Rental' });
  assert.equal(result.rentalYieldPercent, null);
  assert.ok(result.limitations.some((item) => item.includes('rental demand')));
});

test('bond scenario is explicitly assumption-based', () => {
  const result = calculateReport({ facts, evidence, goal: 'Buy to Live' });
  assert.ok(result.bondMonthlyPaymentCents !== null);
  assert.ok(result.assumptions.some((item) => item.includes('10% deposit')));
});

test('low evidence cannot produce a confident recommendation', () => {
  const sparse: PropertyFacts = { ...facts, askingPriceCents: null, address: null, floorSizeM2: null, landSizeM2: null };
  const result = calculateReport({ facts: sparse, evidence: [], goal: 'Rental' });
  assert.equal(result.recommendation, 'Insufficient Data');
  assert.equal(result.investmentScore, 0);
  assert.equal(result.riskLevel, 'Unrated');
});
