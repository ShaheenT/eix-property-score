import { extractPropertyFromUrl as legacyExtractPropertyFromUrl } from '@/lib/property-extractor';
import { runSecureExtraction, type SecureExtractionResult } from '@/lib/secure-extraction-engine';
import { supabaseAdmin } from '@/lib/supabase';
import type { PropertyFacts } from '@/lib/property-types';

const EXTRACTION_VERSION = '2.2.0';

function errorCode(result: SecureExtractionResult): string | null {
  if (result.status === 'extracted') return null;
  if (result.status === 'unsupported_source') return 'UNSUPPORTED_SOURCE';
  if (result.status === 'insufficient_data') return 'INSUFFICIENT_EVIDENCE';
  if (result.status === 'extraction_failed') {
    const message = result.errors.filter(Boolean).join(' ').toLowerCase();
    if (message.includes('timed out')) return 'UPSTREAM_TIMEOUT';
    if (message.includes('redirect')) return 'INVALID_REDIRECT';
    if (message.includes('private') || message.includes('local network')) return 'BLOCKED_NETWORK_DESTINATION';
    if (message.includes('content type')) return 'UNSUPPORTED_CONTENT_TYPE';
    return 'EXTRACTION_FAILED';
  }
  return 'EXTRACTION_FAILED';
}

function auditEvidence(result: SecureExtractionResult): SecureExtractionResult['evidence'] {
  const existing = new Set(result.evidence.map((item) => String(item.field)));
  const required: Array<keyof PropertyFacts> = ['title', 'propertyType', 'askingPriceCents', 'bedrooms', 'bathrooms'];
  const missing = required
    .filter((field) => result.facts[field] === null || result.facts[field] === undefined || result.facts[field] === '')
    .filter((field) => !existing.has(String(field)))
    .map((field) => ({
      field,
      value: 'Evidence not found on the fetched listing page.',
      source: 'html' as const,
      status: 'missing' as const,
      retrievalMethod: 'html' as const,
      sourceUrl: result.sourceUrl,
    }));
  return [...result.evidence, ...missing];
}

export async function extractPropertyFromUrl(input: string, submissionId?: string): Promise<SecureExtractionResult> {
  const startedAt = new Date().toISOString();
  const result = await runSecureExtraction(input, { legacyExtract: legacyExtractPropertyFromUrl });
  const persistedEvidence = auditEvidence(result);
  if (!submissionId || !result.metadata) return { ...result, evidence: persistedEvidence };

  const completedAt = new Date().toISOString();
  const { data: run, error: runError } = await supabaseAdmin
    .from('property_extraction_runs')
    .insert({
      submission_id: submissionId,
      input_url: input,
      canonical_url: result.metadata.canonicalUrl,
      source: result.metadata.source,
      page_type: result.metadata.pageType,
      listing_id: result.metadata.listingId,
      status: result.status,
      report_eligible: result.metadata.reportEligible,
      evidence_completeness: result.metadata.evidenceCompleteness,
      extractor_version: EXTRACTION_VERSION,
      security_result: result.metadata.security,
      error_code: errorCode(result),
      error_message: result.errors.length ? result.errors.join('; ') : null,
      started_at: startedAt,
      completed_at: completedAt,
    })
    .select('id')
    .single();
  if (runError || !run) throw new Error(`Extraction audit persistence failed: ${runError?.message ?? 'unknown database error'}`);

  if (persistedEvidence.length) {
    const { error: evidenceError } = await supabaseAdmin
      .from('property_extraction_evidence')
      .insert(persistedEvidence.map((item) => ({
        run_id: run.id,
        field: String(item.field),
        value_json: item.value,
        evidence_status: item.status,
        retrieval_method: item.retrievalMethod,
        source_url: item.sourceUrl,
      })));
    if (evidenceError) throw new Error(`Extraction evidence persistence failed: ${evidenceError.message}`);
  }

  if (result.metadata.conflicts.length) {
    const { error: conflictError } = await supabaseAdmin
      .from('property_extraction_conflicts')
      .insert(result.metadata.conflicts.map((conflict) => ({
        run_id: run.id,
        field: conflict.field,
        values_json: conflict.values,
        resolution: conflict.resolution,
      })));
    if (conflictError) throw new Error(`Extraction conflict persistence failed: ${conflictError.message}`);
  }

  return { ...result, evidence: persistedEvidence };
}
