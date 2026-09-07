import { NextRequest, NextResponse } from 'next/server';
import { processReport } from '@/lib/report-processor';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyPayFastSignature } from '@/lib/payfast';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    const receivedSignature = params.signature || '';
    if (!verifyPayFastSignature(params, receivedSignature)) {
      console.error('[PayFast ITN] Signature mismatch', {
        keys: Object.keys(params).filter((key) => key !== 'signature'),
        receivedSignaturePresent: Boolean(receivedSignature),
      });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const paymentStatus = params.payment_status || '';
    const submissionId = params.m_payment_id || '';
    const pfPaymentId = params.pf_payment_id || '';

    if (paymentStatus === 'COMPLETE' && submissionId) {
      const { data: submission } = await supabaseAdmin
        .from('property_submissions')
        .select('id')
        .eq('id', submissionId)
        .single();

      if (submission) {
        await supabaseAdmin
          .from('payments')
          .update({ status: 'completed', payfast_payment_id: pfPaymentId })
          .eq('submission_id', submission.id);

        await supabaseAdmin
          .from('property_submissions')
          .update({ status: 'paid' })
          .eq('id', submission.id);

        const { data: existingReport } = await supabaseAdmin
          .from('reports')
          .select('id')
          .eq('submission_id', submission.id)
          .maybeSingle();

        if (!existingReport) {
          await supabaseAdmin.from('reports').insert({
            submission_id: submission.id,
            status: 'queued',
            report_type: params.custom_str1 || 'standard_report',
          });
        }

        try {
          await processReport(submission.id);
        } catch (error) {
          // Payment remains recorded. The report stays failed for a controlled retry
          // rather than making PayFast retry payment state transitions.
          console.error('[PayFast ITN] Report processing failed', error);
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
