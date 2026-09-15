import type { PropertyFacts } from '@/lib/property-types';
import { persistIntelligenceReport } from './persistence';
import { runIntelligence, type IntelligenceInputs } from './orchestrator';
import type { IntelligenceContext } from './types';
import { enrichPropertyFromProviders } from './providers/provider-enrichment';
import { mapProviderInputs } from './provider-inputs';

export function buildPropertyIntelligenceContext(facts: PropertyFacts, propertyId?: string | null): IntelligenceContext {
  return {
    propertyId: propertyId ?? null,
    address: facts.address,
    suburb: facts.suburb,
    city: facts.city,
    province: facts.province,
    propertyType: facts.propertyType,
    landSizeM2: facts.landSizeM2,
    askingPriceCents: facts.askingPriceCents,
  };
}

export async function runPropertyIntelligence(
  facts: PropertyFacts,
  options: {
    propertyId?: string | null;
    submissionId?: string | null;
    extractionRunId?: string | null;
    inputs?: IntelligenceInputs;
  } = {},
) {
  const enrichment = await enrichPropertyFromProviders(facts);
  const context: IntelligenceContext = {
    ...buildPropertyIntelligenceContext(facts, options.propertyId),
    coordinates: enrichment.coordinates,
    propertyEvidence: enrichment.coordinateEvidence,
  };

  const providerInputs = mapProviderInputs(enrichment.nearby);
  const report = runIntelligence(context, {
    ...providerInputs,
    ...options.inputs,
    area: { ...providerInputs.area, ...options.inputs?.area },
    safety: { ...providerInputs.safety, ...options.inputs?.safety },
    services: { ...providerInputs.services, ...options.inputs?.services },
    relocation: { ...providerInputs.relocation, ...options.inputs?.relocation },
  });
  const runId = await persistIntelligenceReport(report, {
    submissionId: options.submissionId,
    extractionRunId: options.extractionRunId,
  });
  return { report, runId };
}
