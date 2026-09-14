
import { randomUUID } from 'crypto';
import { calculateReport } from '@/lib/report-engine';
import { calculateInvestorReport } from '@/lib/investor-report-engine';
import { extractPropertyFromUrl } from '@/lib/secure-property-extractor';
import { supabaseAdmin } from '@/lib/supabase';
import type { PropertyEvidence, PropertyFacts } from '@/lib/property-types';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://eix-property-score-beta.vercel.app';
type Goal = 'Buy to Live' | 'Rental' | 'Flip';
export type ReportType = 'standard_report' | 'investor_report_pro';
interface ProcessReportOptions { reportType?: ReportType; }
function hasPersistedPropertyEvidence(facts: unknown, evidence: unknown): facts is PropertyFacts {
  return Boolean(facts && typeof facts === 'object' && evidence && Array.isArray(evidence) && Object.keys(facts).length > 0);
}

export async function processReport(submissionId: string, options: ProcessReportOptions = {}) {
  const reportType = options.reportType || 'standard_report';
  const { data: submission, error: submissionError } = await supabaseAdmin.from('property_submissions').select('id, listing_url, status, goal, buyer_type, buyer_country, buyer_purpose, buyer_budget, customer:customers(name, email)').eq('id', submissionId).single();
  if (submissionError || !submission) throw new Error('Submission not found');
  if (!['paid', 'report_sent'].includes(submission.status)) throw new Error('Submission is not paid');
  if (!['Buy to Live', 'Rental', 'Flip'].includes(submission.goal)) throw new Error('Invalid submission goal');

  const { data: queuedReport, error: reportError } = await supabaseAdmin.from('reports').select('id, status, report_type, access_token').eq('submission_id', submissionId).eq('report_type', reportType).maybeSingle();
  if (reportError) throw reportError;
  if (!queuedReport) throw new Error(`Report record not found: ${reportType}`);
  if (queuedReport.status === 'sent') return { status: 'already_sent', reportId: queuedReport.id, reportType };
  if (queuedReport.status === 'processing') return { status: 'processing', reportId: queuedReport.id, reportType };

  const { data: claimed } = await supabaseAdmin.from('reports').update({ status: 'processing' }).eq('id', queuedReport.id).in('status', ['queued', 'failed']).select('id').maybeSingle();
  if (!claimed) {
    const { data: current } = await supabaseAdmin.from('reports').select('id, status').eq('id', queuedReport.id).single();
    return { status: current?.status || 'processing', reportId: queuedReport.id, reportType };
  }

  try {
    let facts: PropertyFacts;
    let evidence: PropertyEvidence[];
    if (reportType === 'investor_report_pro') {
      const { data: standardReport, error: standardReportError } = await supabaseAdmin.from('reports').select('property_facts, property_evidence').eq('submission_id', submissionId).eq('report_type', 'standard_report').maybeSingle();
      if (standardReportError) throw standardReportError;
      if (standardReport && hasPersistedPropertyEvidence(standardReport.property_facts, standardReport.property_evidence)) {
        facts = standardReport.property_facts;
        evidence = standardReport.property_evidence as PropertyEvidence[];
      } else {
        const extraction = await extractPropertyFromUrl(submission.listing_url, submissionId);
        if (extraction.status !== 'extracted' || extraction.metadata?.reportEligible === false) throw new Error(`Property extraction failed: ${extraction.status}: ${extraction.errors?.filter(Boolean).join('; ') || 'Evidence gate blocked report generation.'}`);
        facts = extraction.facts;
        evidence = extraction.evidence;
      }
    } else {
      const extraction = await extractPropertyFromUrl(submission.listing_url, submissionId);
      if (extraction.status !== 'extracted' || extraction.metadata?.reportEligible === false) throw new Error(`Property extraction failed: ${extraction.status}: ${extraction.errors?.filter(Boolean).join('; ') || 'Evidence gate blocked report generation.'}`);
      facts = extraction.facts;
      evidence = extraction.evidence;
    }

    const accessToken = queuedReport.access_token || randomUUID();
    const reportUrl = `${BASE_URL}/report/${queuedReport.id}?token=${encodeURIComponent(accessToken)}`;
    if (reportType === 'standard_report') {
      const result = calculateReport({ facts, evidence, goal: submission.goal as Goal, buyerProfile: { buyerType: submission.buyer_type === 'international' ? 'international' : 'south_african', buyerCountry: submission.buyer_country ?? null, buyerPurpose: submission.buyer_purpose ?? null, buyerBudget: submission.buyer_budget ?? null } });
      const { error: persistError } = await supabaseAdmin.from('reports').update({ status: 'completed', investment_score: result.investmentScore, ai_confidence: result.aiConfidence, property_facts: facts, property_evidence: evidence, score_breakdown: result.scoreBreakdown, assumptions: result.assumptions, limitations: result.limitations, rental_yield_percent: result.rentalYieldPercent, bond_monthly_payment_cents: result.bondMonthlyPaymentCents, bond_loan_amount_cents: result.bondLoanAmountCents, risk_level: result.riskLevel, recommendation: result.recommendation, confidence_label: result.confidenceLabel, access_token: accessToken, processed_at: new Date().toISOString(), ...(result.internationalBuyerIntelligence ? { international_buyer_analysis: result.internationalBuyerIntelligence } : {}) }).eq('id', queuedReport.id);
      if (persistError) throw persistError;
    } else if (reportType === 'investor_report_pro') {
      const result = calculateInvestorReport({ facts, evidence, comparables: [] });
      const { error: persistError } = await supabaseAdmin.from('reports').update({ status: 'completed', property_facts: facts, property_evidence: evidence, investor_analysis: result, assumptions: result.assumptions, limitations: result.limitations, access_token: accessToken, processed_at: new Date().toISOString() }).eq('id', queuedReport.id);
      if (persistError) throw persistError;
    } else throw new Error(`Unsupported report type: ${reportType}`);
    return { status: 'completed', reportId: queuedReport.id, reportType, reportUrl, customer: submission.customer };
  } catch (error) {
    await supabaseAdmin.from('reports').update({ status: 'failed', processed_at: new Date().toISOString() }).eq('id', queuedReport.id);
    throw error;
  }
}
