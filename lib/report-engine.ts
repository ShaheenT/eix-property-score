import type { PropertyEvidence, PropertyFacts } from '@/lib/property-types';
import {
  calculateAcquisitionIntelligence,
  type AcquisitionIntelligence,
} from '@/lib/acquisition-intelligence';
import {
  calculateMarketIntelligence,
  type MarketIntelligence,
} from '@/lib/market-intelligence';
import {
  evaluateDecision,
  type DecisionConstraints,
  type DecisionResult,
} from '@/lib/decision-engine';
import type { ComparableProperty } from '@/lib/property24-comparables';
import {
  calculateInternationalBuyerIntelligence,
  type InternationalBuyerIntelligence,
  type InternationalBuyerProfile,
} from '@/lib/international-buyer-intelligence';

export interface ReportEngineInput {
  facts: PropertyFacts;
  evidence: PropertyEvidence[];
  goal: 'Buy to Live' | 'Rental' | 'Flip';
  comparables?: ComparableProperty[];
  constraints?: DecisionConstraints;
  buyerProfile?: InternationalBuyerProfile;
}

export interface ReportEngineOutput {
  investmentScore: number | null;
  aiConfidence: number;
  confidenceLabel: 'High' | 'Medium' | 'Low';
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Unrated';
  rentalYieldPercent: number | null;
  bondMonthlyPaymentCents: number | null;
  bondLoanAmountCents: number | null;
  recommendation:
    | 'Strong Buy'
    | 'Buy'
    | 'Consider'
    | 'Caution'
    | 'Insufficient Data';
  scoreBreakdown: Record<string, number>;
  assumptions: string[];
  limitations: string[];
  marketIntelligence: MarketIntelligence;
  acquisitionIntelligence: AcquisitionIntelligence;
  internationalBuyerIntelligence: InternationalBuyerIntelligence | null;
  decision: DecisionResult;
}

const IDENTITY_FIELDS: (keyof PropertyFacts)[] = [
  'title',
  'address',
  'propertyType',
];

const MATERIAL_FIELDS: (keyof PropertyFacts)[] = [
  'askingPriceCents',
  'bedrooms',
  'bathrooms',
  'floorSizeM2',
  'landSizeM2',
];

const FUNDAMENTAL_FIELDS: (keyof PropertyFacts)[] = [
  'bedrooms',
  'bathrooms',
  'floorSizeM2',
  'landSizeM2',
  'garages',
  'parking',
  'hasPool',
  'hasGarden',
];

const FINANCIAL_FIELDS: (keyof PropertyFacts)[] = [
  'askingPriceCents',
  'leviesCents',
  'ratesAndTaxesCents',
];

const hasValue = (value: unknown) =>
  value !== null && value !== undefined && value !== '';

function calculateConfidence(
  facts: PropertyFacts,
  evidence: PropertyEvidence[],
): number {
  const identity = IDENTITY_FIELDS.filter((field) => hasValue(facts[field])).length;
  const material = MATERIAL_FIELDS.filter((field) => hasValue(facts[field])).length;
  const evidenced = MATERIAL_FIELDS.filter(
    (field) => hasValue(facts[field]) && evidence.some((item) => item.field === field),
  ).length;

  return Math.round(
    Math.min(
      100,
      (identity / 3) * 25 +
        (material / 5) * 45 +
        (evidenced / Math.max(material, 1)) * 30,
    ),
  );
}

function componentScore(facts: PropertyFacts, fields: (keyof PropertyFacts)[]): number {
  return Math.round(
    (fields.filter((field) => hasValue(facts[field])).length / fields.length) * 100,
  );
}

function evidenceScore(facts: PropertyFacts, evidence: PropertyEvidence[]): number {
  const coreFields = [...IDENTITY_FIELDS, ...MATERIAL_FIELDS];
  const evidenced = coreFields.filter(
    (field) => hasValue(facts[field]) && evidence.some((item) => item.field === field),
  ).length;
  const available = coreFields.filter((field) => hasValue(facts[field])).length;
  return available === 0 ? 0 : Math.round((evidenced / available) * 100);
}

function marketScore(market: MarketIntelligence): number | null {
  const variance = market.subjectVsMedianPercent;
  if (variance === null) return null;

  const absoluteVariance = Math.abs(variance);
  if (absoluteVariance <= 5) return 100;
  if (absoluteVariance <= 10) return 90;
  if (absoluteVariance <= 20) return 80;
  if (absoluteVariance <= 30) return 65;
  return 50;
}

function calculatePropertyScore(
  facts: PropertyFacts,
  evidence: PropertyEvidence[],
  market: MarketIntelligence,
): { score: number | null; breakdown: Record<string, number> } {
  if (!hasValue(facts.askingPriceCents)) {
    return { score: null, breakdown: {} };
  }

  // A market-facing score is not allowed until at least three registered
  // achieved-sale comparables are verified. Active asking listings are context.
  if (market.verifiedAchievedSaleCount < 3) {
    return {
      score: null,
      breakdown: {
        marketComparableCount: market.comparableCount,
        verifiedAchievedSaleCount: market.verifiedAchievedSaleCount,
        activeListingCount: market.activeListingCount,
        pendingSaleCount: market.pendingSaleCount,
      },
    };
  }

  const evidenceComponent = evidenceScore(facts, evidence);
  const fundamentalsComponent = componentScore(facts, FUNDAMENTAL_FIELDS);
  const financialComponent = componentScore(facts, FINANCIAL_FIELDS);
  const marketComponent = marketScore(market);

  let score: number;
  if (marketComponent === null) {
    // A market-blind score is deliberately capped so EiX never presents an
    // evidence-only assessment as a market-backed investment conclusion.
    score = Math.min(
      69,
      Math.round(
        evidenceComponent * 0.50 +
          fundamentalsComponent * 0.30 +
          financialComponent * 0.20,
      ),
    );
  } else {
    score = Math.round(
      marketComponent * 0.35 +
        evidenceComponent * 0.30 +
        fundamentalsComponent * 0.20 +
        financialComponent * 0.15,
    );
  }

  return {
    score,
    breakdown: {
      evidence: evidenceComponent,
      fundamentals: fundamentalsComponent,
      financialClarity: financialComponent,
      ...(marketComponent === null ? {} : { marketPosition: marketComponent }),
      marketComparableCount: market.comparableCount,
      marketMedianAskingPriceCents: market.askingPriceCents.median ?? 0,
      marketMinAskingPriceCents: market.askingPriceCents.min ?? 0,
      marketMaxAskingPriceCents: market.askingPriceCents.max ?? 0,
      subjectPricePerM2Cents: market.subjectPricePerM2Cents ?? 0,
      comparableMedianPricePerM2Cents: market.pricePerM2Cents.median ?? 0,
      subjectVsMedianPercent: market.subjectVsMedianPercent ?? 0,
    },
  };
}

function mapGoal(goal: ReportEngineInput['goal']): 'buy_to_live' | 'rental' | 'flip' {
  switch (goal) {
    case 'Buy to Live':
      return 'buy_to_live';
    case 'Rental':
      return 'rental';
    case 'Flip':
      return 'flip';
  }
}

function mapRecommendation(
  decision: DecisionResult['decision'],
): ReportEngineOutput['recommendation'] {
  switch (decision) {
    case 'BUY':
      return 'Buy';
    case 'NEGOTIATE':
      return 'Consider';
    case 'INVESTIGATE':
      return 'Caution';
    case 'PASS':
      return 'Caution';
    case 'INSUFFICIENT_DATA':
      return 'Insufficient Data';
  }
}

function buildLimitations(
  facts: PropertyFacts,
  market: MarketIntelligence,
  decision: DecisionResult,
): string[] {
  const limitations: string[] = [];

  if (!hasValue(facts.askingPriceCents)) {
    limitations.push('Asking price was not verified from the supplied source.');
  }
  if (!hasValue(facts.address)) {
    limitations.push('Full property address was not verified from the supplied source.');
  }
  if (!hasValue(facts.floorSizeM2) && !hasValue(facts.landSizeM2)) {
    limitations.push('No verified floor or land size was available.');
  }
  if (market.comparableCount === 0) {
    limitations.push(
      'Market position is evidence-limited because no verified comparable asking prices were available for this report.',
    );
  }
  for (const unknown of decision.unknowns) {
    if (!limitations.includes(unknown)) limitations.push(unknown);
  }

  return limitations;
}

export function calculateReport(input: ReportEngineInput): ReportEngineOutput {
  const confidence = calculateConfidence(input.facts, input.evidence);
  const acquisitionIntelligence = calculateAcquisitionIntelligence(input.facts);
  const marketIntelligence = calculateMarketIntelligence(
    input.facts,
    input.comparables ?? [],
  );
  const propertyScore = calculatePropertyScore(
    input.facts,
    input.evidence,
    marketIntelligence,
  );

  const internationalBuyerIntelligence =
    input.buyerProfile?.buyerType === 'international'
      ? calculateInternationalBuyerIntelligence({
          profile: input.buyerProfile,
          facts: input.facts,
          evidence: input.evidence,
          market: marketIntelligence,
          acquisition: acquisitionIntelligence,
        })
      : null;

  const decision = evaluateDecision(
    mapGoal(input.goal),
    input.facts,
    marketIntelligence,
    acquisitionIntelligence,
    input.constraints,
  );

  const assumptions = [
    ...acquisitionIntelligence.assumptions,
    ...decision.assumptionsUsed,
  ].filter((value, index, values) => values.indexOf(value) === index);

  return {
    investmentScore: propertyScore.score,
    aiConfidence: confidence,
    confidenceLabel: confidence >= 80 ? 'High' : confidence >= 60 ? 'Medium' : 'Low',
    riskLevel:
      propertyScore.score === null
        ? 'Unrated'
        : propertyScore.score < 50
          ? 'High'
          : propertyScore.score < 75
            ? 'Moderate'
            : 'Low',
    rentalYieldPercent: null,
    bondMonthlyPaymentCents: acquisitionIntelligence.bondMonthlyPaymentCents,
    bondLoanAmountCents: acquisitionIntelligence.loanAmountCents,
    recommendation: mapRecommendation(decision.decision),
    scoreBreakdown: propertyScore.breakdown,
    assumptions,
    limitations: buildLimitations(input.facts, marketIntelligence, decision),
    marketIntelligence,
    acquisitionIntelligence,
    internationalBuyerIntelligence,
    decision,
  };
}
