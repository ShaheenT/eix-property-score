import { supabaseAdmin } from '@/lib/supabase';
import type { IntelligenceReport, IntelligenceSignal } from './types';

function isSignal(value: unknown): value is IntelligenceSignal {
  return Boolean(value && typeof value === 'object' && 'key' in value && 'status' in value && 'evidence' in value);
}

function collectSignals(value: unknown, output: IntelligenceSignal[] = []): IntelligenceSignal[] {
  if (isSignal(value)) {
    output.push(value);
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectSignals(item, output));
    return output;
  }
  if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectSignals(item, output));
  }
  return output;
}

export async function persistIntelligenceReport(
  report: IntelligenceReport,
  options: { submissionId?: string | null; extractionRunId?: string | null } = {},
): Promise<string | null> {
  if (!options.submissionId) return null;

  const { data: run, error: runError } = await supabaseAdmin
    .from('property_intelligence_runs')
    .insert({
      submission_id: options.submissionId,
      extraction_run_id: options.extractionRunId ?? null,
      engine_version: report.engineVersion,
      trust_index: report.trustIndex,
      status: report.riskSignals.some((signal) => signal.severity === 'critical') ? 'partial' : 'completed',
      generated_at: report.generatedAt,
    })
    .select('id')
    .single();

  if (runError || !run) throw new Error(`Intelligence run persistence failed: ${runError?.message ?? 'unknown database error'}`);

  const signals = collectSignals(report).map((signal) => ({
    run_id: run.id,
    engine: signal.key.split('.')[0] ?? 'intelligence',
    signal_key: signal.key,
    label: signal.label,
    value_json: signal.value,
    status: signal.status,
    confidence: signal.confidence,
  }));

  const signalIds = new Map<string, string>();
  if (signals.length) {
    const { data: rows, error: signalError } = await supabaseAdmin
      .from('property_intelligence_signals')
      .insert(signals)
      .select('id, signal_key');
    if (signalError) throw new Error(`Intelligence signal persistence failed: ${signalError.message}`);
    rows?.forEach((row) => signalIds.set(row.signal_key, row.id));
  }

  const evidenceRows = collectSignals(report).flatMap((signal) => {
    const signalId = signalIds.get(signal.key);
    if (!signalId) return [];
    return signal.evidence.map((item) => ({
      signal_id: signalId,
      evidence_key: item.id,
      claim: item.claim,
      evidence_type: item.evidenceType,
      source: item.source,
      source_url: item.sourceUrl ?? null,
      confidence: item.confidence,
      retrieved_at: item.retrievedAt,
      notes: item.notes ?? null,
    }));
  });

  if (evidenceRows.length) {
    const { error: evidenceError } = await supabaseAdmin.from('property_intelligence_evidence').insert(evidenceRows);
    if (evidenceError) throw new Error(`Intelligence evidence persistence failed: ${evidenceError.message}`);
  }

  if (report.riskSignals.length) {
    const { error: riskError } = await supabaseAdmin.from('property_risk_signals').insert(report.riskSignals.map((risk) => ({
      run_id: run.id,
      risk_key: risk.key,
      severity: risk.severity,
      title: risk.title,
      description: risk.description,
      evidence_json: risk.evidence,
    })));
    if (riskError) throw new Error(`Intelligence risk persistence failed: ${riskError.message}`);
  }

  return run.id;
}
