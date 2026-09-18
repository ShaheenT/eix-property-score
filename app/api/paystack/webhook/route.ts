import { NextRequest, NextResponse } from 'next/server';
import { processReport } from '@/lib/report-processor';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyPaystackWebhookSignature, verifyPaystackTransaction } from '@/lib/paystack';

export const runtime = 'nodejs';
export const maxDuration = 60;

type PaystackMetadata = {
  submission_id?: string;
  payment_id?: string;
  product?: string;
};

function parseMetadata(value: unknown): PaystackMetadata {
  if (typeof value === 'string') {
    try { return JSON.parse(value) as PaystackMetadata; } catch { return {}; }
  }
  if (value && typeof value === 'object') return value as PaystackMetadata;
  return {};
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-paystack-signature') || '';

    if (!verifyPaystackWebhookSignature(rawBody, signature)) {
      console.error('[Paystack Webhook] Signature mismatch');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBody) as {
      event?: string;
      data?: {
        id?: number;
        status?: string;
        reference?: string;
        amount?: number;
        currency?: string;
        metadata?: unknown;
      };
    };

    if (event.event !== 'charge.success' || !event.data) {
      return NextResponse.json({ status: 'ignored' });
    }

    const reference = typeof event.data.reference === 'string' ? event.data.reference : '';
    if (!reference) return NextResponse.json({ error: 'Payment reference missing' }, { status: 400 });

    const verified = await verifyPaystackTransaction(reference);
    const transaction = verified.data;
    if (!transaction || transaction.status !== 'success') {
      return NextResponse.json({ error: 'Transaction verification failed' }, { status: 400 });
    }

    if (transaction.currency !== 'ZAR' || transaction.amount <= 0) {
      return NextResponse.json({ error: 'Invalid transaction currency or amount' }, { status: 400 });
    }

    const metadata = parseMetadata(transaction.metadata ?? event.data.metadata);
    const submissionId = metadata.submission_id || '';
    const paymentId = metadata.payment_id || '';
    const product = metadata.product || '';

    if (!submissionId || !paymentId || !product) {
      return NextResponse.json({ error: 'Payment metadata incomplete' }, { status: 400 });
    }

    if (!['standard_report', 'investor_report_pro'].includes(product)) {
      return NextResponse.json({ error: 'Invalid payment product' }, { status: 400 });
    }

    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('property_submissions')
      .select('id')
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      console.error('[Paystack Webhook] Submission not found', { submissionId });
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select('id, submission_id, product, status, amount_cents')
      .eq('id', paymentId)
      .maybeSingle();

    if (paymentError) throw paymentError;
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

    if (payment.submission_id !== submission.id) {
      return NextResponse.json({ error: 'Payment does not belong to submission' }, { status: 400 });
    }
    if (payment.product !== product) {
      return NextResponse.json({ error: 'Payment product mismatch' }, { status: 400 });
    }
    if (payment.amount_cents !== transaction.amount) {
      console.error('[Paystack Webhook] Amount mismatch', {
        paymentId,
        expectedAmountCents: payment.amount_cents,
        receivedAmountCents: transaction.amount,
      });
      return NextResponse.json({ error: 'Payment amount mismatch' }, { status: 400 });
    }

    if (payment.status === 'completed') {
      return NextResponse.json({ status: 'ok', duplicate: true });
    }

    const { error: paymentUpdateError } = await supabaseAdmin
      .from('payments')
      .update({ status: 'completed' })
      .eq('id', payment.id)
      .eq('status', 'pending');

    if (paymentUpdateError) throw paymentUpdateError;

    if (product === 'standard_report') {
      await supabaseAdmin
        .from('property_submissions')
        .update({ status: 'paid' })
        .eq('id', submission.id);

      const { data: existingReport, error: reportLookupError } = await supabaseAdmin
        .from('reports')
        .select('id')
        .eq('submission_id', submission.id)
        .eq('report_type', 'standard_report')
        .maybeSingle();

      if (reportLookupError) throw reportLookupError;

      if (!existingReport) {
        const { error: reportInsertError } = await supabaseAdmin
          .from('reports')
          .insert({ submission_id: submission.id, status: 'queued', report_type: 'standard_report' });
        if (reportInsertError) throw reportInsertError;
      }

      try {
        await processReport(submission.id, { reportType: 'standard_report' });
      } catch (error) {
        console.error('[Paystack Webhook] Standard report processing failed', error);
      }
    } else {
      const { data: existingProReport, error: proReportLookupError } = await supabaseAdmin
        .from('reports')
        .select('id, status')
        .eq('submission_id', submission.id)
        .eq('report_type', 'investor_report_pro')
        .maybeSingle();

      if (proReportLookupError) throw proReportLookupError;

      if (!existingProReport) {
        const { error: reportInsertError } = await supabaseAdmin
          .from('reports')
          .insert({ submission_id: submission.id, status: 'queued', report_type: 'investor_report_pro' });
        if (reportInsertError) throw reportInsertError;
      }

      try {
        await processReport(submission.id, { reportType: 'investor_report_pro' });
      } catch (error) {
        console.error('[Paystack Webhook] Investor Report Pro processing failed', error);
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Paystack Webhook]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
