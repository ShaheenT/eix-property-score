import { randomUUID } from 'crypto';
import { calculateReport } from '@/lib/report-engine';
import { calculateInvestorReport } from '@/lib/investor-report-engine';
import { extractPropertyFromUrl } from '@/lib/property-extractor';
import { supabaseAdmin } from '@/lib/supabase';

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ||
  'https://eix-property-score-beta.vercel.app';

type Goal = 'Buy to Live' | 'Rental' | 'Flip';

export type ReportType = 'standard_report' | 'investor_report_pro';

interface ProcessReportOptions {
  reportType?: ReportType;
}

export async function processReport(
  submissionId: string,
  options: ProcessReportOptions = {},
) {
  const reportType = options.reportType || 'standard_report';

  const { data: submission, error: submissionError } =
    await supabaseAdmin
      .from('property_submissions')
      .select(
        'id, listing_url, status, goal, customer:customers(name, email)',
      )
      .eq('id', submissionId)
      .single();

  if (submissionError || !submission) {
    throw new Error('Submission not found');
  }

  if (!['paid', 'report_sent'].includes(submission.status)) {
    throw new Error('Submission is not paid');
  }

  if (!['Buy to Live', 'Rental', 'Flip'].includes(submission.goal)) {
    throw new Error('Invalid submission goal');
  }

  const { data: queuedReport, error: reportError } =
    await supabaseAdmin
      .from('reports')
      .select('id, status, report_type, access_token')
      .eq('submission_id', submissionId)
      .eq('report_type', reportType)
      .maybeSingle();

  if (reportError) throw reportError;

  if (!queuedReport) {
    throw new Error(`Report record not found: ${reportType}`);
  }

  if (queuedReport.status === 'sent') {
    return { status: 'already_sent', reportId: queuedReport.id, reportType };
  }

  if (queuedReport.status === 'processing') {
    return { status: 'processing', reportId: queuedReport.id, reportType };
  }

  const { data: claimed } = await supabaseAdmin
    .from('reports')
    .update({ status: 'processing' })
    .eq('id', queuedReport.id)
    .in('status', ['queued', 'failed'])
    .select('id')
    .maybeSingle();

  if (!claimed) {
    const { data: current } = await supabaseAdmin
      .from('reports')
      .select('id, status')
      .eq('id', queuedReport.id)
      .single();

    return {
      status: current?.status || 'processing',
      reportId: queuedReport.id,
      reportType,
    };
  }

  try {
    const extraction = await extractPropertyFromUrl(submission.listing_url);

    if (extraction.status !== 'extracted') {
      const detail = extraction.errors?.filter(Boolean).join('; ') ||
        'No extractor error detail was returned.';
      throw new Error(`Property extraction failed: ${extraction.status}: ${detail}`);
    }

    const accessToken = queuedReport.access_token || randomUUID();
    const reportUrl =
      `${BASE_URL}/report/${queuedReport.id}?token=${encodeURIComponent(accessToken)}`;

    if (reportType === 'standard_report') {
      const goal = submission.goal as Goal;
      const result = calculateReport({
        facts: extraction.facts,
        evidence: extraction.evidence,
        goal,
      });

      const { error: persistError } = await supabaseAdmin
        .from('reports')
        .update({
          status: 'completed',
          investment_score: result.investmentScore,
          ai_confidence: result.aiConfidence,
          property_facts: extraction.facts,
          property_evidence: extraction.evidence,
          score_breakdown: result.scoreBreakdown,
          assumptions: result.assumptions,
          limitations: result.limitations,
          rental_yield_percent: result.rentalYieldPercent,
          bond_monthly_payment_cents: result.bondMonthlyPaymentCents,
          bond_loan_amount_cents: result.bondLoanAmountCents,
          risk_level: result.riskLevel,
          recommendation: result.recommendation,
          confidence_label: result.confidenceLabel,
          access_token: accessToken,
          processed_at: new Date().toISOString(),
        })
        .eq('id', queuedReport.id);

      if (persistError) throw persistError;
    } else if (reportType === 'investor_report_pro') {
      const result = calculateInvestorReport({
        facts: extraction.facts,
        evidence: extraction.evidence,
        // Comparable discovery is intentionally not fabricated. The current
        // extraction contract supplies only the subject property; a future
        // market-data adapter can provide verified comparable listings here.
        comparables: [],
      });

      const { error: persistError } = await supabaseAdmin
        .from('reports')
        .update({
          status: 'completed',
          property_facts: extraction.facts,
          property_evidence: extraction.evidence,
          investor_analysis: result,
          assumptions: result.assumptions,
          limitations: result.limitations,
          access_token: accessToken,
          processed_at: new Date().toISOString(),
        })
        .eq('id', queuedReport.id);

      if (persistError) throw persistError;
    } else {
      throw new Error(`Unsupported report type: ${reportType}`);
    }

    return {
      status: 'completed',
      reportId: queuedReport.id,
      reportType,
      reportUrl,
      customer: submission.customer,
    };
  } catch (error) {
    await supabaseAdmin
      .from('reports')
      .update({
        status: 'failed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', queuedReport.id);

    throw error;
  }
}
