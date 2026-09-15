import type { Coordinates } from '../types';
import { providerFetch } from './secure-http';
import type { GeocodingResult, GeospatialProvider, NearbyPlace, PoiCategory, ProviderSource } from './provider-types';

interface GeocodePayload {
  latitude?: number;
  longitude?: number;
  displayName?: string;
  confidence?: number;
}

interface NearbyPayload {
  places?: Array<{
    id?: string;
    name?: string;
    category?: unknown;
    latitude?: number;
    longitude?: number;
    distanceKm?: number;
  }>;
}

const POI_CATEGORIES: readonly PoiCategory[] = [
  'hospital',
  'police',
  'shopping_centre',
  'pharmacy',
  'university',
  'international_school',
  'informal_settlement',
];

function isPoiCategory(value: unknown): value is PoiCategory {
  return typeof value === 'string' && POI_CATEGORIES.includes(value as PoiCategory);
}

function validCoordinate(latitude: number, longitude: number): boolean {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
}

export class ConfiguredGeospatialProvider implements GeospatialProvider {
  readonly name = 'configured-geospatial';
  private readonly baseUrl: string;
  private readonly host: string;
  private readonly userAgent: string;

  constructor(baseUrl: string, userAgent = 'EiXPropScore/2.0 (+https://eix-property-score-beta.vercel.app/)') {
    const url = new URL(baseUrl);
    this.baseUrl = url.origin;
    this.host = url.hostname;
    this.userAgent = userAgent;
  }

  private source(url: string): ProviderSource {
    return {
      provider: this.name,
      sourceUrl: url,
      retrievedAt: new Date().toISOString(),
      license: null,
    };
  }

  async geocode(address: string): Promise<GeocodingResult | null> {
    const url = new URL('/geocode', this.baseUrl);
    url.searchParams.set('q', address.trim());
    const payload = await providerFetch<GeocodePayload>(url.toString(), {
      allowedHosts: [this.host],
      userAgent: this.userAgent,
      maxBytes: 256 * 1024,
      parse: async (response) => response.json() as Promise<GeocodePayload>,
    });
    if (!validCoordinate(Number(payload.latitude), Number(payload.longitude))) return null;
    return {
      coordinates: { latitude: Number(payload.latitude), longitude: Number(payload.longitude) },
      displayName: payload.displayName ?? address,
      confidence: Math.max(0, Math.min(100, Math.round(payload.confidence ?? 0))),
      source: this.source(url.toString()),
    };
  }

  async nearby(coordinates: Coordinates, categories: readonly PoiCategory[], radiusKm: number, limit = 25): Promise<NearbyPlace[]> {
    const url = new URL('/nearby', this.baseUrl);
    url.searchParams.set('lat', String(coordinates.latitude));
    url.searchParams.set('lon', String(coordinates.longitude));
    url.searchParams.set('radiusKm', String(radiusKm));
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('categories', categories.join(','));

    const payload = await providerFetch<NearbyPayload>(url.toString(), {
      allowedHosts: [this.host],
      userAgent: this.userAgent,
      maxBytes: 512 * 1024,
      parse: async (response) => response.json() as Promise<NearbyPayload>,
    });

    return (payload.places ?? []).slice(0, limit).flatMap((place, index) => {
      const latitude = Number(place.latitude);
      const longitude = Number(place.longitude);
      const distanceKm = Number(place.distanceKm);
      if (!place.id || !place.name || !isPoiCategory(place.category) || !validCoordinate(latitude, longitude) || !Number.isFinite(distanceKm) || distanceKm < 0 || distanceKm > radiusKm) return [];
      return [{
        id: place.id,
        name: place.name,
        category: place.category,
        coordinates: { latitude, longitude },
        distanceKm,
        source: this.source(`${url.toString()}#${index}`),
      }];
    });
  }
}
