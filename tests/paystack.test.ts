import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'crypto';

process.env.PAYSTACK_SECRET_KEY = 'test-paystack-secret';

const {
  initializePaystackTransaction,
  verifyPaystackWebhookSignature,
} = await import('../lib/paystack');

test('Paystack webhook signature verifies the exact raw payload', () => {
  const payload = JSON.stringify({ event: 'charge.success', data: { reference: 'eix-payment-123' } });
  const signature = createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(payload)
    .digest('hex');

  assert.equal(verifyPaystackWebhookSignature(payload, signature), true);
});

test('Paystack webhook signature rejects a changed payload', () => {
  const payload = JSON.stringify({ event: 'charge.success', data: { reference: 'eix-payment-123' } });
  const signature = createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(payload)
    .digest('hex');

  assert.equal(
    verifyPaystackWebhookSignature(JSON.stringify({ event: 'charge.success', data: { reference: 'tampered' } }), signature),
    false,
  );
});

test('Paystack webhook signature rejects a changed signature', () => {
  const payload = JSON.stringify({ event: 'charge.success', data: { reference: 'eix-payment-123' } });
  const signature = createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(payload)
    .digest('hex');

  assert.equal(verifyPaystackWebhookSignature(payload, `${signature.slice(0, -1)}0`), false);
});

test('Paystack checkout initializes ZAR amount in cents and returns hosted authorization URL', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_input, init) => {
    const body = JSON.parse(String(init?.body));
    assert.equal(body.amount, '14900');
    assert.equal(body.currency, 'ZAR');
    assert.equal(body.email, 'buyer@example.com');
    assert.match(body.reference, /^eix-[A-Za-z0-9.=-]+$/);
    assert.equal(JSON.parse(body.metadata).payment_id, 'payment-123');

    return new Response(JSON.stringify({
      status: true,
      message: 'Authorization URL created',
      data: {
        authorization_url: 'https://checkout.paystack.com/test-access-code',
        access_code: 'test-access-code',
        reference: body.reference,
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;

  try {
    const result = await initializePaystackTransaction({
      amount: 149,
      itemName: 'EiX Property Score',
      submissionId: 'submission-123',
      paymentId: 'payment-123',
      customerEmail: 'buyer@example.com',
      customerName: 'Test Buyer',
      product: 'standard_report',
    });

    assert.equal(result.url, 'https://checkout.paystack.com/test-access-code');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
