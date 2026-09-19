import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
  assert.match(result.errors[0] ?? '', /do not currently support/i);
});

test('rejects localhost before fetching', async () => {
  const result = await extractPropertyFromUrl('http://localhost:3000/property');

  assert.equal(result.status, 'unsupported_source');
  assert.match(result.errors[0] ?? '', /valid|supported/i);
});

test('rejects loopback IP before fetching', async () => {
  const result = await extractPropertyFromUrl('http://127.0.0.1/property');
  assert.equal(result.status, 'unsupported_source');
});

test('rejects private network IP before fetching', async () => {
  const result = await extractPropertyFromUrl('http://192.168.1.10/property');
  assert.equal(result.status, 'unsupported_source');
});

test('rejects malformed property URLs', async () => {
  const result = await extractPropertyFromUrl('https://property24.com/[broken');
  assert.equal(result.status, 'unsupported_source');
});

test('rejects unsupported source domains without network access', async () => {
  const result = await extractPropertyFromUrl('https://malicious-example.test/property');
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

test('extracts complete property facts from JSON-LD', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('<html><head><script type="application/ld+json">{"@context":"https://schema.org","@type":"SingleFamilyResidence","name":"Luxury Cape Town Home","address":{"@type":"PostalAddress","streetAddress":"12 Main Road","addressLocality":"Observatory","addressRegion":"Western Cape","postalCode":"7925"},"offers":{"@type":"Offer","price":"R2,495,000","priceCurrency":"ZAR"},"numberOfBedrooms":3,"numberOfBathrooms":2,"floorSize":{"@type":"QuantitativeValue","value":145},"lotSize":{"@type":"QuantitativeValue","value":320},"propertyType":"House"}</script></head><body></body></html>', {status:200,headers:{'content-type':'text/html; charset=utf-8'}});
  try {
    const result = await extractPropertyFromUrl('https://www.property24.com/for-sale/cape-town/western-cape/12345');
    assert.equal(result.status,'extracted');
    assert.equal(result.source,'property24');
    assert.equal(result.facts.title,'Luxury Cape Town Home');
    assert.equal(result.facts.address,'12 Main Road');
    assert.equal(result.facts.suburb,'Observatory');
    assert.equal(result.facts.province,'Western Cape');
    assert.equal(result.facts.postalCode,'7925');
    assert.equal(result.facts.askingPriceCents,249500000);
    assert.equal(result.facts.bedrooms,3);
    assert.equal(result.facts.bathrooms,2);
    assert.equal(result.facts.floorSizeM2,145);
    assert.equal(result.facts.landSizeM2,320);
    assert.equal(result.facts.propertyType,'House');
    assert.ok(result.evidence.some(item => item.field === 'askingPriceCents' && item.source === 'json_ld'));
  } finally { globalThis.fetch = originalFetch; }
});

test('does not invent missing commercial facts from OpenGraph metadata', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('<html><head><meta property="og:title" content="3 Bedroom Apartment in Sea Point"><meta property="og:street-address" content="45 Main Road, Sea Point"></head><body></body></html>', {status:200,headers:{'content-type':'text/html; charset=utf-8'}});
  try {
    const result = await extractPropertyFromUrl('https://www.property24.com/for-sale/cape-town/western-cape/12345');
    assert.equal(result.status,'insufficient_data');
    assert.equal(result.facts.title,'3 Bedroom Apartment in Sea Point');
    assert.equal(result.facts.address,'45 Main Road, Sea Point');
    assert.equal(result.facts.askingPriceCents,null);
    assert.equal(result.facts.bedrooms,null);
  } finally { globalThis.fetch = originalFetch; }
});

test('does not treat a generic page title as a property', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('<html><head><title>Property24 - Buy and Sell Property</title></head><body></body></html>', {status:200,headers:{'content-type':'text/html; charset=utf-8'}});
  try {
    const result = await extractPropertyFromUrl('https://www.property24.com/for-sale/cape-town/western-cape/12345');
    assert.equal(result.status,'insufficient_data');
    assert.equal(result.facts.title,'Property24 - Buy and Sell Property');
    assert.equal(result.facts.askingPriceCents,null);
    assert.equal(result.facts.bedrooms,null);
    assert.equal(result.evidence.length,1);
  } finally { globalThis.fetch = originalFetch; }
});

test('ignores unrelated JSON-LD entities', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('<html><head><script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Example Realty","url":"https://www.property24.com"}</script></head><body></body></html>', {status:200,headers:{'content-type':'text/html; charset=utf-8'}});
  try {
    const result = await extractPropertyFromUrl('https://www.property24.com/for-sale/cape-town/western-cape/12345');
    assert.equal(result.status,'insufficient_data');
    assert.equal(result.facts.title,null);
    assert.equal(result.facts.address,null);
    assert.equal(result.facts.askingPriceCents,null);
    assert.equal(result.evidence.length,0);
  } finally { globalThis.fetch = originalFetch; }
});

test('rejects non-HTML responses', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('{}', {status:200,headers:{'content-type':'application/json'}});
  try {
    const result = await extractPropertyFromUrl('https://www.property24.com/for-sale/cape-town/western-cape/12345');
    assert.equal(result.status,'extraction_failed');
    assert.match(result.errors[0] ?? '',/content type/i);
  } finally { globalThis.fetch = originalFetch; }
});

test('returns structured failure for HTTP 404', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('Not found', {status:404,headers:{'content-type':'text/html'}});
  try {
    const result = await extractPropertyFromUrl('https://www.property24.com/for-sale/cape-town/western-cape/12345');
    assert.equal(result.status,'extraction_failed');
    assert.match(result.errors[0] ?? '',/HTTP 404/i);
  } finally { globalThis.fetch = originalFetch; }
});

test('does not follow redirects without revalidation', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('', {status:302,headers:{'location':'https://www.property24.com/redirected-property'}});
  try {
    const result = await extractPropertyFromUrl('https://www.property24.com/for-sale/cape-town/western-cape/12345');
    assert.equal(result.status,'extraction_failed');
    assert.match(result.errors[0] ?? '',/Redirect destination requires additional validation/i);
  } finally { globalThis.fetch = originalFetch; }
});

test('keeps direct addresses unverified without trusted property or geospatial data', async () => {
  const result = await extractPropertyFromUrl('12 Main Road, Observatory, Cape Town');
  assert.equal(result.status,'unsupported_source');
  assert.equal(result.source,'address_only');
  assert.match(result.errors[0] ?? '',/trusted property or geospatial data source/i);
});

test('extracts only listing-scoped Property24 facts for listing 117227369', async () => {
  const originalFetch = globalThis.fetch;
  const html = `
    <html><head>
      <script type="application/ld+json">
        {"@context":"https://schema.org","@type":"RealEstateListing","name":"Steenberg Golf Estate Home","address":{"@type":"PostalAddress","streetAddress":"Steenberg Golf Estate","addressLocality":"Steenberg Golf Estate","addressRegion":"Western Cape"},"offers":{"@type":"Offer","price":30000000,"priceCurrency":"ZAR"},"numberOfBedrooms":3,"numberOfBathrooms":2,"floorSize":{"@type":"QuantitativeValue","value":307},"lotSize":{"@type":"QuantitativeValue","value":709},"itemOffered":{"@type":"House"}}
      </script>
    </head><body>
      <div class="p24_listing p24_listingDetail" data-listingnumber="117227369"></div>
      <div class="p24_listingFeatures"><span class="p24_feature">Garages:</span><span class="p24_featureAmount">2</span></div>
      <div class="p24_listingFeatures"><span class="p24_feature">Parking:</span><span class="p24_featureAmount">2</span></div>
      <div class="p24_listingFeatures"><span class="p24_feature">Study</span></div>
      <div class="p24_listingFeatures"><span class="p24_feature">Pool</span></div>
      <div class="p24_listingFeatures"><span class="p24_feature">Garden</span></div>
      <div class="p24_listingFeatures"><span class="p24_feature">Fibre Internet</span></div>
      <div class="p24_listingFeatures"><span class="p24_feature">Solar Panels</span></div>
      <div class="p24_listingFeatures"><span class="p24_feature">Backup Battery / Inverter</span></div>
      <div class="row p24_propertyOverviewRow"><div class="col-6 p24_propertyOverviewKey">Levies</div><div class="col-6 p24_propertyOverviewResult"><div class="p24_info">R 13 880</div></div></div>
      <div class="row p24_propertyOverviewRow"><div class="col-6 p24_propertyOverviewKey">Rates and Taxes</div><div class="col-6 p24_propertyOverviewResult"><div class="p24_info">R 6 564</div></div></div>
      <div class="row p24_propertyOverviewRow"><div class="col-6 p24_propertyOverviewKey">Parking</div><div class="col-6 p24_propertyOverviewResult"><div class="p24_info">2</div></div></div>
      <div class="row p24_propertyOverviewRow"><div class="col-6 p24_propertyOverviewKey">Garden</div><div class="col-6 p24_propertyOverviewResult"><div class="p24_info">Yes</div></div></div>
      <div class="row p24_propertyOverviewRow"><div class="col-6 p24_propertyOverviewKey">Pool</div><div class="col-6 p24_propertyOverviewResult"><div class="p24_info">Yes</div></div></div>
      <div class="row p24_propertyOverviewRow"><div class="col-6 p24_propertyOverviewKey">Solar</div><div class="col-6 p24_propertyOverviewResult"><div class="p24_info">Solar Panels</div></div></div>
      <div class="row p24_propertyOverviewRow"><div class="col-6 p24_propertyOverviewKey">Backup Power</div><div class="col-6 p24_propertyOverviewResult"><div class="p24_info">Backup Battery / Inverter</div></div></div>
      <div class="row p24_propertyOverviewRow"><div class="col-6 p24_propertyOverviewKey">Internet Access</div><div class="col-6 p24_propertyOverviewResult"><div class="p24_info">Fibre</div></div></div>
    </body></html>`;
  globalThis.fetch = async () => new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
  try {
    const result = await extractPropertyFromUrl('https://www.property24.com/for-sale/steenberg-golf-estate/cape-town/western-cape/15183/117227369?plId=2595637&plt=2&plsIds=2603331');
    assert.equal(result.status, 'extracted');
    assert.equal(result.facts.askingPriceCents, 3_000_000_000);
    assert.equal(result.facts.propertyType, 'House');
    assert.equal(result.facts.bedrooms, 3);
    assert.equal(result.facts.bathrooms, 2);
    assert.equal(result.facts.floorSizeM2, 307);
    assert.equal(result.facts.landSizeM2, 709);
    assert.equal(result.facts.garages, 2);
    assert.equal(result.facts.parking, 2);
    assert.equal(result.facts.hasStudy, true);
    assert.equal(result.facts.hasPool, true);
    assert.equal(result.facts.hasGarden, true);
    assert.equal(result.facts.hasFibre, true);
    assert.equal(result.facts.hasSolar, true);
    assert.equal(result.facts.hasBatteryBackup, true);
    assert.equal(result.facts.leviesCents, 1_388_000);
    assert.equal(result.facts.ratesAndTaxesCents, 656_400);
    for (const field of ['garages','parking','hasStudy','hasPool','hasGarden','hasFibre','hasSolar','hasBatteryBackup','leviesCents','ratesAndTaxesCents'] as const) {
      assert.ok(result.evidence.some(item => item.field === field && item.source === 'html'), `missing evidence for ${field}`);
    }
  } finally { globalThis.fetch = originalFetch; }
});

test('extracts the complete verified Property24 listing 117227369 fixture', async () => {
  const originalFetch = globalThis.fetch;

  const html = readFileSync(
    new URL('../property24-117227369.html', import.meta.url),
    'utf8'
  );

  globalThis.fetch = async () =>
    new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
      },
    });

  try {
    const result = await extractPropertyFromUrl(
      'https://www.property24.com/for-sale/steenberg-golf-estate/cape-town/western-cape/15183/117227369'
    );

    assert.equal(result.status, 'extracted');
    assert.equal(result.source, 'property24');

    assert.equal(
      result.facts.title,
      '3 Bedroom House for sale in Steenberg Golf Estate'
    );
    assert.equal(result.facts.suburb, 'Steenberg Golf Estate');
    assert.equal(result.facts.city, 'Cape Town');
    assert.equal(result.facts.province, 'Western Cape');

    assert.equal(result.facts.askingPriceCents, 3_000_000_000);
    assert.equal(result.facts.bedrooms, 3);
    assert.equal(result.facts.bathrooms, 2);
    assert.equal(result.facts.propertyType, 'House');

    assert.equal(result.facts.floorSizeM2, 307);
    assert.equal(result.facts.landSizeM2, 709);

    assert.equal(result.facts.garages, 2);
    assert.equal(result.facts.parking, 2);
    assert.equal(result.facts.hasStudy, true);
    assert.equal(result.facts.hasPool, true);
    assert.equal(result.facts.hasGarden, true);
    assert.equal(result.facts.hasFibre, true);
    assert.equal(result.facts.hasSolar, true);
    assert.equal(result.facts.hasBatteryBackup, true);

    assert.equal(result.facts.leviesCents, 1_388_000);
    assert.equal(result.facts.ratesAndTaxesCents, 656_400);

    assert.ok(
      result.evidence.some(
        (item) =>
          item.field === 'askingPriceCents' &&
          item.source === 'json_ld'
      )
    );

    assert.ok(result.evidence.length >= 15);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('extracts the verified Property24 overview fields for listing 117638664', async () => {
  const originalFetch = globalThis.fetch;
  const html = '<html><head><title>2 Bedroom House for Sale in Observatory</title></head><body>' +
    '<div>Listing number: P24-117638664</div>' +
    '<div>R 3 550 000</div>' +
    '<div>2 Bedroom House for Sale in Observatory</div>' +
    '<div>2 Bathrooms</div>' +
    '<div>Features Bedrooms 2 Bathrooms 2 Parking 2 Pet Friendly Garden Fibre Internet</div>' +
    '<div>Property Overview</div>' +
    '<div>Type of Property House</div>' +
    '<div>Street Address 53 Lytton Street, Observatory</div>' +
    '<div>Listing Date 18 September 2026</div>' +
    '<div>Erf Size 208 m²</div>' +
    '<div>Floor Size 91 m²</div>' +
    '<div>Rates and Taxes R 1 180</div>' +
    '</body></html>';

  globalThis.fetch = async () =>
    new Response(html, {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });

  try {
    const result = await extractPropertyFromUrl(
      'https://www.property24.com/for-sale/observatory/cape-town/western-cape/10157/117638664',
    );

    assert.equal(result.status, 'extracted');
    assert.equal(result.source, 'property24');
    assert.equal(result.facts.address, '53 Lytton Street, Observatory');
    assert.equal(result.facts.floorSizeM2, 91);
    assert.equal(result.facts.landSizeM2, 208);
    assert.equal(result.facts.parking, 2);
    assert.equal(result.facts.ratesAndTaxesCents, 118_000);
    assert.ok(result.evidence.some((item) => item.field === 'address'));
    assert.ok(result.evidence.some((item) => item.field === 'floorSizeM2'));
    assert.ok(result.evidence.some((item) => item.field === 'landSizeM2'));
    assert.ok(result.evidence.some((item) => item.field === 'parking'));
    assert.ok(result.evidence.some((item) => item.field === 'ratesAndTaxesCents'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('does not apply Property24 feature markup when the listing identity does not match', async () => {
  const originalFetch = globalThis.fetch;
  const html = '<html><body><div class="p24_listing" data-listingnumber="999999999"></div><div class="p24_listingFeatures"><span class="p24_feature">Garages:</span><span class="p24_featureAmount">99</span></div></body></html>';
  globalThis.fetch = async () => new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
  try {
    const result = await extractPropertyFromUrl('https://www.property24.com/for-sale/steenberg-golf-estate/cape-town/western-cape/15183/117227369');
    assert.equal(result.facts.garages, null);
    assert.equal(result.facts.parking, null);
    assert.equal(result.status, 'insufficient_data');
  } finally { globalThis.fetch = originalFetch; }
});

test('rejects a Property24 1 m² land-size artefact', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(
    '<html><body>' +
      '<div class="p24_propertyOverviewRow">' +
        '<div class="p24_propertyOverviewKey">Erf Size</div>' +
        '<div class="p24_propertyOverviewResult"><div class="p24_info">1 m²</div></div>' +
      '</div>' +
    '</body></html>',
    { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } },
  );

  try {
    const result = await extractPropertyFromUrl(
      'https://www.property24.com/for-sale/cape-town/western-cape/12345',
    );

    assert.equal(result.facts.landSizeM2, null);
    assert.equal(
      result.evidence.some((item) => item.field === 'landSizeM2'),
      false,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('prefers Property24 listing summary bathrooms over unrelated Bond Calculator text', async () => {
  const originalFetch = globalThis.fetch;
  const html = `
    <html><body>
      <div class="p24_listing" data-listingnumber="384397043"></div>
      <div>
        3 Bedroom House for Sale in Observatory
        28 Falmouth Road, Observatory, Cape Town
        3 2 2 200 m²
        Bond Calculator Purchase Price R Interest Rate % Loan Term Years
        Bond Calculator ... 3 Bathrooms ...
      </div>
      <div>
        Charming 3-Bedroom Home.
        Floor m2: +-119m2 (incl. the front porch)
        Erf: 200m2
      </div>
      <div>Features Bedrooms: 3 Bathrooms: 2 Parking: 2 Pet Friendly Garden</div>
    </body></html>`;
  globalThis.fetch = async () =>
    new Response(html, {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });

  try {
    const result = await extractPropertyFromUrl(
      'https://www.property24.com/for-sale/observatory/cape-town/western-cape/10157/384397043',
    );
    assert.equal(result.status, 'extracted');
    assert.equal(result.facts.bedrooms, 3);
    assert.equal(result.facts.bathrooms, 2);
    assert.equal(result.facts.parking, 2);
    assert.equal(result.facts.floorSizeM2, 119);
    assert.equal(result.facts.landSizeM2, 200);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('extracts complete Private Property facts from T5586887 fixture', async () => {
  const originalFetch = globalThis.fetch;
  const fixture = readFileSync(
    new URL('./fixtures/private-property/T5586887.html', import.meta.url),
    'utf8'
  );

  globalThis.fetch = async () =>
    new Response(fixture, {
      status: 200,
      headers: { 'content-type': 'text/html' },
    });

  try {
    const result = await extractPropertyFromUrl(
      'https://www.privateproperty.co.za/for-sale/western-cape/cape-town/southern-suburbs/tokai/2-the-nest/16-weaver-bird-avenue/T5586887'
    );

    assert.equal(result.facts.askingPriceCents, 1050000000);
    assert.match(result.facts.title ?? '', /3 Bedroom House in Tokai/);
    assert.equal(result.facts.propertyType, 'House');
    assert.equal(result.facts.bedrooms, 3);
    assert.equal(result.facts.bathrooms, 3.5);
    assert.equal(result.facts.garages, 1);
    assert.equal(result.facts.landSizeM2, 365);
    assert.equal(result.facts.floorSizeM2, 365);
    assert.match(result.facts.address ?? '', /2 the nest, 16 weaver bird avenue/i);
    assert.equal(result.source, 'private_property');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
