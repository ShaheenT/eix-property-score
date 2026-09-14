import type { PropertyFacts } from '@/lib/property-types';
import { persistIntelligenceReport } from './persistence';
import { runIntelligence, type IntelligenceInputs } from './orchestrator';
import type { IntelligenceContext } from './types';
import { enrichPropertyFromProviders } from './providers/provider-enrichment';
import type { NearbyPlace } from './providers/provider-types';

export function buildPropertyIntelligenceContext(facts: PropertyFacts, propertyId?: string | null): IntelligenceContext {
  return {
    propertyId: propertyId ?? null,
    address: facts.address,
    suburb: facts.suburb,
    city: facts.city,
    province: facts.province,
    propertyType: facts.propertyType,
    landSizeM2: facts.landSizeM2,
    askingPriceCents: facts.askingPriceCents,
  };
}

function nearest(nearby: NearbyPlace[], category: NearbyPlace['category']): NearbyPlace | null {
  return nearby
    .filter((place) => place.category === category && Number.isFinite(place.distanceKm) && place.distanceKm >= 0)
    .sort((a, b) => a.distanceKm - b.distanceKm)[0] ?? null;
}

function mapProviderInputs(nearby: NearbyPlace[]): IntelligenceInputs {
  const hospitals = nearby.filter((place) => place.category === 'hospital').map(toServicePlace);
  const policeStations = nearby.filter((place) => place.category === 'police').map(toServicePlace);
  const shoppingCentres = nearby.filter((place) => place.category === 'shopping_centre').map(toServicePlace);
  const universities = nearby.filter((place) => place.category === 'university').map(toServicePlace);

  const hospital = nearest(nearby, 'hospital');
  const police = nearest(nearby, 'police');
  const shopping = nearest(nearby, 'shopping_centre');
  const pharmacy = nearest(nearby, 'pharmacy');
  const informalSettlement = nearest(nearby, 'informal_settlement');
  const university = nearest(nearby, 'university');

  return {
    area: {
      policeDistanceKm: police?.distanceKm ?? null,
      hospitalDistanceKm: hospital?.distanceKm ?? null,
      shoppingDistanceKm: shopping?.distanceKm ?? null,
      pharmacyDistanceKm: pharmacy?.distanceKm ?? null,
      informalSettlementDistanceKm: informalSettlement?.distanceKm ?? null,
    },
    safety: {
      policeDistanceKm: police?.distanceKm ?? null,
      hospitalDistanceKm: hospital?.distanceKm ?? null,
    },
    services: {
      hospitals,
      policeStations,
      shoppingCentres,
      universities,
    },
    relocation: {
      nearestUniversity: university ? { name: university.name, distanceKm: university.distanceKm } : null,
    },
  };
}

function toServicePlace(place: NearbyPlace): { name: string; distanceKm: number } {
  return { name: place.name, distanceKm: place.distanceKm };
}

export async function runPropertyIntelligence(
  facts: PropertyFacts,
  options: {
    propertyId?: string | null;
    submissionId?: string | null;
    extractionRunId?: string | null;
    inputs?: IntelligenceInputs;
  } = {},
) {
  const enrichment = await enrichPropertyFromProviders(facts);
  const context: IntelligenceContext = {
    ...buildPropertyIntelligenceContext(facts, options.propertyId),
    coordinates: enrichment.coordinates,
    propertyEvidence: enrichment.coordinateEvidence,
  };

  const providerInputs = mapProviderInputs(enrichment.nearby);
  const report = runIntelligence(context, {
    ...providerInputs,
    ...options.inputs,
    area: { ...providerInputs.area, ...options.inputs?.area },
    safety: { ...providerInputs.safety, ...options.inputs?.safety },
    services: { ...providerInputs.services, ...options.inputs?.services },
    relocation: { ...providerInputs.relocation, ...options.inputs?.relocation },
  });
  const runId = await persistIntelligenceReport(report, {
    submissionId: options.submissionId,
    extractionRunId: options.extractionRunId,
  });
  return { report, runId };
}
