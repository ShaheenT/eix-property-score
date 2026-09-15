import type { IntelligenceInputs } from './orchestrator';
import type { NearbyPlace } from './providers/provider-types';

function nearest(nearby: NearbyPlace[], category: NearbyPlace['category']): NearbyPlace | null {
  return nearby
    .filter((place) => place.category === category && Number.isFinite(place.distanceKm) && place.distanceKm >= 0)
    .sort((a, b) => a.distanceKm - b.distanceKm)[0] ?? null;
}

function toServicePlace(place: NearbyPlace): { name: string; distanceKm: number } {
  return { name: place.name, distanceKm: place.distanceKm };
}

export function mapProviderInputs(nearby: NearbyPlace[]): IntelligenceInputs {
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
  const internationalSchool = nearest(nearby, 'international_school');

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
      internationalSchoolDistanceKm: internationalSchool?.distanceKm ?? null,
    },
  };
}
