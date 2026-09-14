import { calculatedSignal, unknownSignal } from './evidence';
import type { IntelligenceContext, RelocationIntelligence } from './types';

export interface RelocationInputs {
  nearestUniversity?: { name: string; distanceKm: number } | null;
  airportDistanceKm?: number | null;
  internationalSchoolDistanceKm?: number | null;
}

export function buildRelocationIntelligence(_context: IntelligenceContext, input: RelocationInputs = {}): RelocationIntelligence {
  const proximityScores = [
    input.nearestUniversity?.distanceKm == null ? null : Math.max(0, 100 - input.nearestUniversity.distanceKm * 8),
    input.airportDistanceKm == null ? null : Math.max(0, 100 - input.airportDistanceKm * 2.5),
    input.internationalSchoolDistanceKm == null ? null : Math.max(0, 100 - input.internationalSchoolDistanceKm * 6),
  ].filter((value): value is number => value !== null);
  const score = proximityScores.length
    ? Math.min(100, Math.round(proximityScores.reduce((a, b) => a + b, 0) / proximityScores.length))
    : null;
  const university = input.nearestUniversity;
  const studentPotential = university == null
    ? null
    : university.distanceKm <= 3 ? 'high' : university.distanceKm <= 8 ? 'medium' : 'low';

  return {
    nearestUniversity: university
      ? calculatedSignal('relocation.nearestUniversity', 'Nearest university', university, 90, 'University proximity supplied by the location intelligence provider.')
      : unknownSignal('relocation.nearestUniversity', 'Nearest university', 'University proximity requires authoritative geospatial data.'),
    airportDistanceKm: input.airportDistanceKm == null
      ? unknownSignal('relocation.airportDistanceKm', 'Airport distance', 'Airport proximity has not been verified.')
      : calculatedSignal('relocation.airportDistanceKm', 'Airport distance', input.airportDistanceKm, 90, 'Airport distance supplied by the location intelligence provider.'),
    internationalSchoolDistanceKm: input.internationalSchoolDistanceKm == null
      ? unknownSignal('relocation.internationalSchoolDistanceKm', 'International school distance', 'International-school proximity has not been verified.')
      : calculatedSignal('relocation.internationalSchoolDistanceKm', 'International school distance', input.internationalSchoolDistanceKm, 90, 'International-school distance supplied by the location intelligence provider.'),
    studentRentalPotential: studentPotential
      ? calculatedSignal('relocation.studentRentalPotential', 'Student rental potential', studentPotential, 60, 'Calculated solely from university proximity; it is not a rental valuation.' )
      : unknownSignal('relocation.studentRentalPotential', 'Student rental potential', 'Student rental potential requires verified university proximity.'),
    relocationScore: score === null
      ? unknownSignal('relocation.score', 'Relocation score', 'Relocation score requires verified location signals.')
      : calculatedSignal('relocation.score', 'Relocation score', score, 65, 'Calculated from university, airport and international-school proximity.'),
  };
}
