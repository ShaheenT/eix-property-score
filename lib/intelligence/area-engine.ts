import { calculatedSignal, clampScore, unknownSignal } from './evidence';
import type { AreaIntelligence, IntelligenceContext } from './types';

export interface AreaInputs {
  policeDistanceKm?: number | null;
  hospitalDistanceKm?: number | null;
  shoppingDistanceKm?: number | null;
  pharmacyDistanceKm?: number | null;
  informalSettlementDistanceKm?: number | null;
}

function distanceScore(distanceKm: number | null | undefined, ideal: number, floor: number): number | null {
  if (distanceKm == null || !Number.isFinite(distanceKm) || distanceKm < 0) return null;
  return clampScore(100 - Math.max(0, distanceKm - ideal) * ((100 - floor) / Math.max(1, 10 - ideal)));
}

export function buildAreaIntelligence(_context: IntelligenceContext, input: AreaInputs = {}): AreaIntelligence {
  const convenienceInputs = [
    distanceScore(input.shoppingDistanceKm, 1, 35),
    distanceScore(input.pharmacyDistanceKm, 0.8, 30),
    distanceScore(input.hospitalDistanceKm, 5, 35),
  ].filter((v): v is number => v !== null);

  const convenience = convenienceInputs.length
    ? clampScore(convenienceInputs.reduce((a, b) => a + b, 0) / convenienceInputs.length)
    : null;

  const safetyInputs = [
    distanceScore(input.policeDistanceKm, 3, 40),
    distanceScore(input.hospitalDistanceKm, 5, 40),
  ].filter((v): v is number => v !== null);
  const safety = safetyInputs.length ? clampScore(safetyInputs.reduce((a, b) => a + b, 0) / safetyInputs.length) : null;

  return {
    safetyScore: safety === null
      ? unknownSignal('area.safetyScore', 'Area safety score', 'Safety score requires authoritative area signals.')
      : calculatedSignal('area.safetyScore', 'Area safety score', safety, 65, 'Calculated from supplied emergency-service proximity signals.'),
    policeDistanceKm: input.policeDistanceKm == null
      ? unknownSignal('area.policeDistanceKm', 'Nearest police station', 'Police station proximity has not been verified.')
      : calculatedSignal('area.policeDistanceKm', 'Nearest police station', input.policeDistanceKm, 90, 'Distance supplied by the area data provider.'),
    hospitalDistanceKm: input.hospitalDistanceKm == null
      ? unknownSignal('area.hospitalDistanceKm', 'Nearest hospital', 'Hospital proximity has not been verified.')
      : calculatedSignal('area.hospitalDistanceKm', 'Nearest hospital', input.hospitalDistanceKm, 90, 'Distance supplied by the area data provider.'),
    shoppingDistanceKm: input.shoppingDistanceKm == null
      ? unknownSignal('area.shoppingDistanceKm', 'Nearest shopping centre', 'Shopping-centre proximity has not been verified.')
      : calculatedSignal('area.shoppingDistanceKm', 'Nearest shopping centre', input.shoppingDistanceKm, 90, 'Distance supplied by the area data provider.'),
    pharmacyDistanceKm: input.pharmacyDistanceKm == null
      ? unknownSignal('area.pharmacyDistanceKm', 'Nearest pharmacy', 'Pharmacy proximity has not been verified.')
      : calculatedSignal('area.pharmacyDistanceKm', 'Nearest pharmacy', input.pharmacyDistanceKm, 90, 'Distance supplied by the area data provider.'),
    informalSettlementDistanceKm: input.informalSettlementDistanceKm == null
      ? unknownSignal('area.informalSettlementDistanceKm', 'Informal-settlement proximity', 'Informal-settlement proximity requires authoritative geospatial data.')
      : calculatedSignal('area.informalSettlementDistanceKm', 'Informal-settlement proximity', input.informalSettlementDistanceKm, 90, 'Distance supplied by the geospatial data provider; no safety conclusion is implied.'),
    convenienceScore: convenience === null
      ? unknownSignal('area.convenienceScore', 'Convenience score', 'Convenience requires verified amenity proximity.')
      : calculatedSignal('area.convenienceScore', 'Convenience score', convenience, 65, 'Calculated from verified shopping, pharmacy and hospital proximity.'),
  };
}
