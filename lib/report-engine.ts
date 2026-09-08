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

export interface ReportEngineInput {
  facts: PropertyFacts;
  evidence: PropertyEvidence[];
  goal: 'Buy to Live' | 'Rental' | 'Flip';
  comparables?: ComparableProperty[];
  constraints?: DecisionConstraints;
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

const hasValue = (value: unknown) =>
  value !== null && value !== undefined && value !== '';

function calculateConfidence(
  facts: PropertyFacts,
  evidence: PropertyEvidence[],
): number {
  const identity = IDENTITY_FIELDS.filter((field) =>
    hasValue(facts[field]),
  ).length;

  const material = MATERIAL_FIELDS.filter((field) =>
    hasValue(facts[field]),
  ).length;

  const evidenced = MATERIAL_FIELDS.filter(
    (field) =>
      hasValue(facts[field]) &&
      evidence.some((item) => item.field === field),
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

function mapGoal(
  goal: ReportEngineInput['goal'],
): 'buy_to_live' | 'rental' | 'flip' {
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
    limitations.push(
      'Asking price was not verified from the supplied source.',
    );
  }

  if (!hasValue(facts.address)) {
    limitations.push(
      'Full property address was not verified from the supplied source.',
    );
  }

  if (!hasValue(facts.floorSizeM2) && !hasValue(facts.landSizeM2)) {
    limitations.push(
      'No verified floor or land size was available.',
    );
  }

  if (market.comparableCount === 0) {
    limitations.push(
      'No usable comparable properties were supplied for market comparison.',
    );
  }

  for (const unknown of decision.unknowns) {
    if (!limitations.includes(unknown)) {
      limitations.push(unknown);
    }
  }

  limitations.push(
    'Investment Score is not rated because no trusted scoring methodology has been established.',
  );

  return limitations;
}

export function calculateReport(
  input: ReportEngineInput,
): ReportEngineOutput {
  const confidence = calculateConfidence(input.facts, input.evidence);

  const acquisitionIntelligence =
    calculateAcquisitionIntelligence(input.facts);

  const marketIntelligence = calculateMarketIntelligence(
    input.facts,
    input.comparables ?? [],
  );

  const decision = evaluateDecision(
    mapGoal(input.goal),
    input.facts,
    marketIntelligence,
    acquisitionIntelligence,
    input.constraints,
  );

  const scoreBreakdown: Record<string, number> = {};

  for (const field of IDENTITY_FIELDS) {
    scoreBreakdown[`${field}Verified`] = hasValue(input.facts[field])
      ? 1
      : 0;
  }

  for (const field of MATERIAL_FIELDS) {
    scoreBreakdown[`${field}Verified`] = hasValue(input.facts[field])
      ? 1
      : 0;
  }

  const assumptions = [
    ...acquisitionIntelligence.assumptions,
    ...decision.assumptionsUsed,
  ].filter(
    (value, index, values) => values.indexOf(value) === index,
  );

  const limitations = buildLimitations(
    input.facts,
    marketIntelligence,
    decision,
  );

  return {
    investmentScore: null,

    aiConfidence: confidence,
    confidenceLabel:
      confidence >= 80
        ? 'High'
        : confidence >= 60
          ? 'Medium'
          : 'Low',

    riskLevel: confidence < 55 ? 'Unrated' : 'Moderate',

    rentalYieldPercent: null,

    bondMonthlyPaymentCents:
      acquisitionIntelligence.bondMonthlyPaymentCents,

    bondLoanAmountCents:
      acquisitionIntelligence.loanAmountCents,

    recommendation: mapRecommendation(decision.decision),

    scoreBreakdown,
    assumptions,
    limitations,

    marketIntelligence,
    acquisitionIntelligence,
    decision,
  };
}
