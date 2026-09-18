import { createHmac, timingSafeEqual } from 'crypto';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://eix-property-score-beta.vercel.app';
const PAYSTACK_API_URL = 'https://api.paystack.co';

export type PaystackProduct = 'standard_report' | 'investor_report_pro';

interface PaystackCheckoutParams {
  amount: number;
  itemName: string;
  submissionId: string;
  paymentId: string;
  customerEmail: string;
  customerName: string;
  product: PaystackProduct;
}

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

function requireSecretKey(): string {
  if (!PAYSTACK_SECRET_KEY) throw new Error('PAYSTACK_SECRET_KEY is not configured.');
  return PAYSTACK_SECRET_KEY;
}

export async function initializePaystackTransaction({
  amount,
  itemName,
  submissionId,
  paymentId,
  customerEmail,
  customerName,
  product,
}: PaystackCheckoutParams): Promise<{ url: string; reference: string }> {
  const secretKey = requireSecretKey();
  const isPro = product === 'investor_report_pro';
  const returnPath = isPro ? '/payment/pro-success' : '/success';
  const callbackUrl = `${BASE_URL}${returnPath}?submission_id=${encodeURIComponent(submissionId)}&payment_id=${encodeURIComponent(paymentId)}`;
  const reference = `eix-${paymentId.replace(/[^a-zA-Z0-9.=-]/g, '').slice(0, 80)}`;

  const payload = {
    email: customerEmail,
    amount: String(Math.round(amount * 100)),
    currency: 'ZAR',
    reference,
    callback_url: callbackUrl,
    metadata: JSON.stringify({
      submission_id: submissionId,
      payment_id: paymentId,
      product,
      customer_name: customerName,
      item_name: itemName,
    }),
  };

  const response = await fetch(`${PAYSTACK_API_URL}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const data = (await response.json()) as PaystackInitializeResponse;
  if (!response.ok || !data.status || !data.data?.authorization_url || !data.data.reference) {
    throw new Error(data.message || 'Paystack could not initialize the transaction.');
  }

  return { url: data.data.authorization_url, reference: data.data.reference };
}

export function verifyPaystackWebhookSignature(rawBody: string, receivedSignature: string): boolean {
  if (!PAYSTACK_SECRET_KEY || !receivedSignature) return false;
  const expectedSignature = createHmac('sha512', PAYSTACK_SECRET_KEY).update(rawBody).digest('hex');
  const expected = Buffer.from(expectedSignature, 'utf8');
  const received = Buffer.from(receivedSignature, 'utf8');
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function verifyPaystackTransaction(reference: string): Promise<{
  status: boolean;
  data?: {
    id: number;
    status: string;
    reference: string;
    amount: number;
    currency: string;
    metadata?: unknown;
  };
}> {
  const secretKey = requireSecretKey();
  const response = await fetch(
    `${PAYSTACK_API_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secretKey}` }, cache: 'no-store' },
  );
  const data = await response.json();
  if (!response.ok || !data.status) throw new Error(data.message || 'Paystack transaction verification failed.');
  return data;
}
