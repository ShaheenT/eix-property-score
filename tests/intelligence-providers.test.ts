import test from 'node:test';
import assert from 'node:assert/strict';
import { providerFetch, ProviderHttpError } from '@/lib/intelligence/providers/secure-http';
import { getProviderRuntimeConfig } from '@/lib/intelligence/providers';

test('provider HTTP boundary rejects non-HTTPS URLs', async () => {
  await assert.rejects(
    providerFetch('http://example.com/data', {
      allowedHosts: ['example.com'],
      userAgent: 'EiXPropScore/test',
      parse: async (response) => response.json(),
    }),
    (error: unknown) => error instanceof ProviderHttpError && error.code === 'BLOCKED_HOST',
  );
});

test('provider HTTP boundary rejects hosts outside the allowlist', async () => {
  await assert.rejects(
    providerFetch('https://evil.example/data', {
      allowedHosts: ['trusted.example'],
      userAgent: 'EiXPropScore/test',
      parse: async (response) => response.json(),
    }),
    (error: unknown) => error instanceof ProviderHttpError && error.code === 'BLOCKED_HOST',
  );
});

test('provider runtime bounds configuration', () => {
  const previousRadius = process.env.EIX_PROVIDER_MAX_RADIUS_KM;
  const previousResults = process.env.EIX_PROVIDER_MAX_RESULTS;
  process.env.EIX_PROVIDER_MAX_RADIUS_KM = '9999';
  process.env.EIX_PROVIDER_MAX_RESULTS = '9999';
  try {
    const config = getProviderRuntimeConfig();
    assert.equal(config.maxRadiusKm, 50);
    assert.equal(config.maxResults, 100);
  } finally {
    if (previousRadius === undefined) delete process.env.EIX_PROVIDER_MAX_RADIUS_KM;
    else process.env.EIX_PROVIDER_MAX_RADIUS_KM = previousRadius;
    if (previousResults === undefined) delete process.env.EIX_PROVIDER_MAX_RESULTS;
    else process.env.EIX_PROVIDER_MAX_RESULTS = previousResults;
  }
});
