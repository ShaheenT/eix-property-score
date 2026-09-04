import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createPayFastPaymentLink } from '@/lib/payfast';
import { detectPropertySource } from '@/lib/property-source';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, whatsapp, listing_url, goal, product } = body as {
      name: string;
      email: string;
      whatsapp?: string;
      listing_url: string;
      goal: string;
      product?: 'standard_report' | 'investor_report_pro';
    };

    if (!name || !email || !listing_url || !goal) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .insert({ name, email, whatsapp: whatsapp || null })
      .select('id')
      .single();

    if (customerError) throw customerError;

    const detected = detectPropertySource(listing_url);

    const { data: submission, error: subError } = await supabaseAdmin
      .from('property_submissions')
      .insert({
        customer_id: customer.id,
        listing_url,
        source_platform: detected.source,
        goal,
        status: 'awaiting_payment',
      })
      .select('id')
      .single();

    if (subError) throw subError;

    const prod = product || 'standard_report';
    const amount = prod === 'investor_report_pro' ? 349 : 149;
    const itemName =
      prod === 'investor_report_pro'
        ? 'EiX Investor Report Pro'
        : 'EiX Property Score — Founding Beta';

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        submission_id: submission.id,
        customer_id: customer.id,
        amount_cents: amount * 100,
        product: prod,
        status: 'pending',
      })
      .select('id')
      .single();

    if (paymentError) throw paymentError;

    const { url } = createPayFastPaymentLink({
      amount,
      itemName,
      submissionId: submission.id,
      customerEmail: email,
      customerName: name,
      product: prod,
    });

    return NextResponse.json({
      checkout_url: url,
      submission_id: submission.id,
      payment_id: payment.id,
    });
  } catch (err) {
    const message = err instanceof Error ? `${err.name}: ${err.message}` : JSON.stringify(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
