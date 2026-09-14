import type { IntelligenceEvidence, IntelligenceEvidenceType, IntelligenceSignal } from './types';

export const INTELLIGENCE_ENGINE_VERSION = '1.0.0';

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function evidence(
  id: string,
  claim: string,
  evidenceType: IntelligenceEvidenceType,
  source: string,
  confidence: number,
  sourceUrl: string | null = null,
  notes: string | null = null,
): IntelligenceEvidence {
  return {
    id,
    claim,
    evidenceType,
    source,
    sourceUrl,
    confidence: clampScore(confidence),
    retrievedAt: new Date().toISOString(),
    notes,
  };
}

export function unknownSignal<T>(key: string, label: string, note: string): IntelligenceSignal<T> {
  return {
    key,
    label,
    value: null,
    status: 'unknown',
    confidence: 0,
    evidence: [
      evidence(
        `${key}:unknown`,
        note,
        'confirmation_required',
        'EiXPropScore',
        0,
        null,
        'No authoritative evidence was supplied to this engine.',
      ),
    ],
  };
}

export function calculatedSignal<T>(
  key: string,
  label: string,
  value: T,
  confidence: number,
  claim: string,
): IntelligenceSignal<T> {
  return {
    key,
    label,
    value,
    status: 'available',
    confidence: clampScore(confidence),
    evidence: [evidence(`${key}:calculated`, claim, 'calculated', 'EiXPropScore', confidence)],
  };
}
