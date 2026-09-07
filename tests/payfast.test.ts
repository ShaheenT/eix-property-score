import test from 'node:test';
import assert from 'node:assert/strict';
import { createPayFastPaymentLink, verifyPayFastSignature } from '../lib/payfast';

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
