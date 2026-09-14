export type IntelligenceEvidenceType = 'verified' | 'calculated' | 'proximity' | 'confirmation_required';

export type IntelligenceStatus = 'available' | 'partial' | 'unknown' | 'requires_confirmation';

export interface IntelligenceEvidence {
  id: string;
  claim: string;
  evidenceType: IntelligenceEvidenceType;
  source: string;
  sourceUrl?: string | null;
  confidence: number;
  retrievedAt: string;
  notes?: string | null;
}

export interface IntelligenceSignal<T = unknown> {
  key: string;
  label: string;
  value: T | null;
  status: IntelligenceStatus;
  confidence: number;
  evidence: IntelligenceEvidence[];
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface IntelligenceContext {
  propertyId?: string | null;
  coordinates?: Coordinates | null;
  address?: string | null;
  suburb?: string | null;
  city?: string | null;
  province?: string | null;
  propertyType?: string | null;
  landSizeM2?: number | null;
  askingPriceCents?: number | null;
  propertyEvidence?: IntelligenceEvidence[];
}

export interface AreaIntelligence {
  safetyScore: IntelligenceSignal<number>;
  policeDistanceKm: IntelligenceSignal<number>;
  hospitalDistanceKm: IntelligenceSignal<number>;
  shoppingDistanceKm: IntelligenceSignal<number>;
  pharmacyDistanceKm: IntelligenceSignal<number>;
  informalSettlementDistanceKm: IntelligenceSignal<number>;
  convenienceScore: IntelligenceSignal<number>;
}

export interface SafetyIntelligence {
  securityPatrol: IntelligenceSignal<boolean>;
  gatedEstate: IntelligenceSignal<boolean>;
  streetLighting: IntelligenceSignal<'good' | 'moderate' | 'limited'>;
  emergencyAccessScore: IntelligenceSignal<number>;
  safetyScore: IntelligenceSignal<number>;
}

export interface ServiceIntelligence {
  hospitals: IntelligenceSignal<Array<{ name: string; distanceKm: number }>>;
  policeStations: IntelligenceSignal<Array<{ name: string; distanceKm: number }>>;
  shoppingCentres: IntelligenceSignal<Array<{ name: string; distanceKm: number }>>;
  universities: IntelligenceSignal<Array<{ name: string; distanceKm: number }>>;
}

export interface ViewIntelligence {
  oceanView: IntelligenceSignal<boolean>;
  mountainView: IntelligenceSignal<boolean>;
  cityView: IntelligenceSignal<boolean>;
  viewConfidence: IntelligenceSignal<number>;
}

export interface MunicipalIntelligence {
  zoning: IntelligenceSignal<string>;
  buildingPlans: IntelligenceSignal<'approved' | 'not_verified' | 'unknown'>;
  municipalApproval: IntelligenceSignal<'verified' | 'not_verified' | 'unknown'>;
  hoaRestrictions: IntelligenceSignal<boolean>;
  developmentRights: IntelligenceSignal<string[]>;
}

export interface LandIntelligence {
  waterConnection: IntelligenceSignal<'connected' | 'available' | 'unknown'>;
  electricityConnection: IntelligenceSignal<'connected' | 'available' | 'unknown'>;
  sewerConnection: IntelligenceSignal<'connected' | 'available' | 'unknown'>;
  stormwater: IntelligenceSignal<'available' | 'unknown'>;
  developmentReadiness: IntelligenceSignal<number>;
}

export interface RelocationIntelligence {
  nearestUniversity: IntelligenceSignal<{ name: string; distanceKm: number }>;
  airportDistanceKm: IntelligenceSignal<number>;
  internationalSchoolDistanceKm: IntelligenceSignal<number>;
  studentRentalPotential: IntelligenceSignal<'high' | 'medium' | 'low' | 'unknown'>;
  relocationScore: IntelligenceSignal<number>;
}

export interface RiskSignal {
  key: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  evidence: IntelligenceEvidence[];
}

export interface IntelligenceReport {
  generatedAt: string;
  engineVersion: string;
  trustIndex: number;
  area: AreaIntelligence;
  safety: SafetyIntelligence;
  services: ServiceIntelligence;
  views: ViewIntelligence;
  municipal: MunicipalIntelligence;
  land: LandIntelligence;
  relocation: RelocationIntelligence;
  riskSignals: RiskSignal[];
}
