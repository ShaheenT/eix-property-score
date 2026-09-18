import { NextRequest, NextResponse } from 'next/server';
import { processReport, type ReportType } from '@/lib/report-processor';
import { verifyPaystackTransaction } from '@/lib/paystack';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ||
  'https://eix-property-score-beta.vercel.app';

export async function GET(req: NextRequest) {
  const submissionIdParam = req.nextUrl.searchParams.get('submission_id')?.trim() || '';
  const paymentIdParam = req.nextUrl.searchParams.get('payment_id')?.trim() || '';
  const paystackReference = req.nextUrl.searchParams.get('reference')?.trim() || '';
  const requestedReportType =
    req.nextUrl.searchParams.get('report_type')?.trim() || 'standard_report';

  if (!submissionIdParam && !paymentIdParam) {
    return NextResponse.json({ error: 'submission_id or payment_id is required' }, { status: 400 });
  }

  if (
    requestedReportType !== 'standard_report' &&
    requestedReportType !== 'investor_report_pro'
  ) {
    return NextResponse.json({ error: 'Invalid report_type' }, { status: 400 });
  }

  const reportType = requestedReportType as ReportType;

  try {
    let submissionId = submissionIdParam;

    const { data: submissionById, error: submissionLookupError } = submissionId
      ? await supabaseAdmin
          .from('property_submissions')
          .select('id, status')
          .eq('id', submissionId)
          .maybeSingle()
      : { data: null, error: null };

    if (submissionLookupError) throw submissionLookupError;

    if (!submissionById && paymentIdParam) {
      const { data: payment, error: paymentLookupError } = await supabaseAdmin
        .from('payments')
        .select('submission_id')
        .eq('id', paymentIdParam)
        .maybeSingle();

      if (paymentLookupError) throw paymentLookupError;
      if (payment?.submission_id) submissionId = payment.submission_id;
    }

    if (!submissionId) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    if (paystackReference) {
      const verified = await verifyPaystackTransaction(paystackReference);
      const transaction = verified.data;
      if (!transaction || transaction.status !== 'success' || transaction.currency !== 'ZAR') {
        return NextResponse.json({ status: 'awaiting_payment', reportType, submissionId });
      }

      const metadata = typeof transaction.metadata === 'string'
        ? (() => { try { return JSON.parse(transaction.metadata) as Record<string, unknown>; } catch { return {}; } })()
        : (transaction.metadata && typeof transaction.metadata === 'object' ? transaction.metadata as Record<string, unknown> : {});
      const verifiedPaymentId = typeof metadata.payment_id === 'string' ? metadata.payment_id : paymentIdParam;
      const verifiedSubmissionId = typeof metadata.submission_id === 'string' ? metadata.submission_id : submissionId;
      const verifiedProduct = typeof metadata.product === 'string' ? metadata.product : reportType;

      if (verifiedSubmissionId !== submissionId || !verifiedPaymentId || verifiedProduct !== reportType) {
        return NextResponse.json({ error: 'Payment verification mismatch' }, { status: 400 });
      }

      const { data: verifiedPayment, error: verifiedPaymentError } = await supabaseAdmin
        .from('payments')
        .select('id, submission_id, product, amount_cents, status')
        .eq('id', verifiedPaymentId)
        .maybeSingle();
      if (verifiedPaymentError) throw verifiedPaymentError;
      if (!verifiedPayment || verifiedPayment.submission_id !== submissionId || verifiedPayment.product !== verifiedProduct || verifiedPayment.amount_cents !== transaction.amount) {
        return NextResponse.json({ error: 'Payment verification mismatch' }, { status: 400 });
      }

      if (verifiedPayment.status !== 'completed') {
        const { error: paymentUpdateError } = await supabaseAdmin
          .from('payments')
          .update({ status: 'completed' })
          .eq('id', verifiedPayment.id)
          .eq('status', 'pending');
        if (paymentUpdateError) throw paymentUpdateError;
      }

      if (reportType === 'standard_report') {
        await supabaseAdmin.from('property_submissions').update({ status: 'paid' }).eq('id', submissionId);
      }
    }

    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('property_submissions')
      .select('id, status')
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    if (!['paid', 'report_sent'].includes(submission.status)) {
      return NextResponse.json({ status: 'awaiting_payment', reportType, submissionId });
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
        return NextResponse.json({ status: 'awaiting_payment', reportType, submissionId });
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
      const { data: createdReport, error: createReportError } = await supabaseAdmin
        .from('reports')
        .insert({ submission_id: submissionId, status: 'queued', report_type: reportType })
        .select('id, status, access_token, report_type')
        .single();
      if (createReportError) throw createReportError;

      try {
        const result = await processReport(submissionId, { reportType });
        if (result.status === 'completed' && 'reportUrl' in result) {
          return NextResponse.json({ status: 'completed', reportType, submissionId, reportUrl: result.reportUrl });
        }
      } catch (error) {
        console.error('[Report Status] Initial processing failed', error);
      }

      return NextResponse.json({ status: createdReport.status, reportType, submissionId });
    }

    if (report.status === 'completed' || report.status === 'sent') {
      const reportUrl =
        `${BASE_URL}/report/${report.id}?token=${encodeURIComponent(report.access_token || '')}`;
      return NextResponse.json({ status: 'completed', reportType, submissionId, reportUrl });
    }

    if (report.status === 'failed' || report.status === 'queued') {
      try {
        const result = await processReport(submissionId, { reportType });
        if (result.status === 'completed' && 'reportUrl' in result) {
          return NextResponse.json({
            status: 'completed',
            reportType,
            submissionId,
            reportUrl: result.reportUrl,
          });
        }
      } catch (error) {
        console.error('[Report Status] Processing failed', error);
      }

      if (report.status === 'failed') {
        return NextResponse.json({ status: 'failed', reportType, submissionId }, { status: 500 });
      }
    }

    return NextResponse.json({ status: report.status, reportType, submissionId });
  } catch (error) {
    console.error('[Report Status]', error);
    return NextResponse.json(
      { error: 'Unable to check report status' },
      { status: 500 },
    );
  }
}
