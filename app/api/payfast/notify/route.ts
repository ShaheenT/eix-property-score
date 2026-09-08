import { NextRequest, NextResponse } from 'next/server';
import { processReport } from '@/lib/report-processor';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyPayFastITNSignature } from '@/lib/payfast';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    const receivedSignature = params.signature || '';
    if (!verifyPayFastITNSignature(params, receivedSignature)) {
      console.error('[PayFast ITN] Signature mismatch', {
        keys: Object.keys(params).filter((key) => key !== 'signature'),
        receivedSignaturePresent: Boolean(receivedSignature),
      });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const paymentStatus = params.payment_status || '';
    const submissionId = params.m_payment_id || '';
    const paymentId = params.custom_str2 || '';
    const product = params.custom_str1 || '';
    const pfPaymentId = params.pf_payment_id || '';

    if (paymentStatus === 'COMPLETE' && submissionId) {
      const { data: submission, error: submissionError } = await supabaseAdmin
        .from('property_submissions')
        .select('id')
        .eq('id', submissionId)
        .single();

      if (submissionError || !submission) {
        console.error('[PayFast ITN] Submission not found', { submissionId });
        return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
      }

      let payment: {
        id: string;
        submission_id: string;
        product: string;
        status: string;
      } | null = null;

      if (paymentId) {
        const { data: exactPayment, error: paymentError } = await supabaseAdmin
          .from('payments')
          .select('id, submission_id, product, status')
          .eq('id', paymentId)
          .maybeSingle();

        if (paymentError) throw paymentError;
        if (!exactPayment) {
          return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
        }
        payment = exactPayment;
      } else {
        if (product !== 'standard_report') {
          return NextResponse.json(
            { error: 'Payment reference is required for this product' },
            { status: 400 },
          );
        }

        const { data: legacyPayments, error: legacyPaymentError } = await supabaseAdmin
          .from('payments')
          .select('id, submission_id, product, status')
          .eq('submission_id', submission.id)
          .eq('product', 'standard_report')
          .eq('status', 'pending');

        if (legacyPaymentError) throw legacyPaymentError;
        if (!legacyPayments || legacyPayments.length !== 1) {
          return NextResponse.json(
            { error: 'Could not uniquely identify the payment' },
            { status: 409 },
          );
        }
        payment = legacyPayments[0];
      }

      if (payment.submission_id !== submission.id) {
        console.error('[PayFast ITN] Payment/submission mismatch', {
          paymentId: payment.id,
          paymentSubmissionId: payment.submission_id,
          submissionId: submission.id,
        });
        return NextResponse.json(
          { error: 'Payment does not belong to submission' },
          { status: 400 },
        );
      }

      if (payment.product !== product) {
        console.error('[PayFast ITN] Product mismatch', {
          paymentId: payment.id,
          databaseProduct: payment.product,
          payfastProduct: product,
        });
        return NextResponse.json(
          { error: 'Payment product mismatch' },
          { status: 400 },
        );
      }

      const { error: paymentUpdateError } = await supabaseAdmin
        .from('payments')
        .update({
          status: 'completed',
          payfast_payment_id: pfPaymentId || null,
        })
        .eq('id', payment.id);

      if (paymentUpdateError) throw paymentUpdateError;

      if (payment.product === 'standard_report') {
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
            .insert({
              submission_id: submission.id,
              status: 'queued',
              report_type: 'standard_report',
            });
          if (reportInsertError) throw reportInsertError;
        }

        try {
          await processReport(submission.id, { reportType: 'standard_report' });
        } catch (error) {
          console.error('[PayFast ITN] Standard report processing failed', error);
        }
      } else if (payment.product === 'investor_report_pro') {
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
            .insert({
              submission_id: submission.id,
              status: 'queued',
              report_type: 'investor_report_pro',
            });
          if (reportInsertError) throw reportInsertError;
        }

        try {
          await processReport(submission.id, { reportType: 'investor_report_pro' });
        } catch (error) {
          console.error('[PayFast ITN] Investor Report Pro processing failed', error);
        }
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[PayFast ITN]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
