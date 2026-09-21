import test from 'node:test';
import assert from 'node:assert/strict';
import { POST } from '@/app/api/property-intelligence/route';

test('property intelligence API rejects requests without a listing URL', async () => {
  const request = new Request('https://example.test/api/property-intelligence', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  const response = await POST(request as never);
  assert.equal(response.status, 400);
});

test('property intelligence API does not invent market evidence for unsupported sources', async () => {
  const request = new Request('https://example.test/api/property-intelligence', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ listingUrl: 'https://example.com/property/123' }),
  });
  const response = await POST(request as never);
  assert.equal(response.status, 422);
  const payload = await response.json();
  assert.equal(payload.status, 'unsupported_source');
});
