import type { Coordinates, IntelligenceEvidence } from '../types';

export interface NearbyPlace {
  name: string;
  category: 'hospital' | 'police' | 'shopping' | 'pharmacy' | 'university' | 'international_school';
  coordinates: Coordinates;
  distanceKm: number;
  sourceUrl?: string | null;
}

export interface GeospatialProviderResult {
  places: NearbyPlace[];
  evidence: IntelligenceEvidence[];
}

export interface GeospatialProvider {
  readonly name: string;
  readonly version: string;
  findNearby(input: {
    coordinates: Coordinates;
    radiusKm: number;
    categories: NearbyPlace['category'][];
  }): Promise<GeospatialProviderResult>;
}

export interface MunicipalProviderResult {
  zoning?: string | null;
  buildingPlans?: 'approved' | 'not_verified' | 'unknown';
  municipalApproval?: 'verified' | 'not_verified' | 'unknown';
  developmentRights?: string[] | null;
  evidence: IntelligenceEvidence[];
}

export interface MunicipalProvider {
  readonly name: string;
  readonly municipality: string;
  readonly version: string;
  supports(address: { city?: string | null; province?: string | null }): boolean;
  lookup(address: { address?: string | null; suburb?: string | null; city?: string | null; province?: string | null }): Promise<MunicipalProviderResult>;
}
