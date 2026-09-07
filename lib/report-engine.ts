import type { PropertyEvidence, PropertyFacts } from '@/lib/property-types';

export interface ReportEngineInput { facts: PropertyFacts; evidence: PropertyEvidence[]; goal: 'Buy to Live' | 'Rental' | 'Flip'; }
export interface ReportEngineOutput {
  investmentScore: number | null;
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

const IDENTITY_FIELDS: (keyof PropertyFacts)[] = ['title', 'address', 'propertyType'];
const MATERIAL_FIELDS: (keyof PropertyFacts)[] = ['askingPriceCents', 'bedrooms', 'bathrooms', 'floorSizeM2', 'landSizeM2'];
const hasValue = (value: unknown) => value !== null && value !== undefined && value !== '';

function calculateConfidence(facts: PropertyFacts, evidence: PropertyEvidence[]): number {
  const identity = IDENTITY_FIELDS.filter((field) => hasValue(facts[field])).length;
  const material = MATERIAL_FIELDS.filter((field) => hasValue(facts[field])).length;
  const evidenced = MATERIAL_FIELDS.filter((field) => hasValue(facts[field]) && evidence.some((item) => item.field === field)).length;
  return Math.round(Math.min(100, (identity / 3) * 25 + (material / 5) * 45 + (evidenced / Math.max(material, 1)) * 30));
}

export function calculateReport(input: ReportEngineInput): ReportEngineOutput {
  const confidence = calculateConfidence(input.facts, input.evidence);
  const scoreBreakdown: Record<string, number> = {};
  for (const field of IDENTITY_FIELDS) scoreBreakdown[`${field}Verified`] = hasValue(input.facts[field]) ? 1 : 0;
  for (const field of MATERIAL_FIELDS) scoreBreakdown[`${field}Verified`] = hasValue(input.facts[field]) ? 1 : 0;

  const limitations: string[] = [];
  const assumptions: string[] = [];
  if (!hasValue(input.facts.askingPriceCents)) limitations.push('Asking price was not verified from the supplied source.');
  if (!hasValue(input.facts.address)) limitations.push('Full property address was not verified from the supplied source.');
  if (!hasValue(input.facts.floorSizeM2) && !hasValue(input.facts.landSizeM2)) limitations.push('No verified floor or land size was available.');
  limitations.push('Investment Score is not rated because no trusted market benchmark or independently verified rental evidence is currently available.');

  let bondMonthlyPaymentCents: number | null = null;
  let bondLoanAmountCents: number | null = null;
  if (input.facts.askingPriceCents !== null) {
    const loan = Math.round(input.facts.askingPriceCents * 0.90);
    const monthlyRate = 0.115 / 12;
    const months = 20 * 12;
    bondLoanAmountCents = loan;
    bondMonthlyPaymentCents = Math.round(loan * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months)));
    assumptions.push('BondMatch scenario assumes a 10% deposit, 11.5% annual interest rate and 20-year term. Actual lender terms may differ.');
  } else {
    limitations.push('BondMatch could not be calculated because the asking price was not verified.');
  }

  return {
    investmentScore: null,
    aiConfidence: confidence,
    confidenceLabel: confidence >= 80 ? 'High' : confidence >= 60 ? 'Medium' : 'Low',
    riskLevel: confidence < 55 ? 'Unrated' : 'Moderate',
    rentalYieldPercent: null,
    bondMonthlyPaymentCents,
    bondLoanAmountCents,
    recommendation: 'Insufficient Data',
    scoreBreakdown,
    assumptions,
    limitations,
  };
}
