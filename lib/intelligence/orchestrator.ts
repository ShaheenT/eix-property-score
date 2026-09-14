import { INTELLIGENCE_ENGINE_VERSION, clampScore } from './evidence';
import { buildAreaIntelligence, type AreaInputs } from './area-engine';
import { buildSafetyIntelligence, type SafetyInputs } from './safety-engine';
import { buildServicesIntelligence, type ServiceInputs } from './services-engine';
import { buildViewIntelligence, type ViewInputs } from './view-engine';
import { buildMunicipalIntelligence, type MunicipalInputs } from './municipal-engine';
import { buildLandIntelligence, type LandInputs } from './land-engine';
import { buildRelocationIntelligence, type RelocationInputs } from './relocation-engine';
import { buildInvestmentIntelligence, type InvestmentInputs } from './investment-engine';
import { buildFutureRiskRadar, type FutureRiskInput } from './future-risk-engine';
import { buildDealBreakers } from './dealbreaker-engine';
import type { IntelligenceContext, IntelligenceReport } from './types';

export interface IntelligenceInputs {
  area?: AreaInputs;
  safety?: SafetyInputs;
  services?: ServiceInputs;
  views?: ViewInputs;
  municipal?: MunicipalInputs;
  land?: LandInputs;
  relocation?: RelocationInputs;
  investment?: InvestmentInputs;
  futureRisk?: FutureRiskInput;
}

export function runIntelligence(context: IntelligenceContext, input: IntelligenceInputs = {}): IntelligenceReport {
  const area = buildAreaIntelligence(context, input.area);
  const safety = buildSafetyIntelligence(context, input.safety ?? {
    policeDistanceKm: input.area?.policeDistanceKm,
    hospitalDistanceKm: input.area?.hospitalDistanceKm,
  });
  const services = buildServicesIntelligence(context, input.services);
  const views = buildViewIntelligence(context, input.views);
  const municipal = buildMunicipalIntelligence(context, input.municipal);
  const land = buildLandIntelligence(context, input.land);
  const relocation = buildRelocationIntelligence(context, input.relocation ?? {
    nearestUniversity: input.services?.universities?.[0] ?? null,
  });
  const investment = buildInvestmentIntelligence(context, input.investment);
  const futureRiskRadar = buildFutureRiskRadar(context, input.futureRisk);
  const riskSignals = buildDealBreakers(context, {
    waterConnection: land.waterConnection,
    buildingPlans: municipal.buildingPlans,
    municipalApproval: municipal.municipalApproval,
    informalSettlementDistanceKm: area.informalSettlementDistanceKm,
    hospitalDistanceKm: area.hospitalDistanceKm,
    hoaRestrictions: municipal.hoaRestrictions,
    oceanView: views.oceanView,
  });

  const allSignals = [
    area.safetyScore,
    area.convenienceScore,
    safety.safetyScore,
    safety.emergencyAccessScore,
    land.developmentReadiness,
    relocation.relocationScore,
    investment.pricePerM2,
    investment.askingPriceSignal,
  ];
  const scored = allSignals.filter((signal) => signal.value != null);
  const trustValues = allSignals.map((signal) => signal.confidence).filter((v) => v > 0);
  const trustIndex = trustValues.length ? clampScore(trustValues.reduce((a, b) => a + b, 0) / trustValues.length) : 0;

  return {
    generatedAt: new Date().toISOString(),
    engineVersion: INTELLIGENCE_ENGINE_VERSION,
    trustIndex: scored.length ? trustIndex : 0,
    area,
    safety,
    services,
    views,
    municipal,
    land,
    relocation,
    investment,
    futureRiskRadar,
    riskSignals,
  };
}
