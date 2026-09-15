import { supabaseAdmin } from '@/lib/supabase';
import { INTELLIGENCE_ENGINE_VERSION } from '@/lib/intelligence/evidence';
import { hashVerificationSnapshot, type VerificationReportSnapshot } from './hash';

const EXTRACTION_VERSION = '2.1.0';

export async function verifyVerificationLedger(ledgerId: string) {
  const { data: ledger, error: ledgerError } = await supabaseAdmin
    .from('verification_ledgers')
    .select('report_id, ledger_id, report_hash, generated_at, trust_index, intelligence_version, extraction_version')
    .eq('ledger_id', ledgerId)
    .maybeSingle();

  if (ledgerError) throw ledgerError;
  if (!ledger) return { valid: false as const, reason: 'Ledger not found.' };

  const { data: report, error: reportError } = await supabaseAdmin
    .from('reports')
    .select('id, report_type, property_facts, property_evidence, investment_score, ai_confidence, score_breakdown, assumptions, limitations, rental_yield_percent, bond_monthly_payment_cents, bond_loan_amount_cents, risk_level, recommendation, confidence_label, investor_analysis, international_buyer_analysis, intelligence_run_id, intelligence_trust_index, processed_at, status')
    .eq('id', ledger.report_id)
    .maybeSingle();

  if (reportError) throw reportError;
  if (!report || report.status !== 'completed' || !report.processed_at) {
    return { valid: false as const, reason: 'Report is not in a verifiable completed state.' };
  }

  const trustIndex = Math.max(0, Math.min(100, Math.round(report.intelligence_trust_index ?? report.ai_confidence ?? 0)));
  const snapshot: VerificationReportSnapshot = {
    reportId: report.id,
    reportType: report.report_type,
    propertyFacts: report.property_facts,
    propertyEvidence: report.property_evidence,
    investmentScore: report.investment_score,
    aiConfidence: report.ai_confidence,
    scoreBreakdown: report.score_breakdown,
    assumptions: report.assumptions,
    limitations: report.limitations,
    rentalYieldPercent: report.rental_yield_percent,
    bondMonthlyPaymentCents: report.bond_monthly_payment_cents,
    bondLoanAmountCents: report.bond_loan_amount_cents,
    riskLevel: report.risk_level,
    recommendation: report.recommendation,
    confidenceLabel: report.confidence_label,
    investorAnalysis: report.investor_analysis,
    internationalBuyerAnalysis: report.international_buyer_analysis,
    intelligenceRunId: report.intelligence_run_id,
    intelligenceTrustIndex: trustIndex,
    intelligenceVersion: INTELLIGENCE_ENGINE_VERSION,
    extractionVersion: EXTRACTION_VERSION,
    generatedAt: report.processed_at,
  };

  const currentHash = hashVerificationSnapshot(snapshot);
  const valid = currentHash === ledger.report_hash;

  return {
    valid,
    ledgerId: ledger.ledger_id,
    reportId: ledger.report_id,
    hash: ledger.report_hash,
    currentHash,
    generatedAt: ledger.generated_at,
    trustIndex: ledger.trust_index,
    intelligenceVersion: ledger.intelligence_version,
    extractionVersion: ledger.extraction_version,
    reason: valid ? undefined : 'Report data no longer matches its verification fingerprint.',
  };
}
