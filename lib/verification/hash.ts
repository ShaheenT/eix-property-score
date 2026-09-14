import { createHash } from 'node:crypto';

export interface VerificationReportSnapshot {
  reportId: string;
  reportType: string;
  propertyFacts: unknown;
  propertyEvidence: unknown;
  investmentScore: number | null;
  aiConfidence: number | null;
  scoreBreakdown: unknown;
  assumptions: unknown;
  limitations: unknown;
  rentalYieldPercent: number | null;
  bondMonthlyPaymentCents: number | null;
  bondLoanAmountCents: number | null;
  riskLevel: string | null;
  recommendation: string | null;
  confidenceLabel: string | null;
  investorAnalysis: unknown;
  internationalBuyerAnalysis: unknown;
  intelligenceRunId: string | null;
  intelligenceTrustIndex: number;
  intelligenceVersion: string;
  extractionVersion: string;
  generatedAt: string;
}

export function canonicalVerificationSnapshot(input: VerificationReportSnapshot): VerificationReportSnapshot {
  return {
    reportId: input.reportId,
    reportType: input.reportType,
    propertyFacts: input.propertyFacts ?? null,
    propertyEvidence: input.propertyEvidence ?? null,
    investmentScore: input.investmentScore ?? null,
    aiConfidence: input.aiConfidence ?? null,
    scoreBreakdown: input.scoreBreakdown ?? null,
    assumptions: input.assumptions ?? null,
    limitations: input.limitations ?? null,
    rentalYieldPercent: input.rentalYieldPercent ?? null,
    bondMonthlyPaymentCents: input.bondMonthlyPaymentCents ?? null,
    bondLoanAmountCents: input.bondLoanAmountCents ?? null,
    riskLevel: input.riskLevel ?? null,
    recommendation: input.recommendation ?? null,
    confidenceLabel: input.confidenceLabel ?? null,
    investorAnalysis: input.investorAnalysis ?? null,
    internationalBuyerAnalysis: input.internationalBuyerAnalysis ?? null,
    intelligenceRunId: input.intelligenceRunId ?? null,
    intelligenceTrustIndex: input.intelligenceTrustIndex,
    intelligenceVersion: input.intelligenceVersion,
    extractionVersion: input.extractionVersion,
    generatedAt: input.generatedAt,
  };
}

export function hashVerificationSnapshot(snapshot: VerificationReportSnapshot): string {
  const canonical = canonicalVerificationSnapshot(snapshot);
  return createHash('sha256')
    .update(JSON.stringify(canonical))
    .digest('hex')
    .toUpperCase();
}
