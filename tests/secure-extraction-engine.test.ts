import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalizeListingUrl, identifySource, extractListingId } from '@/lib/secure-extraction-engine';
import { validatePropertyInput } from '@/lib/property-input';

test('canonicalizes Jawitz mobile tracking URL', () => {
  const url = canonicalizeListingUrl('https://m.jawitz.co.za/results/residential/for-sale/durbanville/clara-anna-fontein/house/3335363/?_gl=foo&gbraid=bar');
  assert.equal(url.hostname, 'm.jawitz.co.za');
  assert.equal(url.pathname.endsWith('/3335363/'), true);
  assert.equal(url.search, '');
});

test('recognizes all target agency domains', () => {
  const cases = [
    ['https://www.property24.com/for-sale/a/c/w/1/123456', 'property24'],
    ['https://www.privateproperty.co.za/for-sale/western-cape/cape-town/a/T5582432', 'private_property'],
    ['https://rawson.co.za/property/for-sale/constantia/1358643', 'rawson'],
    ['https://www.pamgolding.co.za/property-details/house-for-sale-claremont-upper/kw1752206', 'pam_golding'],
    ['https://www.seeff.com/results/residential/for-sale/cape-town/green-point/house/3399375/12-high-level-road/', 'seeff'],
    ['https://www.remax.co.za/property-for-sale-south-africa/western-cape/stellenbosch/stellenbosch-farms/5-bedroom-farm-for-sale-in-stellenbosch-farms-69925995', 'remax'],
    ['https://www.harcourts.co.za/results/residential/for-sale/hout-bay/beach-estate/townhouse/3289431/', 'harcourts'],
    ['https://www.century21.co.za/results/residential/for-sale/bettys-bay/bettys-bay/vacant-land/2797878/4-lakeside-drive/', 'century21'],
    ['https://m.jawitz.co.za/results/residential/for-sale/durbanville/clara-anna-fontein/house/3335363/', 'jawitz'],
  ] as const;
  for (const [input, expected] of cases) {
    const source = identifySource(new URL(input));
    assert.equal(source?.source, expected, input);
  }
});

test('extracts listing identifiers from the supplied real-world corpus', () => {
  assert.equal(extractListingId('private_property', new URL('https://www.privateproperty.co.za/for-sale/western-cape/boland/franschhoek/franschhoek/T5582432')), 'T5582432');
  assert.equal(extractListingId('rawson', new URL('https://rawson.co.za/property/for-sale/constantia/1358643')), '1358643');
  assert.equal(extractListingId('jawitz', new URL('https://m.jawitz.co.za/results/residential/for-sale/durbanville/clara-anna-fontein/house/3335363/')), '3335363');
  assert.equal(extractListingId('century21', new URL('https://www.century21.co.za/results/residential/for-sale/bettys-bay/bettys-bay/vacant-land/2797878/4-lakeside-drive/')), '4-lakeside-drive');
});

test('rejects unsupported and private destinations before extraction', () => {
  const unsupported = validatePropertyInput('https://example.com/property/123');
  assert.equal(unsupported.ok, false);
  assert.equal(unsupported.errorCode, 'UNSUPPORTED_URL');

  const local = validatePropertyInput('http://127.0.0.1:3000/property');
  assert.equal(local.ok, false);
  assert.equal(local.errorCode, 'INVALID_URL');
});

test('rejects credential-bearing URLs', () => {
  const result = validatePropertyInput('https://user:password@www.property24.com/for-sale/a/b/c/1/123456');
  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'INVALID_URL');
});
