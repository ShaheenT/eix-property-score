import type { PropertyEvidence, PropertyFacts } from '@/lib/property-types';

export interface ReportEngineInput {
  facts: PropertyFacts;
  evidence: PropertyEvidence[];
  goal: 'Buy to Live' | 'Rental' | 'Flip';
}

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

function hasValue(value: unknown): boolean {
  return value !== null && value !== undefined && value !== '';
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function calculateConfidence(facts: PropertyFacts, evidence: PropertyEvidence[]): number {
  const identity = IDENTITY_FIELDS.filter((field) => hasValue(facts[field])).length;
  const material = MATERIAL_FIELDS.filter((field) => hasValue(facts[field])).length;
  const evidenced = MATERIAL_FIELDS.filter((field) => hasValue(facts[field]) && evidence.some((item) => item.field === field)).length;
  return Math.round(clamp((identity / IDENTITY_FIELDS.length) * 25 + (material / MATERIAL_FIELDS.length) * 45 + (evidenced / Math.max(material, 1)) * 30));
}

export function calculateReport(input: ReportEngineInput): ReportEngineOutput {
  const confidence = calculateConfidence(input.facts, input.evidence);
  const scoreBreakdown: Record<string, number> = {};
  const assumptions: string[] = [];
  const limitations: string[] = [];

  for (const field of IDENTITY_FIELDS) scoreBreakdown[`${field}Verified`] = hasValue(input.facts[field]) ? 1 : 0;
  for (const field of MATERIAL_FIELDS) scoreBreakdown[`${field}Verified`] = hasValue(input.facts[field]) ? 1 : 0;

  if (!hasValue(input.facts.askingPriceCents)) limitations.push('Asking price was not verified from the supplied source.');
  if (!hasValue(input.facts.address)) limitations.push('Full property address was not verified from the supplied source.');
  if (!hasValue(input.facts.floorSizeM2) && !hasValue(input.facts.landSizeM2)) limitations.push('No verified floor or land size was available.');

  // A genuine investment score requires market evidence (comparable sales,
  // rental evidence, local demand and/or another trusted benchmark). Listing
  // facts alone cannot establish that a property is cheap, expensive, risky or
  // a good investment. Therefore the score remains unrated until such evidence
  // is available. This is a deliberate anti-hallucination gate.
  limitations.push('Investment Score is not rated because no trusted market benchmark or independently verified rental evidence is currently available.');

  let bondMonthlyPaymentCents: number | null = null;
  let bondLoanAmountCents: number | null = null;
  if (input.facts.askingPriceCents !== null) {
    const depositRate = 0.10;
    const annualRate = 0.115;
    const termYears = 20;
    bondLoanAmountCents = Math.round(input.facts.askingPriceCents * (1 - depositRate));
    const monthlyRate = annualRate / 12;
    const months = termYears * 12;
    bondMonthlyPaymentCents = Math.round(bondLoanAmountCents * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months)));
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
