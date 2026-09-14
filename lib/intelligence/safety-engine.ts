import { calculatedSignal, clampScore, unknownSignal } from './evidence';
import type { IntelligenceContext, SafetyIntelligence } from './types';

export interface SafetyInputs {
  securityPatrol?: boolean | null;
  gatedEstate?: boolean | null;
  streetLighting?: 'good' | 'moderate' | 'limited' | null;
  policeDistanceKm?: number | null;
  hospitalDistanceKm?: number | null;
}

export function buildSafetyIntelligence(_context: IntelligenceContext, input: SafetyInputs = {}): SafetyIntelligence {
  const components: number[] = [];
  if (input.policeDistanceKm != null && input.policeDistanceKm >= 0) components.push(clampScore(100 - input.policeDistanceKm * 12));
  if (input.hospitalDistanceKm != null && input.hospitalDistanceKm >= 0) components.push(clampScore(100 - input.hospitalDistanceKm * 7));
  if (input.securityPatrol === true) components.push(85);
  if (input.gatedEstate === true) components.push(80);
  if (input.streetLighting === 'good') components.push(80);
  if (input.streetLighting === 'moderate') components.push(60);
  if (input.streetLighting === 'limited') components.push(35);

  const score = components.length ? clampScore(components.reduce((a, b) => a + b, 0) / components.length) : null;

  return {
    securityPatrol: input.securityPatrol == null
      ? unknownSignal('safety.securityPatrol', 'Security patrol', 'Security-patrol availability has not been independently verified.')
      : calculatedSignal('safety.securityPatrol', 'Security patrol', input.securityPatrol, 80, 'Security-patrol status supplied as an evidence-backed area signal.'),
    gatedEstate: input.gatedEstate == null
      ? unknownSignal('safety.gatedEstate', 'Gated estate', 'Estate security status has not been verified.')
      : calculatedSignal('safety.gatedEstate', 'Gated estate', input.gatedEstate, 80, 'Estate status supplied as an evidence-backed property/area signal.'),
    streetLighting: input.streetLighting == null
      ? unknownSignal('safety.streetLighting', 'Street lighting', 'Street-lighting quality has not been verified.')
      : calculatedSignal('safety.streetLighting', 'Street lighting', input.streetLighting, 75, 'Street-lighting classification supplied as an evidence-backed area signal.'),
    emergencyAccessScore: score === null
      ? unknownSignal('safety.emergencyAccessScore', 'Emergency access score', 'Emergency access requires verified service proximity.')
      : calculatedSignal('safety.emergencyAccessScore', 'Emergency access score', score, 65, 'Calculated from available police, hospital and security-context signals.'),
    safetyScore: score === null
      ? unknownSignal('safety.score', 'Safety context score', 'Safety context requires multiple authoritative signals.')
      : calculatedSignal('safety.score', 'Safety context score', score, 60, 'Calculated from supplied, non-crime-specific safety context signals.'),
  };
}
