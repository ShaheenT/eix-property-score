import { supabaseAdmin } from '@/lib/supabase';
import { INTELLIGENCE_ENGINE_VERSION } from '@/lib/intelligence/evidence';
import { hashVerificationSnapshot, type VerificationReportSnapshot } from './hash';

const EXTRACTION_VERSION = '2.1.0';

interface ReportRow {
  id: string;
  report_type: string;
  property_facts: unknown;
  property_evidence: unknown;
  investment_score: number | null;
  ai_confidence: number | null;
  score_breakdown: unknown;
  assumptions: unknown;
  limitations: unknown;
  rental_yield_percent: number | null;
  bond_monthly_payment_cents: number | null;
  bond_loan_amount_cents: number | null;
  risk_level: string | null;
  recommendation: string | null;
  confidence_label: string | null;
  investor_analysis: unknown;
  international_buyer_analysis: unknown;
  intelligence_run_id: string | null;
  intelligence_trust_index: number | null;
  processed_at: string | null;
}

export async function createVerificationLedger(reportId: string) {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('verification_ledgers')
    .select('ledger_id, report_hash, generated_at, trust_index, intelligence_version, extraction_version')
    .eq('report_id', reportId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return existing;

  const { data: report, error: reportError } = await supabaseAdmin
    .from('reports')
    .select('id, report_type, property_facts, property_evidence, investment_score, ai_confidence, score_breakdown, assumptions, limitations, rental_yield_percent, bond_monthly_payment_cents, bond_loan_amount_cents, risk_level, recommendation, confidence_label, investor_analysis, international_buyer_analysis, intelligence_run_id, intelligence_trust_index, processed_at')
    .eq('id', reportId)
    .single<ReportRow>();

  if (reportError || !report) {
    throw new Error(`Verification ledger report lookup failed: ${reportError?.message ?? 'report not found'}`);
  }

  if (!report.processed_at) {
    throw new Error('Verification ledger requires a finalized report timestamp.');
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

  const reportHash = hashVerificationSnapshot(snapshot);

  const { data: ledgerId, error: idError } = await supabaseAdmin.rpc('allocate_eix_verification_ledger_id');
  if (idError || !ledgerId) {
    throw new Error(`Verification ledger ID allocation failed: ${idError?.message ?? 'unknown database error'}`);
  }

  const { data: ledger, error: insertError } = await supabaseAdmin
    .from('verification_ledgers')
    .insert({
      report_id: report.id,
      ledger_id: ledgerId,
      report_hash: reportHash,
      intelligence_version: INTELLIGENCE_ENGINE_VERSION,
      extraction_version: EXTRACTION_VERSION,
      trust_index: trustIndex,
      generated_at: report.processed_at,
      metadata: { snapshot },
    })
    .select('ledger_id, report_hash, generated_at, trust_index, intelligence_version, extraction_version')
    .single();

  if (insertError || !ledger) {
    const { data: raced } = await supabaseAdmin
      .from('verification_ledgers')
      .select('ledger_id, report_hash, generated_at, trust_index, intelligence_version, extraction_version')
      .eq('report_id', reportId)
      .maybeSingle();
    if (raced) return raced;
    throw new Error(`Verification ledger persistence failed: ${insertError?.message ?? 'unknown database error'}`);
  }

  const { error: reportUpdateError } = await supabaseAdmin
    .from('reports')
    .update({
      ledger_id: ledger.ledger_id,
      report_hash: ledger.report_hash,
    })
    .eq('id', report.id);

  if (reportUpdateError) throw new Error(`Report verification fields update failed: ${reportUpdateError.message}`);

  return ledger;
}
