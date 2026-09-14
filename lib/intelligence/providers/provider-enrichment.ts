import type { PropertyFacts } from '@/lib/property-types';
import type { Coordinates, IntelligenceEvidence } from '../types';
import { evidence } from '../evidence';
import { getGeospatialProvider, getProviderRuntimeConfig } from './index';
import type { NearbyPlace } from './provider-types';
import { withProviderCache } from './provider-cache';

export interface ProviderEnrichment {
  coordinates: Coordinates | null;
  coordinateEvidence: IntelligenceEvidence[];
  nearby: NearbyPlace[];
}

function buildAddress(facts: PropertyFacts): string | null {
  const parts = [facts.address, facts.suburb, facts.city, facts.province, facts.postalCode]
    .map((part) => part?.trim())
    .filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

export async function enrichPropertyFromProviders(facts: PropertyFacts): Promise<ProviderEnrichment> {
  const provider = getGeospatialProvider();
  if (!provider) return { coordinates: null, coordinateEvidence: [], nearby: [] };

  const address = buildAddress(facts);
  if (!address) return { coordinates: null, coordinateEvidence: [], nearby: [] };
  const config = getProviderRuntimeConfig();

  try {
    const result = await withProviderCache(
      provider.name,
      'geocode',
      { address },
      config.cacheTtlSeconds,
      () => provider.geocode(address),
    );
    if (!result) return { coordinates: null, coordinateEvidence: [], nearby: [] };

    const coordinateEvidence = [evidence(
      'provider.coordinates',
      `Property coordinates resolved by ${result.source.provider}.`,
      'verified',
      result.source.provider,
      result.confidence,
      result.source.sourceUrl,
      'Coordinates are provider-derived and must not be treated as a survey boundary or exact cadastral position.',
    )];

    let nearby: NearbyPlace[] = [];
    if (config.geospatialProvider !== 'nominatim') {
      const categories = ['hospital', 'police', 'shopping_centre', 'pharmacy', 'university', 'international_school', 'informal_settlement'] as const;
      nearby = await withProviderCache(
        provider.name,
        'nearby',
        { coordinates: result.coordinates, categories, radiusKm: Math.min(config.maxRadiusKm, 25), limit: config.maxResults },
        config.cacheTtlSeconds,
        () => provider.nearby(result.coordinates, categories, Math.min(config.maxRadiusKm, 25), config.maxResults),
      );
    }

    return { coordinates: result.coordinates, coordinateEvidence, nearby };
  } catch {
    return { coordinates: null, coordinateEvidence: [], nearby: [] };
  }
}
