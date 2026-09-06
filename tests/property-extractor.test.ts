import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_MAX_RESPONSE_BYTES,
  DEFAULT_EXTRACTION_TIMEOUT_MS,
  extractPropertyFromUrl,
} from '../lib/property-extractor';

test('exports safe extraction limits', () => {
  assert.equal(DEFAULT_EXTRACTION_TIMEOUT_MS, 10_000);
  assert.equal(DEFAULT_MAX_RESPONSE_BYTES, 2_000_000);
});

test('rejects unsupported domains before fetching', async () => {
  const result = await extractPropertyFromUrl(
    'https://example.com/property/123'
  );

  assert.equal(result.status, 'unsupported_source');
  assert.match(
    result.errors[0] ?? '',
    /do not currently support/i
  );
});

test('rejects localhost before fetching', async () => {
  const result = await extractPropertyFromUrl(
    'http://localhost:3000/property'
  );

  assert.equal(result.status, 'unsupported_source');
  assert.match(
    result.errors[0] ?? '',
    /valid|supported/i
  );
});

test('rejects loopback IP before fetching', async () => {
  const result = await extractPropertyFromUrl(
    'http://127.0.0.1/property'
  );

  assert.equal(result.status, 'unsupported_source');
});

test('rejects private network IP before fetching', async () => {
  const result = await extractPropertyFromUrl(
    'http://192.168.1.10/property'
  );

  assert.equal(result.status, 'unsupported_source');
});

test('rejects malformed property URLs', async () => {
  const result = await extractPropertyFromUrl(
    'https://property24.com/[broken'
  );

  assert.equal(result.status, 'unsupported_source');
});

test('rejects unsupported source domains without network access', async () => {
  const result = await extractPropertyFromUrl(
    'https://malicious-example.test/property'
  );

  assert.equal(result.status, 'unsupported_source');
});

test('accepts a syntactically valid supported Property24 URL for processing', async () => {
  const result = await extractPropertyFromUrl(
    'https://www.property24.com/for-sale/cape-town/western-cape/12345'
  );

  assert.notEqual(result.status, 'unsupported_source');
});

test('returns structured failure data instead of throwing', async () => {
  const result = await extractPropertyFromUrl(
    'https://property24.com/property/this-test-should-not-crash'
  );

  assert.equal(typeof result.sourceUrl, 'string');
  assert.ok(Array.isArray(result.errors));
  assert.ok(Array.isArray(result.evidence));
  assert.equal(typeof result.facts, 'object');
});
