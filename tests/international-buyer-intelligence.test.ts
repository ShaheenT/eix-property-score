
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateInternationalBuyerIntelligence,
  type InternationalBuyerProfile,
} from '../lib/international-buyer-intelligence';
import { calculateReport } from '../lib/report-engine';
import type {
  PropertyEvidence,
  PropertyFacts,
} from '../lib/property-types';
import type { MarketIntelligence } from '../lib/market-intelligence';
import type { AcquisitionIntelligence } from '../lib/acquisition-intelligence';

const facts: PropertyFacts = {
  title: 'Luxury Cape Town Property',
  address: '1 Example Street, Cape Town',
  suburb: 'Camps Bay',
  city: 'Cape Town',
  province: 'Western Cape',
  postalCode: '8005',
  askingPriceCents: 250000000,
  bedrooms: 4,
  bathrooms: 3,
  propertyType: 'House',
  floorSizeM2: 320,
  landSizeM2: 700,
  leviesCents: null,
  ratesAndTaxesCents: null,
  garages: 2,
  parking: 2,
  hasStudy: null,
  hasPool: true,
  hasGarden: true,
  hasFibre: true,
  hasSolar: null,
  hasBatteryBackup: null,
};

const evidence: PropertyEvidence[] = [
  {
    field: 'address',
    value: facts.address!,
    source: 'json_ld',
  },
  {
    field: 'askingPriceCents',
    value: facts.askingPriceCents!,
    source: 'json_ld',
  },
  {
    field: 'propertyType',
    value: facts.propertyType!,
    source: 'json_ld',
  },
  {
    field: 'floorSizeM2',
    value: facts.floorSizeM2!,
    source: 'json_ld',
  },
  {
    field: 'bedrooms',
    value: facts.bedrooms!,
    source: 'json_ld',
  },
  {
    field: 'bathrooms',
    value: facts.bathrooms!,
    source: 'json_ld',
  },
  {
    field: 'hasFibre',
    value: facts.hasFibre!,
    source: 'json_ld',
  },
  {
    field: 'hasPool',
    value: facts.hasPool!,
    source: 'json_ld',
  },
  {
    field: 'hasGarden',
    value: facts.hasGarden!,
    source: 'json_ld',
  },
];

const market: MarketIntelligence = {
  comparableCount: 3,
  askingPriceCents: {
    min: 220000000,
    median: 240000000,
    max: 280000000,
  },
  pricePerM2Cents: {
    min: 650000,
    median: 750000,
    max: 875000,
  },
  subjectPricePerM2Cents: 781250,
  subjectVsMedianPercent: 4.1667,
  marketPosition: 'Above Comparable Median',
  methodology: 'active_asking_price',
  disclaimer:
    'Active asking-price comparison — not a valuation.',
};

const acquisition: AcquisitionIntelligence = {
  purchasePriceCents: 250000000,
  depositPercent: 10,
  depositCents: 25000000,
  loanToValuePercent: 90,
  loanAmountCents: 225000000,
  transferDutyCents: 23400000,
  transferDutySchedule: 'SARS_2026_2027',
  transferDutyBasis: 'purchase_price_assumption',
  bondAnnualInterestPercent: 11.5,
  bondTermYears: 20,
  bondMonthlyPaymentCents: 2360000,
  verifiedRecurringMonthlyCostsCents: null,
  verifiedRecurringMonthlyCosts: {
    leviesCents: null,
    ratesAndTaxesCents: null,
  },
  knownUpfrontCashRequiredCents: 48400000,
  assumptions: [
    'Transfer duty uses the SARS 2026/27 schedule and is calculated against the supplied purchase-price assumption.',
  ],
  unknownCosts: [
    'Conveyancing costs are not included.',
    'Bond registration costs are not included.',
  ],
};

test(
  'generates International Buyer Intelligence for an international buyer',
  () => {
    const profile: InternationalBuyerProfile = {
      buyerType: 'international',
      buyerCountry: 'United Kingdom',
      buyerPurpose: 'Retirement/Lifestyle',
      buyerBudget: 'R20m-R30m',
    };

    const result = calculateInternationalBuyerIntelligence({
      profile,
      facts,
      evidence,
      market,
      acquisition,
    });

    assert.equal(result.profile.buyerType, 'international');
    assert.equal(result.profile.buyerCountry, 'United Kingdom');
    assert.equal(
      result.profile.buyerPurpose,
      'Retirement/Lifestyle',
    );
    assert.equal(result.profile.buyerBudget, 'R20m-R30m');

    assert.equal(
      result.propertySnapshot.askingPriceCents,
      250000000,
    );

    assert.equal(
      result.marketPosition,
      'Above Comparable Median',
    );

    assert.equal(
      result.subjectVsComparableMedianPercent,
      4.1667,
    );

    assert.equal(
      result.acquisitionSnapshot.depositCents,
      25000000,
    );

    assert.equal(
      result.acquisitionSnapshot.transferDutyCents,
      23400000,
    );

    assert.equal(result.lifestyleIndicators.fibre, true);
    assert.equal(result.lifestyleIndicators.pool, true);
    assert.equal(result.lifestyleIndicators.garden, true);
  },
);

test(
  'reports evidence gaps instead of inventing missing property facts',
  () => {
    const incompleteFacts: PropertyFacts = {
      ...facts,
      address: null,
      floorSizeM2: null,
      bedrooms: null,
      bathrooms: null,
      hasSolar: null,
      hasBatteryBackup: null,
    };

    const result = calculateInternationalBuyerIntelligence({
      profile: {
        buyerType: 'international',
        buyerCountry: 'Germany',
        buyerPurpose: 'Holiday Home',
        buyerBudget: 'R10m-R20m',
      },
      facts: incompleteFacts,
      evidence: [],
      market: {
        ...market,
        comparableCount: 0,
        marketPosition: 'Insufficient Data',
        subjectVsMedianPercent: null,
      },
      acquisition: {
        ...acquisition,
        purchasePriceCents: null,
        depositCents: null,
        loanAmountCents: null,
        transferDutyCents: null,
        knownUpfrontCashRequiredCents: null,
        bondMonthlyPaymentCents: null,
      },
    });

    assert.ok(
      result.evidenceGaps.some((gap) =>
        gap.includes('address'),
      ),
    );

    assert.ok(
      result.evidenceGaps.some((gap) =>
        gap.includes('floorSizeM2'),
      ),
    );

    assert.ok(
      result.evidenceGaps.some((gap) =>
        gap.includes('bedrooms'),
      ),
    );

    assert.ok(
      result.evidenceGaps.some((gap) =>
        gap.includes('bathrooms'),
      ),
    );

    assert.ok(
      result.evidenceGaps.some((gap) =>
        gap.includes('hasSolar'),
      ),
    );

    assert.ok(
      result.evidenceGaps.some((gap) =>
        gap.includes('hasBatteryBackup'),
      ),
    );
  },
);

test(
  'does not fabricate live FX, visa, residency or foreign tax conclusions',
  () => {
    const result = calculateInternationalBuyerIntelligence({
      profile: {
        buyerType: 'international',
        buyerCountry: 'United States',
        buyerPurpose: 'Investment',
        buyerBudget: 'R30m+',
      },
      facts,
      evidence,
      market,
      acquisition,
    });

    assert.ok(
      result.assumptions.some((value) =>
        value.includes('foreign-exchange'),
      ),
    );

    assert.ok(
      result.limitations.some((value) =>
        value.includes('immigration and visa eligibility'),
      ),
    );

    assert.ok(
      result.limitations.some((value) =>
        value.includes('Foreign buyer tax obligations'),
      ),
    );

    assert.equal(
      result.propertySnapshot.askingPriceCents,
      facts.askingPriceCents,
    );
  },
);

test(
  'report engine generates international intelligence only for international buyers',
  () => {
    const internationalReport = calculateReport({
      facts,
      evidence,
      goal: 'Buy to Live',
      buyerProfile: {
        buyerType: 'international',
        buyerCountry: 'United Kingdom',
        buyerPurpose: 'Retirement/Lifestyle',
        buyerBudget: 'R20m-R30m',
      },
    });

    assert.ok(
      internationalReport.internationalBuyerIntelligence,
    );

    assert.equal(
      internationalReport.internationalBuyerIntelligence?.profile
        .buyerCountry,
      'United Kingdom',
    );

    const SouthAfricanReport = calculateReport({
      facts,
      evidence,
      goal: 'Buy to Live',
      buyerProfile: {
        buyerType: 'south_african',
        buyerCountry: null,
        buyerPurpose: null,
        buyerBudget: null,
      },
    });

    assert.equal(
      SouthAfricanReport.internationalBuyerIntelligence,
      null,
    );
  },
);

test(
  'preserves existing market and acquisition intelligence',
  () => {
    const result = calculateReport({
      facts,
      evidence,
      goal: 'Buy to Live',
      buyerProfile: {
        buyerType: 'international',
        buyerCountry: 'France',
        buyerPurpose: 'Holiday Home',
        buyerBudget: 'R20m-R30m',
      },
    });

    assert.equal(
      result.marketIntelligence.marketPosition,
      'Insufficient Data',
    );

    assert.equal(
      result.acquisitionIntelligence.purchasePriceCents,
      facts.askingPriceCents,
    );

    assert.equal(
      result.acquisitionIntelligence.depositPercent,
      10,
    );

    assert.equal(
      result.investmentScore,
      null,
    );
  },
);
