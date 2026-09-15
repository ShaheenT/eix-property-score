import type { Coordinates } from '../types';
import { providerFetch } from './secure-http';
import type { GeocodingResult, GeospatialProvider, NearbyPlace, PoiCategory } from './provider-types';

const DEFAULT_HOST = 'nominatim.openstreetmap.org';
const USER_AGENT = 'EiXPropScore/2.0 (+https://eix-property-score-beta.vercel.app/)';

interface NominatimResult {
  lat?: string;
  lon?: string;
  display_name?: string;
  importance?: number;
}

/**
 * Opt-in development geocoder. Production must use a contracted provider or
 * self-hosted OSM-derived service configured through EIX_GEOCODING_BASE_URL.
 */
export class NominatimGeospatialProvider implements GeospatialProvider {
  readonly name = 'nominatim';
  private readonly baseUrl: string;
  private readonly host: string;

  constructor(baseUrl = process.env.EIX_GEOCODING_BASE_URL ?? `https://${DEFAULT_HOST}`) {
    const url = new URL(baseUrl);
    this.baseUrl = url.origin;
    this.host = url.hostname;
  }

  async geocode(address: string): Promise<GeocodingResult | null> {
    const query = address.trim();
    if (!query) return null;

    const url = new URL('/search', this.baseUrl);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'za');
    url.searchParams.set('q', query);

    const results = await providerFetch<NominatimResult[]>(url.toString(), {
      allowedHosts: [this.host],
      userAgent: USER_AGENT,
      parse: async (response) => response.json() as Promise<NominatimResult[]>,
    });

    const first = results[0];
    const latitude = Number(first?.lat);
    const longitude = Number(first?.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;

    const coordinates: Coordinates = { latitude, longitude };
    return {
      coordinates,
      displayName: first.display_name ?? query,
      confidence: Math.max(0, Math.min(100, Math.round((first.importance ?? 0.5) * 100))),
      source: {
        provider: this.name,
        sourceUrl: url.toString(),
        retrievedAt: new Date().toISOString(),
        license: 'OpenStreetMap data / ODbL; attribution required',
      },
    };
  }

  async nearby(_coordinates: Coordinates, _categories: readonly PoiCategory[], _radiusKm: number, _limit = 10): Promise<NearbyPlace[]> {
    // Nominatim is intentionally not used for POI enumeration. A dedicated
    // POI provider (or self-hosted OSM-derived dataset) must be configured.
    return [];
  }
}
