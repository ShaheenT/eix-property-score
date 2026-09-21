import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateAcquisitionIntelligence } from '@/lib/acquisition-intelligence';
import type { PropertyFacts } from '@/lib/property-types';

const baseFacts: PropertyFacts = {
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

test('calculates the 10% deposit and 90% loan scenario', () => {
  const result = calculateAcquisitionIntelligence(baseFacts);

  assert.equal(result.purchasePriceCents, 3_000_000_000);
  assert.equal(result.depositPercent, 10);
  assert.equal(result.depositCents, 300_000_000);
  assert.equal(result.loanToValuePercent, 90);
  assert.equal(result.loanAmountCents, 2_700_000_000);
});

test('calculates current SARS transfer duty for a R30m purchase scenario', () => {
  const result = calculateAcquisitionIntelligence(baseFacts);

  assert.equal(result.transferDutyCents, 341_115_600);
  assert.equal(result.transferDutySchedule, 'SARS_2026_2027');
  assert.equal(result.transferDutyBasis, 'purchase_price_assumption');
});

test('calculates the bond repayment scenario deterministically', () => {
  const result = calculateAcquisitionIntelligence(baseFacts);

  assert.equal(result.bondAnnualInterestPercent, 10.25);
  assert.equal(result.bondTermYears, 20);
  assert.equal(result.bondMonthlyPaymentCents, 28_793_600);
});

test('uses only verified recurring property costs', () => {
  const result = calculateAcquisitionIntelligence(baseFacts);

  assert.equal(result.verifiedRecurringMonthlyCostsCents, 2_044_400);
  assert.deepEqual(result.verifiedRecurringMonthlyCosts, {
    leviesCents: 1_388_000,
    ratesAndTaxesCents: 656_400,
  });
});

test('calculates known upfront cash as deposit plus transfer duty only', () => {
  const result = calculateAcquisitionIntelligence(baseFacts);

  assert.equal(result.knownUpfrontCashRequiredCents, 641_115_600);
});

test('does not fabricate acquisition amounts when asking price is missing', () => {
  const facts = { ...baseFacts, askingPriceCents: null };
  const result = calculateAcquisitionIntelligence(facts);

  assert.equal(result.depositCents, null);
  assert.equal(result.loanAmountCents, null);
  assert.equal(result.transferDutyCents, null);
  assert.equal(result.bondMonthlyPaymentCents, null);
  assert.equal(result.knownUpfrontCashRequiredCents, null);
});

test('keeps unverified transaction costs explicitly outside the calculated total', () => {
  const result = calculateAcquisitionIntelligence(baseFacts);

  assert.ok(result.unknownCosts.some((item) => item.includes('Conveyancing')));
  assert.ok(result.unknownCosts.some((item) => item.includes('Bond registration')));
  assert.ok(result.unknownCosts.some((item) => item.includes('VAT')));
});
