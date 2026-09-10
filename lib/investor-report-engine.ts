import type {
  PropertyEvidence,
  PropertyFacts,
} from '@/lib/property-types';

import {
  calculateAcquisitionIntelligence,
  type AcquisitionIntelligence,
} from '@/lib/acquisition-intelligence';

import {
  calculateMarketIntelligence,
  type MarketIntelligence,
} from '@/lib/market-intelligence';

import type {
  ComparableProperty,
} from '@/lib/property24-comparables';

type EvidenceStatus =
  | 'SUPPORTED'
  | 'PARTIAL'
  | 'INSUFFICIENT_DATA';

export interface InvestorComparableSales {
  status: EvidenceStatus;
  methodology: 'active_asking_price' | 'none';
  isHistoricalSalesData: boolean;
  comparableCount: number;
  medianAskingPriceCents: number | null;
  subjectVsMedianPercent: number | null;
  marketPosition: MarketIntelligence['marketPosition'];
  summary: string;
}

export interface InvestorRentalDemand {
  status: 'SUPPORTED' | 'PARTIAL' | 'INSUFFICIENT_DATA';
  verifiedRentalEvidence: boolean;
  rentalIncomeCents: number | null;
  rentalYieldPercent: number | null;
  summary: string;
}

export interface NegotiationOpportunities {
  status: EvidenceStatus;
  opportunities: string[];
  summary: string;
}

export interface InvestmentRisk {
  severity: 'Low' | 'Moderate' | 'High';
  risk: string;
  reason: string;
}

export interface InvestorInvestmentRisks {
  status: EvidenceStatus;
  items: InvestmentRisk[];
  summary: string;
}

export interface GrowthOutlook {
  status: 'SUPPORTED' | 'PARTIAL' | 'INSUFFICIENT_DATA';
  verifiedGrowthEvidence: boolean;
  historicalGrowthPercent: number | null;
  projectedGrowthPercent: number | null;
  summary: string;
}

export interface ExitStrategy {
  status: 'SUPPORTED' | 'PARTIAL' | 'INSUFFICIENT_DATA';
  estimatedExitValueCents: number | null;
  estimatedHoldingPeriodYears: number | null;
  strategy: string;
  summary: string;
}

export interface InvestorReportEngineOutput {
  reportType: 'investor_report_pro';

  propertySummary: {
    address: string | null;
    suburb: string | null;
    city: string | null;
    province: string | null;
    askingPriceCents: number | null;
    propertyType: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    floorSizeM2: number | null;
    landSizeM2: number | null;
  };

  comparableSales: InvestorComparableSales;
  rentalDemand: InvestorRentalDemand;
  negotiationOpportunities: NegotiationOpportunities;
  investmentRisks: InvestorInvestmentRisks;
  growthOutlook: GrowthOutlook;
  exitStrategy: ExitStrategy;

  acquisitionIntelligence: AcquisitionIntelligence;
  marketIntelligence: MarketIntelligence;

  assumptions: string[];
  limitations: string[];
}

export interface InvestorReportEngineInput {
  facts: PropertyFacts;
  evidence: PropertyEvidence[];
  comparables?: ComparableProperty[];
}

const hasValue = (value: unknown): boolean =>
  value !== null &&
  value !== undefined &&
  value !== '';

function hasEvidence(
  evidence: PropertyEvidence[],
  field: keyof PropertyFacts,
): boolean {
  return evidence.some((item) => item.field === field);
}

function buildComparableSales(
  market: MarketIntelligence,
): InvestorComparableSales {
  if (market.comparableCount === 0) {
    return {
      status: 'INSUFFICIENT_DATA',
      methodology: 'none',
      isHistoricalSalesData: false,
      comparableCount: 0,
      medianAskingPriceCents: null,
      subjectVsMedianPercent: null,
      marketPosition: 'Insufficient Data',
      summary:
        'No verified comparable listings were available for an active asking-price comparison.',
    };
  }

  return {
    status: 'SUPPORTED',
    methodology: 'active_asking_price',
    isHistoricalSalesData: false,
    comparableCount: market.comparableCount,
    medianAskingPriceCents: market.askingPriceCents.median,
    subjectVsMedianPercent: market.subjectVsMedianPercent,
    marketPosition: market.marketPosition,
    summary:
      'The comparison uses active asking prices from the supplied comparable listings. It is not historical sold-price evidence and is not a formal valuation.',
  };
}

function buildRentalDemand(
  facts: PropertyFacts,
  evidence: PropertyEvidence[],
): InvestorRentalDemand {
  /*
   * Rental income is deliberately NOT part of PropertyFacts yet.
   *
   * Therefore this engine cannot honestly calculate rental demand or
   * rental yield from the current verified data contract.
   */
  void facts;
  void evidence;

  return {
    status: 'INSUFFICIENT_DATA',
    verifiedRentalEvidence: false,
    rentalIncomeCents: null,
    rentalYieldPercent: null,
    summary:
      'Verified rental listings, achieved rents, vacancy data or rental-demand evidence were not supplied. Rental demand is therefore not rated.',
  };
}

function buildNegotiationOpportunities(
  facts: PropertyFacts,
  market: MarketIntelligence,
  evidence: PropertyEvidence[],
): NegotiationOpportunities {
  const opportunities: string[] = [];

  if (
    market.marketPosition === 'Below Comparable Median' &&
    market.subjectVsMedianPercent !== null
  ) {
    opportunities.push(
      `The asking price is ${Math.abs(market.subjectVsMedianPercent).toFixed(1)}% below the active comparable asking-price median; this supports investigating whether the seller has pricing flexibility or whether the lower price reflects property-specific factors.`,
    );
  }

  if (
    market.marketPosition === 'Above Comparable Median' &&
    market.subjectVsMedianPercent !== null
  ) {
    opportunities.push(
      `The asking price is ${market.subjectVsMedianPercent.toFixed(1)}% above the active comparable asking-price median; comparable evidence can be used to test the seller's pricing position.`,
    );
  }

  if (facts.leviesCents !== null) {
    opportunities.push(
      'Verified monthly levies are available and should be included in negotiations around total ownership cost.',
    );
  }

  if (facts.ratesAndTaxesCents !== null) {
    opportunities.push(
      "Verified rates and taxes are available and should be considered when comparing the property's total monthly carrying cost.",
    );
  }

  const featureEvidence = [
    'garages',
    'parking',
    'hasStudy',
    'hasPool',
    'hasGarden',
    'hasFibre',
    'hasSolar',
    'hasBatteryBackup',
  ] as const;

  const verifiedFeatures = featureEvidence.filter((field) =>
    hasEvidence(evidence, field),
  );

  if (verifiedFeatures.length > 0) {
    opportunities.push(
      `The listing contains ${verifiedFeatures.length} verified property-feature fields that can be used to compare the subject against competing listings.`,
    );
  }

  if (opportunities.length === 0) {
    return {
      status: 'INSUFFICIENT_DATA',
      opportunities: [],
      summary:
        'There is insufficient verified pricing or property-specific evidence to identify a defensible negotiation opportunity.',
    };
  }

  return {
    status: 'SUPPORTED',
    opportunities,
    summary:
      'Negotiation opportunities are based only on verified listing facts and active comparable asking-price evidence.',
  };
}

function buildInvestmentRisks(
  facts: PropertyFacts,
  evidence: PropertyEvidence[],
  market: MarketIntelligence,
  acquisition: AcquisitionIntelligence,
): InvestorInvestmentRisks {
  const items: InvestmentRisk[] = [];

  if (!hasValue(facts.askingPriceCents)) {
    items.push({
      severity: 'High',
      risk: 'Unverified asking price',
      reason:
        'The acquisition calculations cannot be anchored to a verified asking price.',
    });
  }

  if (!hasValue(facts.address)) {
    items.push({
      severity: 'Moderate',
      risk: 'Unverified full address',
      reason:
        'Location-specific due diligence and area intelligence cannot be reliably tied to the property.',
    });
  }

  if (
    !hasValue(facts.floorSizeM2) &&
    !hasValue(facts.landSizeM2)
  ) {
    items.push({
      severity: 'Moderate',
      risk: 'Missing property size evidence',
      reason:
        'Price-per-square-metre analysis cannot be established without verified size data.',
    });
  }

  if (market.comparableCount === 0) {
    items.push({
      severity: 'High',
      risk: 'No comparable market evidence',
      reason:
        'The current dataset does not contain usable comparable listings.',
    });
  }

  if (market.marketPosition === 'Above Comparable Median') {
    items.push({
      severity: 'Moderate',
      risk: 'Above-comparable asking price',
      reason:
        'The subject asking price is above the active comparable median and requires further justification.',
    });
  }

  if (acquisition.transferDutyCents !== null) {
    items.push({
      severity: 'Moderate',
      risk: 'Acquisition-cost exposure',
      reason:
        'Transfer duty and financing assumptions materially affect the cash required to acquire the property.',
    });
  }

  if (
    !hasEvidence(evidence, 'leviesCents') &&
    !hasEvidence(evidence, 'ratesAndTaxesCents')
  ) {
    items.push({
      severity: 'Moderate',
      risk: 'Recurring property costs not verified',
      reason:
        'No verified levy or rates-and-taxes evidence is available in the supplied property data.',
    });
  }

  const highestSeverity = items.some(
    (item) => item.severity === 'High',
  )
    ? 'High'
    : items.some(
          (item) => item.severity === 'Moderate',
        )
      ? 'Moderate'
      : 'Low';

  return {
    status:
      items.length === 0
        ? 'SUPPORTED'
        : items.some((item) => item.severity === 'High')
          ? 'PARTIAL'
          : 'SUPPORTED',
    items,
    summary:
      items.length === 0
        ? 'No material risk was identified from the currently verified evidence.'
        : `${items.length} evidence-based risk consideration${items.length === 1 ? '' : 's'} identified. Highest observed severity: ${highestSeverity}.`,
  };
}

function buildGrowthOutlook(): GrowthOutlook {
  return {
    status: 'INSUFFICIENT_DATA',
    verifiedGrowthEvidence: false,
    historicalGrowthPercent: null,
    projectedGrowthPercent: null,
    summary:
      'No verified historical area-growth dataset or forward-looking market forecast was supplied. A growth percentage is therefore not stated.',
  };
}

function buildExitStrategy(
  market: MarketIntelligence,
): ExitStrategy {
  if (market.comparableCount === 0) {
    return {
      status: 'INSUFFICIENT_DATA',
      estimatedExitValueCents: null,
      estimatedHoldingPeriodYears: null,
      strategy:
        'Use a future verified comparable-sales dataset to establish an evidence-based exit range before committing to a resale strategy.',
      summary:
        'An exit value and holding period cannot be responsibly estimated from the current evidence.',
    };
  }

  return {
    status: 'PARTIAL',
    estimatedExitValueCents: null,
    estimatedHoldingPeriodYears: null,
    strategy:
      'Maintain an exit strategy around future verified comparable evidence, property condition, liquidity and transaction costs. Do not assume that the current asking-price median represents a future sale price.',
    summary:
      'Current comparable asking-price evidence can inform exit positioning, but it cannot establish a future sale price or guaranteed return.',
  };
}

function buildAssumptions(
  acquisition: AcquisitionIntelligence,
): string[] {
  return [
    ...acquisition.assumptions,
    'Investor Report Pro does not treat active asking prices as historical sold prices.',
    'No future property appreciation is assumed without verified growth evidence.',
    'No rental income, vacancy rate or rental yield is assumed without verified rental evidence.',
    'No future exit value is assumed from current asking prices.',
  ].filter(
    (value, index, values) =>
      values.indexOf(value) === index,
  );
}

function buildLimitations(
  facts: PropertyFacts,
  evidence: PropertyEvidence[],
  market: MarketIntelligence,
  rentalDemand: InvestorRentalDemand,
  growthOutlook: GrowthOutlook,
  exitStrategy: ExitStrategy,
): string[] {
  const limitations: string[] = [];

  if (!hasValue(facts.address)) {
    limitations.push(
      'Full address is not verified, limiting location-specific due diligence.',
    );
  }

  if (!hasValue(facts.askingPriceCents)) {
    limitations.push(
      'Asking price is not verified, preventing price-based investment analysis.',
    );
  }

  if (market.comparableCount === 0) {
    limitations.push(
      'No usable comparable listings were supplied.',
    );
  }

  if (!hasEvidence(evidence, 'leviesCents')) {
    limitations.push(
      'Verified levy information is unavailable.',
    );
  }

  if (!hasEvidence(evidence, 'ratesAndTaxesCents')) {
    limitations.push(
      'Verified rates-and-taxes information is unavailable.',
    );
  }

  if (rentalDemand.status === 'INSUFFICIENT_DATA') {
    limitations.push(
      'Rental demand cannot be assessed without verified rental-market evidence.',
    );
  }

  if (growthOutlook.status === 'INSUFFICIENT_DATA') {
    limitations.push(
      'Growth outlook cannot be quantified without verified historical or forecast market data.',
    );
  }

  if (exitStrategy.status === 'INSUFFICIENT_DATA') {
    limitations.push(
      'Exit value cannot be estimated without stronger market evidence.',
    );
  }

  limitations.push(
    'This Investor Report is decision-support analysis, not financial, legal, tax or property valuation advice.',
  );

  return limitations.filter(
    (value, index, values) =>
      values.indexOf(value) === index,
  );
}

export function calculateInvestorReport(
  input: InvestorReportEngineInput,
): InvestorReportEngineOutput {
  const facts = input.facts;
  const evidence = input.evidence;
  const comparables = input.comparables ?? [];

  const acquisitionIntelligence =
    calculateAcquisitionIntelligence(facts);

  const marketIntelligence =
    calculateMarketIntelligence(
      facts,
      comparables,
    );

  const comparableSales =
    buildComparableSales(marketIntelligence);

  const rentalDemand =
    buildRentalDemand(facts, evidence);

  const negotiationOpportunities =
    buildNegotiationOpportunities(
      facts,
      marketIntelligence,
      evidence,
    );

  const investmentRisks =
    buildInvestmentRisks(
      facts,
      evidence,
      marketIntelligence,
      acquisitionIntelligence,
    );

  const growthOutlook =
    buildGrowthOutlook();

  const exitStrategy =
    buildExitStrategy(marketIntelligence);

  const limitations =
    buildLimitations(
      facts,
      evidence,
      marketIntelligence,
      rentalDemand,
      growthOutlook,
      exitStrategy,
    );

  return {
    reportType: 'investor_report_pro',

    propertySummary: {
      address: facts.address,
      suburb: facts.suburb,
      city: facts.city,
      province: facts.province,
      askingPriceCents: facts.askingPriceCents,
      propertyType: facts.propertyType,
      bedrooms: facts.bedrooms,
      bathrooms: facts.bathrooms,
      floorSizeM2: facts.floorSizeM2,
      landSizeM2: facts.landSizeM2,
    },

    comparableSales,
    rentalDemand,
    negotiationOpportunities,
    investmentRisks,
    growthOutlook,
    exitStrategy,

    acquisitionIntelligence,
    marketIntelligence,

    assumptions:
      buildAssumptions(
        acquisitionIntelligence,
      ),

    limitations,
  };
}
