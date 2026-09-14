import type { PropertyFacts } from '@/lib/property-types';
import { persistIntelligenceReport } from './persistence';
import { runIntelligence, type IntelligenceInputs } from './orchestrator';
import type { IntelligenceContext } from './types';
import { enrichPropertyFromProviders } from './providers/provider-enrichment';

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

  const report = runIntelligence(context, options.inputs);
  const runId = await persistIntelligenceReport(report, {
    submissionId: options.submissionId,
    extractionRunId: options.extractionRunId,
  });
  return { report, runId };
}
