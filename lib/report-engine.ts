import type { PropertyEvidence, PropertyFacts } from '@/lib/property-types';

export interface ReportEngineInput {
  facts: PropertyFacts;
  evidence: PropertyEvidence[];
  goal: 'Buy to Live' | 'Rental' | 'Flip';
}

export interface ReportEngineOutput {
  investmentScore: number;
  aiConfidence: number;
  confidenceLabel: 'High' | 'Medium' | 'Low';
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Unrated';
  rentalYieldPercent: number | null;
  bondMonthlyPaymentCents: number | null;
  bondLoanAmountCents: number | null;
  recommendation: 'Strong Buy' | 'Buy' | 'Consider' | 'Caution' | 'Insufficient Data';
  scoreBreakdown: Record<string, number>;
  assumptions: string[];
  limitations: string[];
}

const REQUIRED_IDENTITY_FIELDS: (keyof PropertyFacts)[] = [
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

function hasValue(value: unknown): boolean {
  return value !== null && value !== undefined && value !== '';
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function evidenceForField(evidence: PropertyEvidence[], field: keyof PropertyFacts): number {
  return evidence.filter((item) => item.field === field).length;
}

function calculateConfidence(facts: PropertyFacts, evidence: PropertyEvidence[]): number {
  const identity = REQUIRED_IDENTITY_FIELDS.filter((field) => hasValue(facts[field])).length;
  const material = MATERIAL_FIELDS.filter((field) => hasValue(facts[field])).length;
  const evidencedMaterial = MATERIAL_FIELDS.filter(
    (field) => hasValue(facts[field]) && evidenceForField(evidence, field) > 0,
  ).length;

  const identityScore = (identity / REQUIRED_IDENTITY_FIELDS.length) * 25;
  const materialScore = (material / MATERIAL_FIELDS.length) * 45;
  const evidenceScore = (evidencedMaterial / Math.max(material, 1)) * 30;

  return Math.round(clamp(identityScore + materialScore + evidenceScore));
}

function scoreBand(score: number): ReportEngineOutput['recommendation'] {
  if (score >= 85) return 'Strong Buy';
  if (score >= 70) return 'Buy';
  if (score >= 55) return 'Consider';
  return 'Caution';
}

function riskFromCompleteness(facts: PropertyFacts, confidence: number): ReportEngineOutput['riskLevel'] {
  if (confidence < 55) return 'Unrated';

  let risk = 0;
  if (!hasValue(facts.askingPriceCents)) risk += 3;
  if (!hasValue(facts.floorSizeM2) && !hasValue(facts.landSizeM2)) risk += 2;
  if (!hasValue(facts.address)) risk += 2;
  if (!hasValue(facts.propertyType)) risk += 1;

  if (risk >= 5) return 'High';
  if (risk >= 3) return 'Moderate';
  return 'Low';
}

function calculateScore(facts: PropertyFacts, goal: ReportEngineInput['goal']): { score: number; breakdown: Record<string, number> } {
  let score = 0;
  const breakdown: Record<string, number> = {};

  if (hasValue(facts.askingPriceCents)) {
    score += 25;
    breakdown.priceVerified = 25;
  } else {
    breakdown.priceVerified = 0;
  }

  if (hasValue(facts.propertyType)) {
    score += 15;
    breakdown.propertyTypeVerified = 15;
  } else {
    breakdown.propertyTypeVerified = 0;
  }

  if (hasValue(facts.bedrooms)) {
    score += 10;
    breakdown.bedroomsVerified = 10;
  } else {
    breakdown.bedroomsVerified = 0;
  }

  if (hasValue(facts.bathrooms)) {
    score += 10;
    breakdown.bathroomsVerified = 10;
  } else {
    breakdown.bathroomsVerified = 0;
  }

  if (hasValue(facts.floorSizeM2) || hasValue(facts.landSizeM2)) {
    score += 15;
    breakdown.sizeVerified = 15;
  } else {
    breakdown.sizeVerified = 0;
  }

  if (hasValue(facts.address)) {
    score += 15;
    breakdown.addressVerified = 15;
  } else {
    breakdown.addressVerified = 0;
  }

  // Goal affects interpretation, not the underlying facts. We deliberately do not
  // manufacture a market/yield advantage without a trusted market data source.
  if (goal === 'Rental' && hasValue(facts.bedrooms)) {
    breakdown.rentalReadiness = 5;
    score += 5;
  } else if (goal === 'Buy to Live' && hasValue(facts.address)) {
    breakdown.ownerOccupierReadiness = 5;
    score += 5;
  } else if (goal === 'Flip' && hasValue(facts.askingPriceCents)) {
    breakdown.flipEntryData = 5;
    score += 5;
  }

  return { score: Math.round(clamp(score)), breakdown };
}

export function calculateReport(input: ReportEngineInput): ReportEngineOutput {
  const confidence = calculateConfidence(input.facts, input.evidence);
  const { score, breakdown } = calculateScore(input.facts, input.goal);
  const riskLevel = riskFromCompleteness(input.facts, confidence);
  const limitations: string[] = [];
  const assumptions: string[] = [];

  if (input.facts.askingPriceCents === null) limitations.push('Asking price was not verified from the supplied source.');
  if (input.facts.address === null) limitations.push('Full property address was not verified from the supplied source.');
  if (input.facts.floorSizeM2 === null && input.facts.landSizeM2 === null) limitations.push('No verified floor or land size was available.');
  limitations.push('Market value, comparable sales, rental demand, vacancy, capital growth and negotiation range are not asserted without a trusted market-data source.');

  // Rental yield requires an independently verified rent figure. The current
  // listing extractor does not provide one, so never fabricate a yield.
  const rentalYieldPercent = null;

  // BondMatch is an explicit scenario, not a claim about the customer's finance.
  // Only calculate it when price is verified, using clearly disclosed assumptions.
  let bondMonthlyPaymentCents: number | null = null;
  let bondLoanAmountCents: number | null = null;
  if (input.facts.askingPriceCents !== null) {
    const depositRate = 0.10;
    const annualRate = 0.115;
    const termYears = 20;
    bondLoanAmountCents = Math.round(input.facts.askingPriceCents * (1 - depositRate));
    const monthlyRate = annualRate / 12;
    const months = termYears * 12;
    bondMonthlyPaymentCents = Math.round(
      bondLoanAmountCents * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months)),
    );
    assumptions.push('BondMatch scenario assumes a 10% deposit, 11.5% annual interest rate and 20-year term. Actual lender terms may differ.');
  } else {
    limitations.push('BondMatch could not be calculated because the asking price was not verified.');
  }

  const recommendation = confidence < 55 ? 'Insufficient Data' : scoreBand(score);
  const confidenceLabel = confidence >= 80 ? 'High' : confidence >= 60 ? 'Medium' : 'Low';

  return {
    investmentScore: recommendation === 'Insufficient Data' ? 0 : score,
    aiConfidence: confidence,
    confidenceLabel,
    riskLevel,
    rentalYieldPercent,
    bondMonthlyPaymentCents,
    bondLoanAmountCents,
    recommendation,
    scoreBreakdown: breakdown,
    assumptions,
    limitations,
  };
}
