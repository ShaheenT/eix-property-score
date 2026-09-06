import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createPayFastPaymentLink } from '@/lib/payfast';
import { validatePropertyInput } from '@/lib/property-input';

const ALLOWED_GOALS = new Set(['Buy to Live', 'Rental', 'Flip']);
const ALLOWED_PRODUCTS = new Set(['standard_report', 'investor_report_pro']);

function isValidEmail(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
  );
}

function cleanString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();

  if (!trimmed || trimmed.length > maxLength) return null;

  return trimmed;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Invalid checkout request.' },
        { status: 400 }
      );
    }

    const name = cleanString(body.name, 120);
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const whatsapp =
      typeof body.whatsapp === 'string' ? body.whatsapp.trim() : '';
    const listingUrl =
      typeof body.listing_url === 'string' ? body.listing_url : '';
    const goal = typeof body.goal === 'string' ? body.goal.trim() : '';
    const product =
      typeof body.product === 'string'
        ? body.product
        : 'standard_report';

    if (!name || !email || !listingUrl.trim() || !goal) {
      return NextResponse.json(
        { error: 'Name, email, property and goal are required.' },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    if (!ALLOWED_GOALS.has(goal)) {
      return NextResponse.json(
        { error: 'Please select a valid property goal.' },
        { status: 400 }
      );
    }

    if (!ALLOWED_PRODUCTS.has(product)) {
      return NextResponse.json(
        { error: 'Invalid report product.' },
        { status: 400 }
      );
    }

    if (whatsapp.length > 40) {
      return NextResponse.json(
        { error: 'WhatsApp number is too long.' },
        { status: 400 }
      );
    }

    /*
     * SERVER-AUTHORITATIVE PROPERTY VALIDATION
     *
     * Nothing customer/payment related is created until this succeeds.
     */
    const propertyInput = validatePropertyInput(listingUrl);

    if (!propertyInput.ok) {
      return NextResponse.json(
        {
          error:
            propertyInput.errorMessage ||
            'Please enter a valid property listing URL or address.',
          code: propertyInput.errorCode,
        },
        { status: 422 }
      );
    }

    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .insert({
        name,
        email,
        whatsapp: whatsapp || null,
      })
      .select('id')
      .single();

    if (customerError) throw customerError;

    const { data: submission, error: subError } = await supabaseAdmin
      .from('property_submissions')
      .insert({
        customer_id: customer.id,
        listing_url: propertyInput.normalizedInput,
        source_platform: propertyInput.source,
        goal,
        status: 'awaiting_payment',
      })
      .select('id')
      .single();

    if (subError) throw subError;

    const prod = product as 'standard_report' | 'investor_report_pro';
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
      property: {
        kind: propertyInput.kind,
        source: propertyInput.source,
        source_label: propertyInput.sourceLabel,
      },
    });
  } catch (err) {
    console.error('[Checkout] Unexpected error', err);

    const message =
      err instanceof Error ? `${err.name}: ${err.message}` : 'Unknown error';

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
