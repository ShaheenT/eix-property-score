import test from 'node:test';
import assert from 'node:assert/strict';

import type { PropertyFacts } from '@/lib/property-types';
import type { MarketIntelligence } from '@/lib/market-intelligence';
import type { AcquisitionIntelligence } from '@/lib/acquisition-intelligence';
import {
  evaluateDecision,
} from '@/lib/decision-engine';

const facts: PropertyFacts = {
  title: '3 Bedroom House for sale in Steenberg Golf Estate',
  address: 'Steenberg Golf Estate, Cape Town, Western Cape',
  suburb: 'Steenberg Golf Estate',
  city: 'Cape Town',
  province: 'Western Cape',
  postalCode: null,
  askingPriceCents: 3_000_000_000,
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

const acquisition: AcquisitionIntelligence = {
  purchasePriceCents: 3_000_000_000,
  depositPercent: 10,
  depositCents: 300_000_000,
  loanToValuePercent: 90,
  loanAmountCents: 2_700_000_000,
  transferDutyCents: 341_115_600,
  transferDutySchedule: 'SARS_2026_2027',
  transferDutyBasis: 'purchase_price_assumption',
  bondAnnualInterestPercent: 11.5,
  bondTermYears: 20,
  bondMonthlyPaymentCents: 28_793_600,
  verifiedRecurringMonthlyCostsCents: 2_044_400,
  verifiedRecurringMonthlyCosts: {
    leviesCents: 1_388_000,
    ratesAndTaxesCents: 656_400,
  },
  knownUpfrontCashRequiredCents: 641_115_600,
  assumptions: [
    'Deposit scenario assumes 10% of asking price.',
    'Bond scenario assumes 90% loan-to-value, 10.5% annual interest and a 20-year term.',
  ],
  unknownCosts: [
    'Conveyancing and transfer attorney fees are not included.',
    'Bond registration costs are not included.',
    'VAT treatment is not verified.',
  ],
};

function market(
  position: MarketIntelligence['marketPosition'],
  subjectVsMedianPercent: number | null,
): MarketIntelligence {
  return {
    comparableCount: 2,
    verifiedAchievedSaleCount: 0,
    pendingSaleCount: 0,
    activeListingCount: 2,
    askingPriceCents: {
      min: 2_900_000_000,
      median: 3_300_000_000,
      max: 3_700_000_000,
    },
    pricePerM2Cents: {
      min: 9_000_000,
      median: 10_000_000,
      max: 11_000_000,
    },
    achievedSalePriceCents: { min: null, median: null, max: null },
    achievedPricePerM2Cents: { min: null, median: null, max: null },
    subjectPricePerM2Cents: 9_771_987,
    subjectVsMedianPercent,
    marketPosition: position,
    methodology: 'achieved_sales_first',
    disclaimer: 'Achieved-sale evidence is used for price fairness; active asking listings are context only. This is not a formal valuation.',
  };
}

test('returns NEGOTIATE when a buy-to-live property is below the comparable median', () => {
  const result = evaluateDecision(
    'buy_to_live',
    facts,
    market('Below Comparable Median', -9.09),
    acquisition,
  );

  assert.equal(result.decision, 'NEGOTIATE');
  assert.equal(result.confidence, 'medium');
  assert.ok(
    result.reasons.some((reason) =>
      reason.includes('below the active comparable asking-price median'),
    ),
  );
});

test('does not claim BUY without explicit affordability evidence', () => {
  const result = evaluateDecision(
    'buy_to_live',
    facts,
    market('At Comparable Median', 0),
    acquisition,
  );

  assert.equal(result.decision, 'INVESTIGATE');
  assert.ok(
    result.unknowns.some((unknown) =>
      unknown.includes('Buyer affordability'),
    ),
  );
});

test('returns PASS when the known upfront cash exceeds the buyer constraint', () => {
  const result = evaluateDecision(
    'buy_to_live',
    facts,
    market('At Comparable Median', 0),
    acquisition,
    {
      maxKnownUpfrontCashCents: 500_000_000,
    },
  );

  assert.equal(result.decision, 'PASS');
  assert.equal(result.confidence, 'high');
});

test('returns PASS when minimum bedroom requirement is not met', () => {
  const result = evaluateDecision(
    'buy_to_live',
    { ...facts, bedrooms: 3 },
    market('At Comparable Median', 0),
    acquisition,
    {
      minimumBedrooms: 4,
    },
  );

  assert.equal(result.decision, 'PASS');
  assert.equal(result.confidence, 'high');
});

test('returns INSUFFICIENT_DATA for rental without verified rental income', () => {
  const result = evaluateDecision(
    'rental',
    facts,
    market('Below Comparable Median', -9.09),
    acquisition,
  );

  assert.equal(result.decision, 'INSUFFICIENT_DATA');
  assert.ok(
    result.unknowns.some((unknown) =>
      unknown.includes('Verified rental income'),
    ),
  );
});

test('returns INSUFFICIENT_DATA for flip without renovation and exit evidence', () => {
  const result = evaluateDecision(
    'flip',
    facts,
    market('Below Comparable Median', -9.09),
    acquisition,
  );

  assert.equal(result.decision, 'INSUFFICIENT_DATA');
  assert.ok(
    result.unknowns.some((unknown) =>
      unknown.includes('Renovation'),
    ),
  );
  assert.ok(
    result.unknowns.some((unknown) =>
      unknown.includes('Exit value'),
    ),
  );
});

test('returns INSUFFICIENT_DATA when asking price is unavailable', () => {
  const result = evaluateDecision(
    'buy_to_live',
    { ...facts, askingPriceCents: null },
    market('Insufficient Data', null),
    {
      ...acquisition,
      purchasePriceCents: null,
      depositCents: null,
      loanAmountCents: null,
      transferDutyCents: null,
      bondMonthlyPaymentCents: null,
      knownUpfrontCashRequiredCents: null,
    },
  );

  assert.equal(result.decision, 'INSUFFICIENT_DATA');
  assert.equal(result.confidence, 'high');
});

test('returns INVESTIGATE when the property is above the comparable median', () => {
  const result = evaluateDecision(
    'buy_to_live',
    facts,
    market('Above Comparable Median', 8.5),
    acquisition,
  );

  assert.equal(result.decision, 'INVESTIGATE');
  assert.equal(result.confidence, 'medium');
});

test('returns INVESTIGATE when comparable market evidence is unavailable', () => {
  const result = evaluateDecision(
    'buy_to_live',
    facts,
    market('Insufficient Data', null),
    acquisition,
  );

  assert.equal(result.decision, 'INVESTIGATE');
  assert.ok(
    result.unknowns.some((unknown) =>
      unknown.includes('Comparable-market position'),
    ),
  );
});

test('uses only explicit assumptions and does not fabricate missing transaction costs', () => {
  const result = evaluateDecision(
    'buy_to_live',
    facts,
    market('Below Comparable Median', -9.09),
    acquisition,
  );

  assert.ok(
    result.unknowns.length > 0,
    'Decision result should preserve material unknowns.',
  );

  assert.ok(
    !result.reasons.some((reason) =>
      reason.toLowerCase().includes('guaranteed profit'),
    ),
  );
});

test('returns BUY when affordability passes and asking price is below the comparable median', () => {
  const result = evaluateDecision(
    'buy_to_live',
    facts,
    market('Below Comparable Median', -9.09),
    acquisition,
    {
      maxKnownUpfrontCashCents: 700_000_000,
    },
  );

  assert.equal(result.decision, 'BUY');
  assert.equal(result.confidence, 'medium');
  assert.ok(
    result.reasons.some((reason) =>
      reason.includes('below the active comparable asking-price median'),
    ),
  );
  assert.ok(
    result.reasons.some((reason) =>
      reason.includes('affordability constraint passes'),
    ),
  );
});

test('does not return BUY from a property requirement constraint alone', () => {
  const result = evaluateDecision(
    'buy_to_live',
    facts,
    market('Below Comparable Median', -9.09),
    acquisition,
    {
      minimumBedrooms: 3,
    },
  );

  assert.equal(result.decision, 'NEGOTIATE');
});
