import type { IntelligenceContext, IntelligenceSignal, RiskSignal } from './types';

function addSignalRisk(risks: RiskSignal[], signal: IntelligenceSignal<unknown>, severity: RiskSignal['severity'], title: string, description: string) {
  if (signal.status === 'unknown' || signal.status === 'requires_confirmation') {
    risks.push({ key: signal.key, severity, title, description, evidence: signal.evidence });
  }
}

export function buildDealBreakers(_context: IntelligenceContext, signals: {
  waterConnection: IntelligenceSignal<unknown>;
  buildingPlans: IntelligenceSignal<unknown>;
  municipalApproval: IntelligenceSignal<unknown>;
  informalSettlementDistanceKm: IntelligenceSignal<number>;
  hospitalDistanceKm: IntelligenceSignal<number>;
  hoaRestrictions: IntelligenceSignal<unknown>;
  oceanView: IntelligenceSignal<unknown>;
}): RiskSignal[] {
  const risks: RiskSignal[] = [];
  addSignalRisk(risks, signals.buildingPlans, 'high', 'Building plans not verified', 'Municipal confirmation is required before relying on building-plan approval.');
  addSignalRisk(risks, signals.municipalApproval, 'high', 'Municipal approval not verified', 'Confirm approval status with the relevant municipality or authority.');
  addSignalRisk(risks, signals.waterConnection, 'medium', 'Water connection unknown', 'Confirm water connection and service availability before committing to the property.');
  addSignalRisk(risks, signals.hoaRestrictions, 'medium', 'HOA restrictions unknown', 'Review estate or HOA rules before purchase or development.');
  addSignalRisk(risks, signals.oceanView, 'low', 'View claim requires confirmation', 'Do not assign value to an ocean-view claim until the view is independently verified.');

  if (signals.informalSettlementDistanceKm.value != null && signals.informalSettlementDistanceKm.value <= 2) {
    risks.push({
      key: 'area.informalSettlementDistanceKm',
      severity: 'medium',
      title: 'Informal settlement nearby',
      description: `${signals.informalSettlementDistanceKm.value.toFixed(1)} km proximity signal. This is geographic context only and is not a safety or crime conclusion.`,
      evidence: signals.informalSettlementDistanceKm.evidence,
    });
  }

  if (signals.hospitalDistanceKm.value != null && signals.hospitalDistanceKm.value >= 8) {
    risks.push({
      key: 'area.hospitalDistanceKm',
      severity: 'medium',
      title: 'Limited hospital proximity',
      description: `Nearest verified hospital is ${signals.hospitalDistanceKm.value.toFixed(1)} km away.`,
      evidence: signals.hospitalDistanceKm.evidence,
    });
  }

  return risks;
}
