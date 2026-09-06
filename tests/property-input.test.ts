import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validatePropertyInput,
} from '../lib/property-input';

test('accepts a real-looking Property24 URL', () => {
  const result = validatePropertyInput(
    'https://www.property24.com/for-sale/observatory/cape-town/western-cape/12345'
  );

  assert.equal(result.ok, true);
  assert.equal(result.kind, 'url');
  assert.equal(result.source, 'property24');
});

test('accepts a Private Property URL', () => {
  const result = validatePropertyInput(
    'https://www.privateproperty.co.za/for-sale/observatory/cape-town/12345'
  );

  assert.equal(result.ok, true);
  assert.equal(result.source, 'private_property');
});

test('accepts a recognised estate agency URL', () => {
  const result = validatePropertyInput(
    'https://www.remax.co.za/property/for-sale/cape-town/observatory/12345'
  );

  assert.equal(result.ok, true);
  assert.equal(result.kind, 'url');
  assert.equal(result.source, 'agency');
});

test('accepts a direct Cape Town street address', () => {
  const result = validatePropertyInput(
    '12 Main Road, Observatory, Cape Town, 7925'
  );

  assert.equal(result.ok, true);
  assert.equal(result.kind, 'address');
  assert.equal(result.source, 'address_only');
});

test('accepts an address without a postcode', () => {
  const result = validatePropertyInput(
    '45 Long Street, Cape Town'
  );

  assert.equal(result.ok, true);
  assert.equal(result.kind, 'address');
});

test('rejects empty input', () => {
  const result = validatePropertyInput('');

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'EMPTY_INPUT');
});

test('rejects whitespace-only input', () => {
  const result = validatePropertyInput('     ');

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'EMPTY_INPUT');
});

test('rejects malformed URLs', () => {
  const result = validatePropertyInput(
    'https://property24.com/[broken'
  );

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'INVALID_URL');
});

test('rejects unsupported websites instead of classifying them as agencies', () => {
  const result = validatePropertyInput(
    'https://example.com/not-a-property'
  );

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'UNSUPPORTED_URL');
});

test('rejects a malicious lookalike Property24 domain', () => {
  const result = validatePropertyInput(
    'https://evilproperty24.co.za/listing/123'
  );

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'UNSUPPORTED_URL');
});

test('rejects another malicious Property24 subdomain lookalike', () => {
  const result = validatePropertyInput(
    'https://property24.co.za.evil.example/listing/123'
  );

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'UNSUPPORTED_URL');
});

test('rejects localhost URLs', () => {
  const result = validatePropertyInput(
    'http://localhost:3000/property'
  );

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'INVALID_URL');
});

test('rejects loopback IP URLs', () => {
  const result = validatePropertyInput(
    'http://127.0.0.1/property'
  );

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'INVALID_URL');
});

test('rejects private network URLs', () => {
  const result = validatePropertyInput(
    'http://192.168.1.10/property'
  );

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'INVALID_URL');
});

test('rejects javascript-style payloads', () => {
  const result = validatePropertyInput(
    'javascript:alert(1)'
  );

  assert.equal(result.ok, false);
});

test('rejects script injection in an address', () => {
  const result = validatePropertyInput(
    '12 Main Road <script>alert(1)</script>, Cape Town'
  );

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'INVALID_ADDRESS');
});

test('rejects extremely long input', () => {
  const result = validatePropertyInput('12 Main Road, ' + 'A'.repeat(600));

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'INPUT_TOO_LONG');
});

test('rejects garbage text', () => {
  const result = validatePropertyInput(
    'hello this is definitely not a property'
  );

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'INVALID_ADDRESS');
});

test('normalises whitespace in an address', () => {
  const result = validatePropertyInput(
    '  12   Main Road,   Observatory,   Cape Town  '
  );

  assert.equal(result.ok, true);
  assert.equal(
    result.normalizedInput,
    '12 Main Road, Observatory, Cape Town'
  );
});

test('normalises a www URL to HTTPS', () => {
  const result = validatePropertyInput(
    'www.property24.com/for-sale/12345'
  );

  assert.equal(result.ok, true);
  assert.equal(result.source, 'property24');
  assert.match(result.normalizedInput, /^https:\/\//);
});
