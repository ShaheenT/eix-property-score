import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalizeListingUrl,
  identifySource,
  extractListingId,
  runSecureExtraction,
} from '@/lib/secure-extraction-engine';
import { validatePropertyInput } from '@/lib/property-input';

test('canonicalizes Jawitz mobile tracking URL', () => {
  const url = canonicalizeListingUrl(
    'https://m.jawitz.co.za/results/residential/for-sale/durbanville/clara-anna-fontein/house/3335363/?_gl=foo&gbraid=bar',
  );
  assert.equal(url.hostname, 'm.jawitz.co.za');
  assert.equal(url.pathname.endsWith('/3335363/'), true);
  assert.equal(url.search, '');
});

test('canonicalizes all known tracking parameters without changing listing identity', () => {
  const url = canonicalizeListingUrl(
    'https://www.property24.com/for-sale/nooitgedacht-village/stellenbosch/western-cape/14758/117562641?utm_source=x&utm_medium=y&utm_campaign=z&gclid=a&fbclid=b&msclkid=c&keep=this',
  );
  assert.equal(url.search, '?keep=this');
  assert.equal(extractListingId('property24', url), '117562641');
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
    assert.equal(identifySource(new URL(input))?.source, expected, input);
  }
});

test('extracts listing identifiers from the supplied real-world corpus', () => {
  assert.equal(extractListingId('property24', new URL('https://www.property24.com/for-sale/nooitgedacht-village/stellenbosch/western-cape/14758/117562641')), '117562641');
  assert.equal(extractListingId('private_property', new URL('https://www.privateproperty.co.za/for-sale/western-cape/boland/franschhoek/franschhoek/T5582432')), 'T5582432');
  assert.equal(extractListingId('rawson', new URL('https://rawson.co.za/property/for-sale/constantia/1358643')), '1358643');
  assert.equal(extractListingId('jawitz', new URL('https://m.jawitz.co.za/results/residential/for-sale/durbanville/clara-anna-fontein/house/3335363/')), '3335363');
  assert.equal(extractListingId('century21', new URL('https://www.century21.co.za/results/residential/for-sale/bettys-bay/bettys-bay/vacant-land/2797878/4-lakeside-drive/')), '2797878');
  assert.equal(extractListingId('seeff', new URL('https://www.seeff.com/results/residential/for-sale/cape-town/green-point/house/3399375/12-high-level-road/')), '3399375');
  assert.equal(extractListingId('remax', new URL('https://www.remax.co.za/property-for-sale-south-africa/western-cape/stellenbosch/stellenbosch-farms/5-bedroom-farm-for-sale-in-stellenbosch-farms-69925995')), '69925995');
  assert.equal(extractListingId('harcourts', new URL('https://www.harcourts.co.za/results/residential/for-sale/cape-town/camps-bay/house/3425930/62-geneva-drive/')), '3425930');
});

test('rejects unsupported and private destinations before extraction', async () => {
  const unsupported = validatePropertyInput('https://example.com/property/123');
  assert.equal(unsupported.ok, false);
  assert.equal(unsupported.errorCode, 'UNSUPPORTED_URL');

  const local = validatePropertyInput('http://127.0.0.1:3000/property');
  assert.equal(local.ok, false);
  assert.equal(local.errorCode, 'INVALID_URL');

  const secure = await runSecureExtraction('https://example.com/property/123');
  assert.notEqual(secure.status, 'extracted');
  assert.equal(secure.metadata, undefined);
});

test('rejects credential-bearing URLs', async () => {
  const result = validatePropertyInput('https://user:password@www.property24.com/for-sale/a/b/c/1/123456');
  assert.equal(result.ok, false);
  assert.equal(result.errorCode, 'INVALID_URL');

  const secure = await runSecureExtraction('https://user:password@www.property24.com/for-sale/a/b/c/1/123456');
  assert.notEqual(secure.status, 'extracted');
});

test('does not treat search pages as property listings by URL identity', async () => {
  const result = await runSecureExtraction('https://www.pamgolding.co.za/property-search/farms-for-sale');
  assert.notEqual(result.status, 'extracted');
  if (result.metadata) {
    assert.equal(result.metadata.pageType, 'property_search');
    assert.equal(result.metadata.reportEligible, false);
  }
});
