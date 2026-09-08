import { randomUUID } from 'crypto';
import { calculateReport } from '@/lib/report-engine';
import { extractPropertyFromUrl } from '@/lib/property-extractor';
import { supabaseAdmin } from '@/lib/supabase';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://eix-property-score-beta.vercel.app';
type Goal = 'Buy to Live' | 'Rental' | 'Flip';

export async function processReport(submissionId: string) {
  const { data: submission, error: submissionError } = await supabaseAdmin.from('property_submissions').select('id, listing_url, status, goal, customer:customers(name, email)').eq('id', submissionId).single();
  if (submissionError || !submission) throw new Error('Submission not found');
  if (submission.status !== 'paid') throw new Error('Submission is not paid');
  if (!['Buy to Live', 'Rental', 'Flip'].includes(submission.goal)) throw new Error('Invalid submission goal');

  const { data: queuedReport, error: reportError } = await supabaseAdmin.from('reports').select('id, status, report_type, access_token').eq('submission_id', submissionId).single();
  if (reportError || !queuedReport) throw new Error('Report record not found');
  if (queuedReport.status === 'sent') return { status: 'already_sent', reportId: queuedReport.id };
  if (queuedReport.status === 'processing') return { status: 'processing', reportId: queuedReport.id };

  const { data: claimed } = await supabaseAdmin.from('reports').update({ status: 'processing' }).eq('id', queuedReport.id).eq('status', 'queued').select('id').maybeSingle();
  if (!claimed) {
    const { data: current } = await supabaseAdmin.from('reports').select('id, status').eq('id', queuedReport.id).single();
    return { status: current?.status || 'processing', reportId: queuedReport.id };
  }

  try {
    const extraction = await extractPropertyFromUrl(submission.listing_url);
    if (extraction.status !== 'extracted') {
      const detail = extraction.errors?.filter(Boolean).join('; ') || 'No extractor error detail was returned.';
      throw new Error(`Property extraction failed: ${extraction.status}: ${detail}`);
    }
    const goal = submission.goal as Goal;
    const result = calculateReport({ facts: extraction.facts, evidence: extraction.evidence, goal });
    const accessToken = queuedReport.access_token || randomUUID();
    const reportUrl = `${BASE_URL}/report/${queuedReport.id}?token=${encodeURIComponent(accessToken)}`;

    const { error: persistError } = await supabaseAdmin.from('reports').update({
      status: 'completed', investment_score: result.investmentScore, ai_confidence: result.aiConfidence,
      property_facts: extraction.facts, property_evidence: extraction.evidence, score_breakdown: result.scoreBreakdown,
      assumptions: result.assumptions, limitations: result.limitations, rental_yield_percent: result.rentalYieldPercent,
      bond_monthly_payment_cents: result.bondMonthlyPaymentCents, bond_loan_amount_cents: result.bondLoanAmountCents,
      risk_level: result.riskLevel, recommendation: result.recommendation, confidence_label: result.confidenceLabel,
      access_token: accessToken, processed_at: new Date().toISOString(),
    }).eq('id', queuedReport.id);
    if (persistError) throw persistError;

    return { status: 'completed', reportId: queuedReport.id, reportUrl, customer: submission.customer };
  } catch (error) {
    await supabaseAdmin.from('reports').update({ status: 'failed', processed_at: new Date().toISOString() }).eq('id', queuedReport.id);
    throw error;
  }
}
