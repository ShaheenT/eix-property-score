import test from 'node:test';
import assert from 'node:assert/strict';
import { mapProviderInputs } from '@/lib/intelligence/property-intelligence';
import { ConfiguredGeospatialProvider } from '@/lib/intelligence/providers/configured-geospatial-provider';
import { ProviderHttpError, providerFetch } from '@/lib/intelligence/providers/secure-http';

const originalFetch = globalThis.fetch;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('provider HTTP boundary rejects non-HTTPS URLs', async () => {
  await assert.rejects(
    () => providerFetch('http://provider.example/geocode', {
      allowedHosts: ['provider.example'],
      userAgent: 'EiXPropScore-test',
      parse: async (response) => response.json(),
    }),
    (error: unknown) => error instanceof ProviderHttpError && error.code === 'BLOCKED_HOST',
  );
});

test('provider HTTP boundary rejects non-allowlisted hosts', async () => {
  await assert.rejects(
    () => providerFetch('https://evil.example/geocode', {
      allowedHosts: ['provider.example'],
      userAgent: 'EiXPropScore-test',
      parse: async (response) => response.json(),
    }),
    (error: unknown) => error instanceof ProviderHttpError && error.code === 'BLOCKED_HOST',
  );
});

test('provider HTTP boundary rejects private and loopback destinations', async () => {
  for (const url of [
    'https://127.0.0.1/geocode',
    'https://10.0.0.1/geocode',
    'https://192.168.1.10/geocode',
    'https://169.254.169.254/geocode',
    'https://localhost/geocode',
  ]) {
    await assert.rejects(
      () => providerFetch(url, {
        allowedHosts: ['127.0.0.1', '10.0.0.1', '192.168.1.10', '169.254.169.254', 'localhost'],
        userAgent: 'EiXPropScore-test',
        parse: async (response) => response.json(),
      }),
      (error: unknown) => error instanceof ProviderHttpError && error.code === 'BLOCKED_HOST',
    );
  }
});

test('configured provider validates geocoding coordinates and confidence bounds', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({
    latitude: -33.9249,
    longitude: 18.4241,
    displayName: 'Cape Town, South Africa',
    confidence: 120,
  }), { status: 200, headers: { 'content-type': 'application/json' } });

  const provider = new ConfiguredGeospatialProvider('https://provider.example');
  const result = await provider.geocode('Cape Town');

  assert.deepEqual(result?.coordinates, { latitude: -33.9249, longitude: 18.4241 });
  assert.equal(result?.confidence, 100);
  assert.equal(result?.source.provider, 'configured-geospatial');
});

test('configured provider discards malformed nearby records and enforces radius', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({
    places: [
      { id: 'h1', name: 'Hospital', category: 'hospital', latitude: -33.9, longitude: 18.4, distanceKm: 2 },
      { id: 'bad-category', name: 'Unknown', category: 'restaurant', latitude: -33.9, longitude: 18.4, distanceKm: 1 },
      { id: 'too-far', name: 'Far Hospital', category: 'hospital', latitude: -33.9, longitude: 18.4, distanceKm: 9 },
      { id: 'bad-coordinate', name: 'Bad', category: 'police', latitude: 999, longitude: 18.4, distanceKm: 1 },
    ],
  }), { status: 200, headers: { 'content-type': 'application/json' } });

  const provider = new ConfiguredGeospatialProvider('https://provider.example');
  const result = await provider.nearby(
    { latitude: -33.9, longitude: 18.4 },
    ['hospital', 'police'],
    5,
    10,
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'h1');
});

test('provider HTTP boundary enforces response byte limits', async () => {
  globalThis.fetch = async () => new Response('1234567890', {
    status: 200,
    headers: { 'content-type': 'application/json', 'content-length': '10' },
  });

  await assert.rejects(
    () => providerFetch('https://provider.example/geocode', {
      allowedHosts: ['provider.example'],
      userAgent: 'EiXPropScore-test',
      maxBytes: 5,
      parse: async (response) => response.text(),
    }),
    (error: unknown) => error instanceof ProviderHttpError && error.code === 'PAYLOAD_TOO_LARGE',
  );
});

test('provider POIs map into area, safety, services and relocation inputs', () => {
  const inputs = mapProviderInputs([
    { id: 'h', name: 'Hospital', category: 'hospital', coordinates: { latitude: -33.9, longitude: 18.4 }, distanceKm: 4, source: { provider: 'test', sourceUrl: null, retrievedAt: new Date().toISOString(), license: null } },
    { id: 'p', name: 'Police', category: 'police', coordinates: { latitude: -33.9, longitude: 18.4 }, distanceKm: 2, source: { provider: 'test', sourceUrl: null, retrievedAt: new Date().toISOString(), license: null } },
    { id: 's', name: 'Mall', category: 'shopping_centre', coordinates: { latitude: -33.9, longitude: 18.4 }, distanceKm: 1, source: { provider: 'test', sourceUrl: null, retrievedAt: new Date().toISOString(), license: null } },
    { id: 'u', name: 'University', category: 'university', coordinates: { latitude: -33.9, longitude: 18.4 }, distanceKm: 3, source: { provider: 'test', sourceUrl: null, retrievedAt: new Date().toISOString(), license: null } },
    { id: 'i', name: 'International School', category: 'international_school', coordinates: { latitude: -33.9, longitude: 18.4 }, distanceKm: 5, source: { provider: 'test', sourceUrl: null, retrievedAt: new Date().toISOString(), license: null } },
  ]);

  assert.equal(inputs.area?.hospitalDistanceKm, 4);
  assert.equal(inputs.safety?.policeDistanceKm, 2);
  assert.equal(inputs.services?.hospitals?.[0]?.name, 'Hospital');
  assert.equal(inputs.relocation?.nearestUniversity?.name, 'University');
  assert.equal(inputs.relocation?.internationalSchoolDistanceKm, 5);
});
