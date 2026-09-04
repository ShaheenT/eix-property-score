import { createHash } from 'crypto';

const PF_MERCHANT_ID = process.env.PAYFAST_MERCHANT_ID || '10030587';
const PF_MERCHANT_KEY = process.env.PAYFAST_MERCHANT_KEY || '';
const PF_PASSPHRASE = process.env.PAYFAST_PASSPHRASE || '';
const PF_URL =
  process.env.PAYFAST_URL || 'https://sandbox.payfast.co.za/eng/process';

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || 'https://eix-property-score-beta.vercel.app';

interface PayFastParams {
  amount: number;
  itemName: string;
  submissionId: string;
  customerEmail: string;
  customerName: string;
  product: 'standard_report' | 'investor_report_pro';
}

function buildSignature(
  params: Record<string, string>,
  passphrase?: string
): string {
  const paramString = Object.entries(params)
    .filter(([, value]) => value !== '' && value !== undefined)
    .map(
      ([key, value]) =>
        `${key}=${encodeURIComponent(value.trim()).replace(/%20/g, '+')}`
    )
    .join('&');

  const finalString = passphrase
    ? `${paramString}&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}`
    : paramString;

  return createHash('md5').update(finalString).digest('hex');
}

export function createPayFastPaymentLink({
  amount,
  itemName,
  submissionId,
  customerEmail,
  customerName,
  product,
}: PayFastParams): { url: string; params: Record<string, string> } {
  const isPro = product === 'investor_report_pro';

  const returnUrl = isPro
    ? `${BASE_URL}/payment/pro-success`
    : `${BASE_URL}/success`;

  const cancelUrl = isPro
    ? `${BASE_URL}/upsell/pro`
    : `${BASE_URL}/`;

  const params: Record<string, string> = {
    merchant_id: PF_MERCHANT_ID,
    merchant_key: PF_MERCHANT_KEY,
    return_url: returnUrl,
    cancel_url: cancelUrl,
    notify_url: `${BASE_URL}/api/payfast/notify`,
    name_first: customerName.split(' ')[0] || '',
    name_last: customerName.split(' ').slice(1).join(' ') || '',
    email_address: customerEmail,
    m_payment_id: submissionId,
    amount: amount.toFixed(2),
    item_name: itemName,
    custom_str1: product,
  };

  params.signature = buildSignature(params, PF_PASSPHRASE);

  const queryString = Object.entries(params)
    .map(
      ([key, value]) =>
        `${key}=${encodeURIComponent(value).replace(/%20/g, '+')}`
    )
    .join('&');

  return {
    url: `${PF_URL}?${queryString}`,
    params,
  };
}

export function verifyPayFastSignature(
  params: Record<string, string>,
  receivedSignature: string
): boolean {
  const entries = Object.entries(params).filter(
    ([key, value]) =>
      key !== 'signature' && value !== '' && value !== undefined
  );

  const paramString = entries
    .map(
      ([key, value]) =>
        `${key}=${encodeURIComponent(value).replace(/%20/g, '+')}`
    )
    .join('&');

  const finalString = PF_PASSPHRASE
    ? `${paramString}&passphrase=${encodeURIComponent(PF_PASSPHRASE).replace(/%20/g, '+')}`
    : paramString;

  const recalculated = createHash('md5').update(finalString).digest('hex');

  return recalculated === receivedSignature;
}
