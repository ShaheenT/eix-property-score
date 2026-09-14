import { calculatedSignal, unknownSignal } from './evidence';
import type { IntelligenceContext, ServiceIntelligence } from './types';

export interface ServiceInputs {
  hospitals?: Array<{ name: string; distanceKm: number }> | null;
  policeStations?: Array<{ name: string; distanceKm: number }> | null;
  shoppingCentres?: Array<{ name: string; distanceKm: number }> | null;
  universities?: Array<{ name: string; distanceKm: number }> | null;
}

export function buildServicesIntelligence(_context: IntelligenceContext, input: ServiceInputs = {}): ServiceIntelligence {
  return {
    hospitals: input.hospitals == null
      ? unknownSignal('services.hospitals', 'Hospitals', 'Hospital locations require an authoritative geospatial provider.')
      : calculatedSignal('services.hospitals', 'Hospitals', input.hospitals, 90, 'Nearby hospital locations and distances supplied by the location provider.'),
    policeStations: input.policeStations == null
      ? unknownSignal('services.policeStations', 'Police stations', 'Police-station locations require an authoritative geospatial provider.')
      : calculatedSignal('services.policeStations', 'Police stations', input.policeStations, 90, 'Nearby police locations and distances supplied by the location provider.'),
    shoppingCentres: input.shoppingCentres == null
      ? unknownSignal('services.shoppingCentres', 'Shopping centres', 'Shopping-centre locations require an authoritative geospatial provider.')
      : calculatedSignal('services.shoppingCentres', 'Shopping centres', input.shoppingCentres, 90, 'Nearby shopping-centre locations and distances supplied by the location provider.'),
    universities: input.universities == null
      ? unknownSignal('services.universities', 'Universities', 'University locations require an authoritative geospatial provider.')
      : calculatedSignal('services.universities', 'Universities', input.universities, 90, 'Nearby university locations and distances supplied by the location provider.'),
  };
}
