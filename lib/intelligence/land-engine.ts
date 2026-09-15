import { calculatedSignal, unknownSignal } from './evidence';
import type { IntelligenceContext, LandIntelligence } from './types';

export interface LandInputs {
  waterConnection?: 'connected' | 'available' | 'unknown' | null;
  electricityConnection?: 'connected' | 'available' | 'unknown' | null;
  sewerConnection?: 'connected' | 'available' | 'unknown' | null;
  stormwater?: 'available' | 'unknown' | null;
  zoningVerified?: boolean;
  buildingPlansVerified?: boolean;
  municipalApprovalVerified?: boolean;
}

export function buildLandIntelligence(_context: IntelligenceContext, input: LandInputs = {}): LandIntelligence {
  const readinessInputs = [
    input.waterConnection === 'connected' ? 100 : input.waterConnection === 'available' ? 75 : null,
    input.electricityConnection === 'connected' ? 100 : input.electricityConnection === 'available' ? 75 : null,
    input.sewerConnection === 'connected' ? 100 : input.sewerConnection === 'available' ? 75 : null,
    input.stormwater === 'available' ? 100 : null,
    input.zoningVerified ? 100 : null,
    input.buildingPlansVerified ? 100 : null,
    input.municipalApprovalVerified ? 100 : null,
  ].filter((value): value is number => value !== null);

  const readiness = readinessInputs.length
    ? Math.round(readinessInputs.reduce((a, b) => a + b, 0) / readinessInputs.length)
    : null;

  return {
    waterConnection: input.waterConnection == null || input.waterConnection === 'unknown'
      ? unknownSignal('land.waterConnection', 'Water connection', 'Water connection status requires utility or municipal evidence.')
      : calculatedSignal('land.waterConnection', 'Water connection', input.waterConnection, 85, 'Water status supplied as an evidence-backed utility signal.'),
    electricityConnection: input.electricityConnection == null || input.electricityConnection === 'unknown'
      ? unknownSignal('land.electricityConnection', 'Electricity connection', 'Electricity connection status requires utility or municipal evidence.')
      : calculatedSignal('land.electricityConnection', 'Electricity connection', input.electricityConnection, 85, 'Electricity status supplied as an evidence-backed utility signal.'),
    sewerConnection: input.sewerConnection == null || input.sewerConnection === 'unknown'
      ? unknownSignal('land.sewerConnection', 'Sewer connection', 'Sewer connection status requires utility or municipal evidence.')
      : calculatedSignal('land.sewerConnection', 'Sewer connection', input.sewerConnection, 85, 'Sewer status supplied as an evidence-backed utility signal.'),
    stormwater: input.stormwater == null || input.stormwater === 'unknown'
      ? unknownSignal('land.stormwater', 'Stormwater', 'Stormwater availability requires municipal or site evidence.')
      : calculatedSignal('land.stormwater', 'Stormwater', input.stormwater, 80, 'Stormwater status supplied as an evidence-backed municipal/site signal.'),
    developmentReadiness: readiness === null
      ? unknownSignal('land.developmentReadiness', 'Development readiness', 'Development readiness cannot be scored without verified utility and planning signals.')
      : calculatedSignal('land.developmentReadiness', 'Development readiness', readiness, 70, 'Calculated from supplied utility and planning verification signals.'),
  };
}
