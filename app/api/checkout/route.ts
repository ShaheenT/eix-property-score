import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { initializePaystackTransaction } from '@/lib/paystack';
import { validatePropertyInput } from '@/lib/property-input';

const ALLOWED_GOALS = new Set(['Buy to Live', 'Rental', 'Flip']);
const ALLOWED_PRODUCTS = new Set(['standard_report', 'investor_report_pro']);
const ALLOWED_BUYER_TYPES = new Set(['south_african', 'international']);
const STANDARD_REPORT_PRICE_ZAR = 149;
const INTERNATIONAL_BUYER_PRICE_ZAR = 1495;
const INVESTOR_REPORT_PRO_PRICE_ZAR = 349;

function isValidEmail(value: unknown): value is string { return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()); }
function cleanString(value: unknown, maxLength: number): string | null { if (typeof value !== 'string') return null; const trimmed = value.trim(); if (!trimmed || trimmed.length > maxLength) return null; return trimmed; }
function normaliseWhatsApp(value: string): string | null { const digits = value.replace(/\D/g, ''); if (digits.length < 8 || digits.length > 15) return null; return `+${digits}`; }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid checkout request.' }, { status: 400 });

    const name = cleanString(body.name, 120);
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const whatsapp = typeof body.whatsapp === 'string' ? body.whatsapp.trim() : '';
    const listingUrl = typeof body.listing_url === 'string' ? body.listing_url : '';
    const goal = typeof body.goal === 'string' ? body.goal.trim() : '';
    const submissionId = typeof body.submission_id === 'string' ? body.submission_id.trim() : '';
    const product = typeof body.product === 'string' ? body.product : 'standard_report';
    const buyerType = typeof body.buyer_type === 'string' ? body.buyer_type.trim() : 'south_african';
    const buyerCountry = cleanString(body.buyer_country, 80);
    const buyerPurpose = cleanString(body.buyer_purpose, 80);
    const buyerBudget = cleanString(body.buyer_budget, 40);

    if (product === 'standard_report' && (!name || !email || !whatsapp || !listingUrl.trim() || !goal)) return NextResponse.json({ error: 'Full name, email, WhatsApp number, property and goal are required.' }, { status: 400 });
    if (product === 'investor_report_pro' && !submissionId) return NextResponse.json({ error: 'A valid submission_id is required for the Investor Report Pro upgrade.' }, { status: 400 });
    if (product === 'standard_report' && !isValidEmail(email)) return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    if (product === 'standard_report' && !ALLOWED_GOALS.has(goal)) return NextResponse.json({ error: 'Please select a valid property goal.' }, { status: 400 });
    if (!ALLOWED_PRODUCTS.has(product)) return NextResponse.json({ error: 'Invalid report product.' }, { status: 400 });
    if (!ALLOWED_BUYER_TYPES.has(buyerType)) return NextResponse.json({ error: 'Invalid buyer type.' }, { status: 400 });

    const normalisedWhatsapp = product === 'standard_report' ? normaliseWhatsApp(whatsapp) : null;
    if (product === 'standard_report' && !normalisedWhatsapp) return NextResponse.json({ error: 'Please enter a valid international WhatsApp number.' }, { status: 400 });
    if (whatsapp.length > 40) return NextResponse.json({ error: 'WhatsApp number is too long.' }, { status: 400 });

    const prod = product as 'standard_report' | 'investor_report_pro';
    let customer: { id: string; name: string; email: string };
    let submission: { id: string; listing_url: string; source_platform: string | null; goal: string; status: string };
    let propertyInput: ReturnType<typeof validatePropertyInput> | null = null;

    if (prod === 'standard_report') {
      propertyInput = validatePropertyInput(listingUrl);
      if (!propertyInput.ok) return NextResponse.json({ error: propertyInput.errorMessage || 'Please enter a valid property listing URL or address.', code: propertyInput.errorCode }, { status: 422 });

      const { data: createdCustomer, error: customerError } = await supabaseAdmin.from('customers').insert({ name, email, whatsapp: normalisedWhatsapp }).select('id, name, email').single();
      if (customerError) throw customerError;
      customer = createdCustomer;

      const { data: createdSubmission, error: subError } = await supabaseAdmin.from('property_submissions').insert({
        customer_id: customer.id,
        listing_url: propertyInput.normalizedInput,
        source_platform: propertyInput.source,
        goal,
        status: 'awaiting_payment',
        buyer_type: buyerType,
        buyer_country: buyerCountry,
        buyer_purpose: buyerPurpose,
        buyer_budget: buyerBudget,
      }).select('id, listing_url, source_platform, goal, status').single();
      if (subError) throw subError;
      submission = createdSubmission;
    } else {
      const { data: existingSubmission, error: submissionError } = await supabaseAdmin.from('property_submissions').select('id, listing_url, source_platform, goal, status, customer:customers(id, name, email)').eq('id', submissionId).single();
      if (submissionError || !existingSubmission) return NextResponse.json({ error: 'Property submission not found.' }, { status: 404 });
      if (existingSubmission.status !== 'paid' && existingSubmission.status !== 'report_sent') return NextResponse.json({ error: 'The standard Property Score must be paid before upgrading to Investor Report Pro.' }, { status: 409 });

      const existingCustomer = existingSubmission.customer as { id: string; name: string; email: string } | { id: string; name: string; email: string }[] | null;
      const resolvedCustomer = Array.isArray(existingCustomer) ? existingCustomer[0] : existingCustomer;
      if (!resolvedCustomer || typeof resolvedCustomer.id !== 'string' || typeof resolvedCustomer.name !== 'string' || typeof resolvedCustomer.email !== 'string') return NextResponse.json({ error: 'Customer record for this submission could not be loaded.' }, { status: 500 });
      customer = resolvedCustomer;
      submission = { id: existingSubmission.id, listing_url: existingSubmission.listing_url, source_platform: existingSubmission.source_platform, goal: existingSubmission.goal, status: existingSubmission.status };

      const { data: standardPayment, error: standardPaymentError } = await supabaseAdmin.from('payments').select('id').eq('submission_id', submission.id).eq('product', 'standard_report').eq('status', 'completed').maybeSingle();
      if (standardPaymentError) throw standardPaymentError;
      if (!standardPayment) return NextResponse.json({ error: 'A completed standard report payment is required before upgrading.' }, { status: 409 });

      const { data: existingProPayment, error: proPaymentLookupError } = await supabaseAdmin.from('payments').select('id, status').eq('submission_id', submission.id).eq('product', 'investor_report_pro').in('status', ['pending', 'completed']).maybeSingle();
      if (proPaymentLookupError) throw proPaymentLookupError;
      if (existingProPayment) return NextResponse.json({ error: existingProPayment.status === 'completed' ? 'Investor Report Pro has already been purchased for this property.' : 'Investor Report Pro checkout is already pending for this property.' }, { status: 409 });
    }

    const amount = prod === 'investor_report_pro'
      ? INVESTOR_REPORT_PRO_PRICE_ZAR
      : buyerType === 'international'
        ? INTERNATIONAL_BUYER_PRICE_ZAR
        : STANDARD_REPORT_PRICE_ZAR;
    const itemName = prod === 'investor_report_pro'
      ? 'EiXPropScore™ Investor Report Pro'
      : buyerType === 'international'
        ? 'EiXPropScore™ International Buyer Intelligence'
        : 'EiXPropScore™ Founding Beta';
    const { data: payment, error: paymentError } = await supabaseAdmin.from('payments').insert({ submission_id: submission.id, customer_id: customer.id, amount_cents: amount * 100, product: prod, status: 'pending' }).select('id').single();
    if (paymentError) throw paymentError;
    const { error: paymentReferenceError } = await supabaseAdmin.from('payments').update({ payment_reference: payment.id }).eq('id', payment.id);
    if (paymentReferenceError) throw paymentReferenceError;

    const requestOrigin = req.nextUrl.origin;
    const { url, reference } = await initializePaystackTransaction({ amount, itemName, submissionId: submission.id, paymentId: payment.id, customerEmail: customer.email, customerName: customer.name, product: prod, baseUrl: requestOrigin });
    const { error: referenceError } = await supabaseAdmin.from('payments').update({ payment_reference: reference }).eq('id', payment.id);
    if (referenceError) throw referenceError;
    return NextResponse.json({ checkout_url: url, submission_id: submission.id, payment_id: payment.id, amount_zar: amount, buyer_type: buyerType, property: { kind: propertyInput?.kind ?? 'listing', source: propertyInput?.source ?? submission.source_platform, source_label: propertyInput?.sourceLabel ?? submission.source_platform } });
  } catch (err) {
    console.error('[Checkout] Unexpected error', err);
    const message = err instanceof Error ? `${err.name}: ${err.message}` : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
