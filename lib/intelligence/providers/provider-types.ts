import type { Coordinates } from '../types';

export type PoiCategory = 'hospital' | 'police' | 'shopping_centre' | 'pharmacy' | 'university' | 'international_school' | 'informal_settlement';

export interface ProviderSource {
  provider: string;
  sourceUrl: string | null;
  retrievedAt: string;
  license: string | null;
}

export interface GeocodingResult {
  coordinates: Coordinates;
  displayName: string;
  confidence: number;
  source: ProviderSource;
}

export interface NearbyPlace {
  id: string;
  name: string;
  category: PoiCategory;
  coordinates: Coordinates;
  distanceKm: number;
  source: ProviderSource;
}

export interface GeospatialProvider {
  readonly name: string;
  geocode(address: string): Promise<GeocodingResult | null>;
  nearby(coordinates: Coordinates, categories: readonly PoiCategory[], radiusKm: number, limit?: number): Promise<NearbyPlace[]>;
}

export interface ProviderRegistry {
  geospatial: GeospatialProvider;
}

export interface ProviderRuntimeConfig {
  geospatialProvider: string;
  cacheTtlSeconds: number;
  maxRadiusKm: number;
  maxResults: number;
}
