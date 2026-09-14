import assert from 'node:assert/strict';
import test from 'node:test';
import { hashVerificationSnapshot } from '@/lib/verification/hash';

test('verification hash is deterministic for the same canonical snapshot', () => {
  const snapshot = {
    reportId: 'report-1',
    reportType: 'standard_report',
    propertyFacts: { askingPriceCents: 14900000 },
    propertyEvidence: [{ field: 'askingPriceCents', status: 'verified' }],
    investmentScore: 81,
    aiConfidence: 88,
    scoreBreakdown: { value: 40 },
    assumptions: { depositPercent: 20 },
    limitations: ['No municipal approval record supplied.'],
    rentalYieldPercent: 6.2,
    bondMonthlyPaymentCents: 720000,
    bondLoanAmountCents: 11920000,
    riskLevel: 'medium',
    recommendation: 'Proceed with due diligence.',
    confidenceLabel: 'High',
    investorAnalysis: null,
    internationalBuyerAnalysis: null,
    intelligenceRunId: 'run-1',
    intelligenceTrustIndex: 84,
    intelligenceVersion: '1.0.0',
    extractionVersion: '2.1.0',
    generatedAt: '2026-09-15T00:00:00.000Z',
  };

  assert.equal(hashVerificationSnapshot(snapshot), hashVerificationSnapshot({ ...snapshot }));
});

test('verification hash changes when a report-driving field changes', () => {
  const snapshot = {
    reportId: 'report-1',
    reportType: 'standard_report',
    propertyFacts: { askingPriceCents: 14900000 },
    propertyEvidence: [],
    investmentScore: 81,
    aiConfidence: 88,
    scoreBreakdown: {},
    assumptions: {},
    limitations: [],
    rentalYieldPercent: null,
    bondMonthlyPaymentCents: null,
    bondLoanAmountCents: null,
    riskLevel: 'medium',
    recommendation: 'Proceed',
    confidenceLabel: 'High',
    investorAnalysis: null,
    internationalBuyerAnalysis: null,
    intelligenceRunId: 'run-1',
    intelligenceTrustIndex: 84,
    intelligenceVersion: '1.0.0',
    extractionVersion: '2.1.0',
    generatedAt: '2026-09-15T00:00:00.000Z',
  };

  const original = hashVerificationSnapshot(snapshot);
  const changed = hashVerificationSnapshot({ ...snapshot, investmentScore: 80 });
  assert.notEqual(original, changed);
});
