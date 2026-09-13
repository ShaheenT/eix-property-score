import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeProperty, detectSource, parseListingHtml } from '../lib/eix-engine';

test('detects supported listing sources', () => {
  assert.equal(detectSource('https://www.property24.com/for-sale/example'), 'property24');
  assert.equal(detectSource('https://www.privateproperty.co.za/example'), 'private_property');
  assert.equal(detectSource('https://example-estate.co.za/property/1'), 'agent_website');
});

test('extracts core facts from generic listing HTML', () => {
  const html = '<html><head><title>Modern Home</title><meta name="description" content="Beautiful home"></head><body><h1>Modern Home</h1><p>R 4,350,000</p><p>4 bedrooms 3 bathrooms</p><p>320 m² floor</p><p>800 m² erf</p></body></html>';
  const property = parseListingHtml(html, 'https://example.com/property/1');
  assert.equal(property.price, 4350000);
  assert.equal(property.bedrooms, 4);
  assert.equal(property.bathrooms, 3);
  assert.equal(property.floorAreaM2, 320);
  assert.equal(property.erfAreaM2, 800);
  assert.equal(property.sourceType, 'generic_url');
});

test('decision engine is deterministic and exposes confidence', () => {
  const analysis = analyzeProperty({ sourceType: 'manual', price: 5200000, bedrooms: 4, bathrooms: 3, address: '12 Example Street, Cape Town', features: [], evidence: [] });
  assert.ok(analysis.score >= 0 && analysis.score <= 100);
  assert.ok(analysis.confidence >= 0 && analysis.confidence <= 100);
  assert.ok(['BUY', 'NEGOTIATE', 'INVESTIGATE', 'AVOID'].includes(analysis.verdict));
  assert.equal(analysis.identity.fingerprint.startsWith('eix_'), true);
});
