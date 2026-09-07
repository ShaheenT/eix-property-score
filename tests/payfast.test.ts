import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'crypto';
import { createPayFastPaymentLink, verifyPayFastSignature } from '../lib/payfast';

function payfastUrlencode(value: string): string {
  return encodeURIComponent(value.trim())
    .replace(/%20/g, '+')
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/~/g, '%7E');
}

test('PayFast signatures use the same URL encoding for creation and ITN verification', () => {
  const payment = createPayFastPaymentLink({
    amount: 149,
    itemName: 'EiX! Property Score™ — Standard Report',
    submissionId: 'submission-123',
    customerEmail: 'buyer@example.com',
    customerName: 'Test Buyer',
    product: 'standard_report',
  });

  const { signature, ...itnParams } = payment.params;

  assert.equal(
    verifyPayFastSignature(itnParams, signature),
    true,
  );
});

test('PayFast ITN verification includes blank fields posted before signature', () => {
  const params: Record<string, string> = {
    m_payment_id: 'submission-itn-123',
    pf_payment_id: '1089250',
    payment_status: 'COMPLETE',
    item_name: 'EiX Property Score',
    item_description: '',
    amount_gross: '149.00',
    amount_fee: '-4.47',
    amount_net: '144.53',
    custom_str1: 'standard_report',
    custom_str2: '',
    custom_str3: '',
    custom_str4: '',
    custom_str5: '',
    custom_int1: '',
    custom_int2: '',
    custom_int3: '',
    custom_int4: '',
    custom_int5: '',
    name_first: 'Test',
    name_last: 'Buyer',
    email_address: 'buyer@example.com',
    merchant_id: process.env.PAYFAST_MERCHANT_ID || '10030587',
  };

  const paramString = Object.entries(params)
    .map(([key, value]) => `${key}=${payfastUrlencode(value)}`)
    .join('&');
  const passphrase = process.env.PAYFAST_PASSPHRASE || '';
  const signedString = passphrase
    ? `${paramString}&passphrase=${payfastUrlencode(passphrase)}`
    : paramString;
  const signature = createHash('md5').update(signedString).digest('hex');

  assert.equal(verifyPayFastSignature(params, signature), true);
});

test('PayFast signature verification rejects a changed value', () => {
  const payment = createPayFastPaymentLink({
    amount: 149,
    itemName: 'EiX Property Score',
    submissionId: 'submission-456',
    customerEmail: 'buyer@example.com',
    customerName: 'Test Buyer',
    product: 'standard_report',
  });

  const { signature, ...itnParams } = payment.params;
  itnParams.amount = '150.00';

  assert.equal(
    verifyPayFastSignature(itnParams, signature),
    false,
  );
});
