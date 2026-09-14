import { calculatedSignal, unknownSignal } from './evidence';
import type { IntelligenceContext, RiskSignal } from './types';

export interface FutureRiskInput {
  plannedRoadProjects?: Array<{ name: string; status: string }> | null;
  plannedDevelopments?: Array<{ name: string; status: string }> | null;
  rezoningSignals?: Array<{ description: string; status: string }> | null;
  floodRisk?: 'low' | 'moderate' | 'high' | null;
  wildfireRisk?: 'low' | 'moderate' | 'high' | null;
  coastalErosionRisk?: 'low' | 'moderate' | 'high' | null;
}

export interface FutureRiskRadar {
  signals: RiskSignal[];
  confidence: number;
}

export function buildFutureRiskRadar(_context: IntelligenceContext, input: FutureRiskInput = {}): FutureRiskRadar {
  const signals: RiskSignal[] = [];
  const add = (key: string, title: string, description: string, severity: RiskSignal['severity']) => {
    signals.push({ key, title, description, severity, evidence: [calculatedSignal(key, title, true, 70, description).evidence[0]] });
  };

  input.plannedRoadProjects?.forEach((project) => add(`future.road.${project.name}`, `Road project: ${project.name}`, `Planning signal: ${project.status}.`, 'info'));
  input.plannedDevelopments?.forEach((project) => add(`future.development.${project.name}`, `Planned development: ${project.name}`, `Planning signal: ${project.status}.`, 'medium'));
  input.rezoningSignals?.forEach((signal) => add(`future.rezoning.${signal.description}`, 'Rezoning signal nearby', `${signal.description} (${signal.status}).`, 'medium'));
  if (input.floodRisk && input.floodRisk !== 'low') add('future.flood', 'Flood-risk signal', `Flood-risk indicator: ${input.floodRisk}.`, input.floodRisk === 'high' ? 'high' : 'medium');
  if (input.wildfireRisk && input.wildfireRisk !== 'low') add('future.wildfire', 'Wildfire-risk signal', `Wildfire-risk indicator: ${input.wildfireRisk}.`, input.wildfireRisk === 'high' ? 'high' : 'medium');
  if (input.coastalErosionRisk && input.coastalErosionRisk !== 'low') add('future.coastal', 'Coastal-erosion signal', `Coastal-erosion indicator: ${input.coastalErosionRisk}.`, input.coastalErosionRisk === 'high' ? 'high' : 'medium');

  const knownInputs = [input.plannedRoadProjects, input.plannedDevelopments, input.rezoningSignals, input.floodRisk, input.wildfireRisk, input.coastalErosionRisk].filter((v) => v != null).length;
  return { signals, confidence: knownInputs ? 70 : 0 };
}
