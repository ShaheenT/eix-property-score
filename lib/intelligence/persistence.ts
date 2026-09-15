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

  const signals = collectSignals(report);
  const payload = {
    submissionId: options.submissionId,
    extractionRunId: options.extractionRunId ?? null,
    engineVersion: report.engineVersion,
    trustIndex: report.trustIndex,
    status: report.riskSignals.some((signal) => signal.severity === 'critical') ? 'partial' : 'completed',
    generatedAt: report.generatedAt,
    signals: signals.map((signal) => ({
      key: signal.key,
      label: signal.label,
      value: signal.value,
      status: signal.status,
      confidence: signal.confidence,
      evidence: signal.evidence,
    })),
    riskSignals: report.riskSignals,
  };

  const { data, error } = await supabaseAdmin.rpc('persist_property_intelligence_report', {
    p_payload: payload,
  });

  if (error || !data) {
    throw new Error(`Intelligence run persistence failed: ${error?.message ?? 'unknown database error'}`);
  }

  return data as string;
}
