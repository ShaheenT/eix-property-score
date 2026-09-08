import { NextRequest, NextResponse } from 'next/server';
import { processReport, type ReportType } from '@/lib/report-processor';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ||
  'https://eix-property-score-beta.vercel.app';

export async function GET(req: NextRequest) {
  const submissionId = req.nextUrl.searchParams.get('submission_id')?.trim() || '';
  const requestedReportType =
    req.nextUrl.searchParams.get('report_type')?.trim() || 'standard_report';

  if (!submissionId) {
    return NextResponse.json({ error: 'submission_id is required' }, { status: 400 });
  }

  if (
    requestedReportType !== 'standard_report' &&
    requestedReportType !== 'investor_report_pro'
  ) {
    return NextResponse.json({ error: 'Invalid report_type' }, { status: 400 });
  }

  const reportType = requestedReportType as ReportType;

  try {
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('property_submissions')
      .select('id, status')
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    if (!['paid', 'report_sent'].includes(submission.status)) {
      return NextResponse.json({ status: 'awaiting_payment', reportType });
    }

    if (reportType === 'investor_report_pro') {
      const { data: proPayment, error: proPaymentError } = await supabaseAdmin
        .from('payments')
        .select('id')
        .eq('submission_id', submissionId)
        .eq('product', 'investor_report_pro')
        .eq('status', 'completed')
        .maybeSingle();

      if (proPaymentError) throw proPaymentError;

      if (!proPayment) {
        return NextResponse.json({ status: 'awaiting_payment', reportType });
      }
    }

    const { data: report, error: reportError } = await supabaseAdmin
      .from('reports')
      .select('id, status, access_token, report_type')
      .eq('submission_id', submissionId)
      .eq('report_type', reportType)
      .maybeSingle();

    if (reportError) throw reportError;

    if (!report) {
      return NextResponse.json({ status: 'queued', reportType });
    }

    if (report.status === 'completed' || report.status === 'sent') {
      const reportUrl =
        `${BASE_URL}/report/${report.id}?token=${encodeURIComponent(report.access_token || '')}`;
      return NextResponse.json({ status: 'completed', reportType, reportUrl });
    }

    if (report.status === 'failed' || report.status === 'queued') {
      try {
        const result = await processReport(submissionId, { reportType });
        if (result.status === 'completed' && 'reportUrl' in result) {
          return NextResponse.json({
            status: 'completed',
            reportType,
            reportUrl: result.reportUrl,
          });
        }
      } catch (error) {
        console.error('[Report Status] Processing failed', error);
      }

      if (report.status === 'failed') {
        return NextResponse.json({ status: 'failed', reportType }, { status: 500 });
      }
    }

    return NextResponse.json({ status: report.status, reportType });
  } catch (error) {
    console.error('[Report Status]', error);
    return NextResponse.json(
      { error: 'Unable to check report status' },
      { status: 500 },
    );
  }
}
