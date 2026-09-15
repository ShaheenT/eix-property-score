import { calculatedSignal, unknownSignal } from './evidence';
import type { IntelligenceContext, MunicipalIntelligence } from './types';

export interface MunicipalInputs {
  zoning?: string | null;
  buildingPlans?: 'approved' | 'not_verified' | 'unknown' | null;
  municipalApproval?: 'verified' | 'not_verified' | 'unknown' | null;
  hoaRestrictions?: boolean | null;
  developmentRights?: string[] | null;
}

export function buildMunicipalIntelligence(_context: IntelligenceContext, input: MunicipalInputs = {}): MunicipalIntelligence {
  return {
    zoning: input.zoning
      ? calculatedSignal('municipal.zoning', 'Zoning', input.zoning, 80, 'Zoning supplied by an authoritative planning-data adapter.')
      : unknownSignal('municipal.zoning', 'Zoning', 'Current zoning requires authoritative municipal or planning-data verification.'),
    buildingPlans: input.buildingPlans == null || input.buildingPlans === 'unknown'
      ? unknownSignal('municipal.buildingPlans', 'Building plans', 'Building-plan approval has not been independently verified with the relevant authority.')
      : calculatedSignal('municipal.buildingPlans', 'Building plans', input.buildingPlans, 90, 'Building-plan status supplied by an authoritative municipal-data adapter.'),
    municipalApproval: input.municipalApproval == null || input.municipalApproval === 'unknown'
      ? unknownSignal('municipal.municipalApproval', 'Municipal approval', 'Municipal approval status requires confirmation from the relevant authority.')
      : calculatedSignal('municipal.municipalApproval', 'Municipal approval', input.municipalApproval, 90, 'Municipal approval status supplied by an authoritative adapter.'),
    hoaRestrictions: input.hoaRestrictions == null
      ? unknownSignal('municipal.hoaRestrictions', 'HOA restrictions', 'HOA or estate restrictions have not been verified.')
      : calculatedSignal('municipal.hoaRestrictions', 'HOA restrictions', input.hoaRestrictions, 80, 'HOA restriction status supplied by an evidence-backed property/estate source.'),
    developmentRights: input.developmentRights == null
      ? unknownSignal('municipal.developmentRights', 'Development rights', 'Development rights require zoning and municipal evidence.')
      : calculatedSignal('municipal.developmentRights', 'Development rights', input.developmentRights, 75, 'Development rights derived from supplied planning evidence.'),
  };
}
