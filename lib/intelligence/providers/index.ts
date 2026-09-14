import type { GeospatialProvider, ProviderRegistry, ProviderRuntimeConfig } from './provider-types';
import { NominatimGeospatialProvider } from './nominatim-provider';
import { ConfiguredGeospatialProvider } from './configured-geospatial-provider';

export * from './provider-types';
export * from './secure-http';
export * from './nominatim-provider';
export * from './configured-geospatial-provider';
export * from './provider-enrichment';

function runtimeConfig(): ProviderRuntimeConfig {
  const cacheTtlSeconds = Number(process.env.EIX_PROVIDER_CACHE_TTL_SECONDS ?? 86400);
  const maxRadiusKm = Number(process.env.EIX_PROVIDER_MAX_RADIUS_KM ?? 25);
  const maxResults = Number(process.env.EIX_PROVIDER_MAX_RESULTS ?? 25);

  return {
    geospatialProvider: process.env.EIX_GEOSPATIAL_PROVIDER ?? 'none',
    cacheTtlSeconds: Number.isFinite(cacheTtlSeconds) ? Math.max(60, Math.min(cacheTtlSeconds, 7 * 86400)) : 86400,
    maxRadiusKm: Number.isFinite(maxRadiusKm) ? Math.max(1, Math.min(maxRadiusKm, 50)) : 25,
    maxResults: Number.isFinite(maxResults) ? Math.max(1, Math.min(maxResults, 100)) : 25,
  };
}

export function getProviderRegistry(): ProviderRegistry | null {
  const config = runtimeConfig();
  if (config.geospatialProvider === 'configured') {
    const baseUrl = process.env.EIX_GEOPROVIDER_BASE_URL?.trim();
    if (!baseUrl) return null;
    return { geospatial: new ConfiguredGeospatialProvider(baseUrl) };
  }
  if (config.geospatialProvider === 'nominatim') {
    return { geospatial: new NominatimGeospatialProvider() };
  }
  return null;
}

export function getGeospatialProvider(): GeospatialProvider | null {
  return getProviderRegistry()?.geospatial ?? null;
}

export function getProviderRuntimeConfig(): ProviderRuntimeConfig {
  return runtimeConfig();
}
