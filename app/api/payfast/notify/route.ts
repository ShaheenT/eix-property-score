import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyPayFastSignature } from '@/lib/payfast';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    const receivedSignature = params.signature || '';
    const isValid = verifyPayFastSignature(params, receivedSignature);

    if (!isValid) {
      console.error('[PayFast ITN] Signature mismatch', {
        keys: Object.keys(params).filter((key) => key !== 'signature'),
        receivedSignaturePresent: Boolean(receivedSignature),
      });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const paymentStatus = params.payment_status || '';
    const mPaymentId = params.m_payment_id || '';
    const pfPaymentId = params.pf_payment_id || '';

    if (paymentStatus === 'COMPLETE' && mPaymentId) {
      const { data: submission } = await supabaseAdmin
        .from('property_submissions')
        .select('id')
        .eq('id', mPaymentId)
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

        await supabaseAdmin.from('reports').insert({
          submission_id: submission.id,
          status: 'queued',
          report_type: params.custom_str1 || 'standard',
        });
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
