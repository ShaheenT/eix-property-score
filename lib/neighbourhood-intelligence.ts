import type { PropertyFacts } from '@/lib/property-types';

export interface NeighbourhoodPlace {
  name: string;
  category: string;
  distanceKm: number;
  sourceUrl: string;
}

export interface NeighbourhoodIntelligence {
  location: {
    label: string | null;
    areaLabel: string | null;
    city: string | null;
    province: string | null;
    latitude: number | null;
    longitude: number | null;
    verified: boolean;
    source: 'address' | 'listing_title' | 'property_fields' | 'none';
    sourceUrl: string | null;
  };
  transport: NeighbourhoodPlace[];
  schoolsHealthcare: NeighbourhoodPlace[];
  lifestyleRetail: NeighbourhoodPlace[];
  safetyIndicators: NeighbourhoodPlace[];
  parksRecreation: NeighbourhoodPlace[];
}

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const OVERPASS = 'https://overpass-api.de/api/interpreter';
const OSM = 'https://www.openstreetmap.org';

function clean(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function titleLocation(title: string | null): string | null {
  const value = clean(title);
  if (!value) return null;

  const match = value.match(/\bfor\s+sale\s+in\s+(.+)$/i);
  if (!match?.[1]) return null;

  const location = match[1]
    .replace(/\s*[|,].*$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  return location || null;
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchJson<T>(url: string, init: RequestInit & { next?: { revalidate: number } } = {}): Promise<T | null> {
  try {
    const response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(7000),
      headers: {
        Accept: 'application/json',
        'User-Agent': 'EiX-Property-Score/1.0 (property-intelligence)',
        ...(init.headers || {}),
      },
      next: { revalidate: 86400 },
    });
    if (!response.ok) return null;
    return await response.json() as T;
  } catch {
    return null;
  }
}

interface NominatimAddress {
  suburb?: string;
  neighbourhood?: string;
  city?: string;
  town?: string;
  municipality?: string;
  state?: string;
  county?: string;
}

interface NominatimItem {
  lat: string;
  lon: string;
  display_name: string;
  osm_id?: number;
  osm_type?: string;
  type?: string;
  address?: NominatimAddress;
}

function locationFromFields(facts: PropertyFacts, fallbackArea: string | null): {
  areaLabel: string | null;
  city: string | null;
  province: string | null;
} {
  return {
    areaLabel: clean(facts.suburb) || fallbackArea || clean(facts.city),
    city: clean(facts.city),
    province: clean(facts.province),
  };
}

async function geocode(facts: PropertyFacts): Promise<NeighbourhoodIntelligence['location']> {
  const derivedArea = titleLocation(facts.title);
  const fieldLocation = locationFromFields(facts, derivedArea);
  const exactAddress = clean(facts.address);

  const query = exactAddress
    ? [exactAddress, facts.suburb, facts.city, facts.province, 'South Africa']
    : [fieldLocation.areaLabel, facts.city, facts.province, 'South Africa'];

  const queryText = query.map(clean).filter(Boolean).join(', ');
  if (!queryText) {
    return {
      label: null,
      areaLabel: null,
      city: null,
      province: null,
      latitude: null,
      longitude: null,
      verified: false,
      source: 'none',
      sourceUrl: null,
    };
  }

  const url = `${NOMINATIM}?format=jsonv2&limit=1&addressdetails=1&countrycodes=za&q=${encodeURIComponent(queryText)}`;
  const result = await fetchJson<NominatimItem[]>(url);
  const item = result?.[0];

  if (!item) {
    return {
      label: fieldLocation.areaLabel,
      areaLabel: fieldLocation.areaLabel,
      city: fieldLocation.city,
      province: fieldLocation.province,
      latitude: null,
      longitude: null,
      verified: false,
      source: exactAddress ? 'address' : (derivedArea ? 'listing_title' : 'property_fields'),
      sourceUrl: null,
    };
  }

  const lat = Number(item.lat);
  const lon = Number(item.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return {
      label: fieldLocation.areaLabel,
      areaLabel: fieldLocation.areaLabel,
      city: fieldLocation.city,
      province: fieldLocation.province,
      latitude: null,
      longitude: null,
      verified: false,
      source: exactAddress ? 'address' : (derivedArea ? 'listing_title' : 'property_fields'),
      sourceUrl: null,
    };
  }

  const address = item.address || {};
  const areaLabel = clean(address.suburb) || clean(address.neighbourhood) || fieldLocation.areaLabel;
  const city = clean(address.city) || clean(address.town) || clean(address.municipality) || fieldLocation.city;
  const province = clean(address.state) || fieldLocation.province;
  const source = exactAddress ? 'address' : (derivedArea ? 'listing_title' : 'property_fields');
  const sourceUrl = item.osm_type && item.osm_id
    ? `${OSM}/${item.osm_type}/${item.osm_id}`
    : `${OSM}/#map=15/${lat}/${lon}`;

  return {
    label: areaLabel || fieldLocation.areaLabel || item.display_name || null,
    areaLabel: areaLabel || fieldLocation.areaLabel || null,
    city,
    province,
    latitude: lat,
    longitude: lon,
    // A suburb centroid/geocode is location context, not verification of the exact property address.
    verified: source === 'address',
    source,
    sourceUrl,
  };
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function placeFromElement(element: OverpassElement, lat: number, lon: number): NeighbourhoodPlace | null {
  const pLat = element.lat ?? element.center?.lat;
  const pLon = element.lon ?? element.center?.lon;
  if (pLat == null || pLon == null) return null;
  const name = clean(element.tags?.name);
  if (!name) return null;
  return {
    name,
    category: element.tags?.amenity || element.tags?.shop || element.tags?.leisure || element.tags?.public_transport || 'place',
    distanceKm: Math.round(distanceKm(lat, lon, pLat, pLon) * 10) / 10,
    sourceUrl: `${OSM}/${element.type}/${element.id}`,
  };
}

function dedupe(items: NeighbourhoodPlace[], limit = 6): NeighbourhoodPlace[] {
  const seen = new Set<string>();
  return items
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .filter((item) => {
      const key = item.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

export async function getNeighbourhoodIntelligence(facts: PropertyFacts): Promise<NeighbourhoodIntelligence> {
  const location = await geocode(facts);
  const empty = {
    transport: [],
    schoolsHealthcare: [],
    lifestyleRetail: [],
    safetyIndicators: [],
    parksRecreation: [],
  };

  // We can use a geocoded listing area for neighbourhood context even when
  // the exact street address is not verified.
  if (location.latitude == null || location.longitude == null) {
    return { location, ...empty };
  }

  const lat = location.latitude;
  const lon = location.longitude;
  const q = `[out:json][timeout:6];
(
  nwr(around:3500,${lat},${lon})[public_transport];
  nwr(around:3500,${lat},${lon})[railway=station];
  nwr(around:3500,${lat},${lon})[amenity=school];
  nwr(around:3500,${lat},${lon})[amenity=hospital];
  nwr(around:3500,${lat},${lon})[amenity=clinic];
  nwr(around:3500,${lat},${lon})[amenity=pharmacy];
  nwr(around:3500,${lat},${lon})[shop=supermarket];
  nwr(around:3500,${lat},${lon})[shop=mall];
  nwr(around:3500,${lat},${lon})[amenity=restaurant];
  nwr(around:3500,${lat},${lon})[amenity=cafe];
  nwr(around:3500,${lat},${lon})[leisure=park];
  nwr(around:3500,${lat},${lon})[leisure=pitch];
  nwr(around:3500,${lat},${lon})[amenity=police];
);
out center tags; `;

  const result = await fetchJson<{ elements?: OverpassElement[] }>(`${OVERPASS}?data=${encodeURIComponent(q)}`);
  const elements = result?.elements || [];

  const transport: NeighbourhoodPlace[] = [];
  const schoolsHealthcare: NeighbourhoodPlace[] = [];
  const lifestyleRetail: NeighbourhoodPlace[] = [];
  const safetyIndicators: NeighbourhoodPlace[] = [];
  const parksRecreation: NeighbourhoodPlace[] = [];

  for (const element of elements) {
    const tags = element.tags || {};
    const place = placeFromElement(element, lat, lon);
    if (!place) continue;

    if (tags.public_transport || tags.railway === 'station') transport.push(place);
    else if (tags.amenity === 'school' || tags.amenity === 'hospital' || tags.amenity === 'clinic' || tags.amenity === 'pharmacy') schoolsHealthcare.push(place);
    else if (tags.shop === 'supermarket' || tags.shop === 'mall' || tags.amenity === 'restaurant' || tags.amenity === 'cafe') lifestyleRetail.push(place);
    else if (tags.leisure === 'park' || tags.leisure === 'pitch') parksRecreation.push(place);
    else if (tags.amenity === 'police') safetyIndicators.push(place);
  }

  return {
    location,
    transport: dedupe(transport),
    schoolsHealthcare: dedupe(schoolsHealthcare),
    lifestyleRetail: dedupe(lifestyleRetail),
    safetyIndicators: dedupe(safetyIndicators),
    parksRecreation: dedupe(parksRecreation),
  };
}

export function neighbourhoodSummary(items: NeighbourhoodPlace[], empty = 'No supporting evidence found'): string {
  if (!items.length) return empty;
  return items.slice(0, 3).map((item) => `${item.name} · ${item.distanceKm.toFixed(1)} km`).join(' · ');
}
