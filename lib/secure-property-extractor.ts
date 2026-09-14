import { extractPropertyFromUrl as legacyExtractPropertyFromUrl } from '@/lib/property-extractor';
import { runSecureExtraction, type SecureExtractionResult } from '@/lib/secure-extraction-engine';
import { supabaseAdmin } from '@/lib/supabase';

export async function extractPropertyFromUrl(input: string, submissionId?: string): Promise<SecureExtractionResult> {
  const result = await runSecureExtraction(input, { legacyExtract: legacyExtractPropertyFromUrl });
  if (!submissionId || !result.metadata) return result;

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
      extractor_version: '2.0.0',
      security_result: result.metadata.security,
      error_message: result.errors.length ? result.errors.join('; ') : null,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (runError || !run) throw new Error(`Extraction audit persistence failed: ${runError?.message ?? 'unknown database error'}`);

  if (result.evidence.length) {
    const { error: evidenceError } = await supabaseAdmin
      .from('property_extraction_evidence')
      .insert(result.evidence.map((item) => ({
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
  return result;
}
