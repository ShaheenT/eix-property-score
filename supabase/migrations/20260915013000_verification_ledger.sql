/* EiXPropScore™ Verification Ledger
 *
 * Creates a tamper-evident report fingerprint and public verification identity.
 * Ledger numbers are allocated by a PostgreSQL sequence so concurrent reports
 * cannot receive duplicate IDs.
 */

CREATE SEQUENCE IF NOT EXISTS public.eix_verification_ledger_number_seq;

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS ledger_id text,
  ADD COLUMN IF NOT EXISTS report_hash text,
  ADD COLUMN IF NOT EXISTS intelligence_run_id uuid,
  ADD COLUMN IF NOT EXISTS intelligence_trust_index smallint;

CREATE UNIQUE INDEX IF NOT EXISTS reports_ledger_id_unique
  ON public.reports (ledger_id)
  WHERE ledger_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.verification_ledgers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  ledger_id text NOT NULL UNIQUE,
  report_hash text NOT NULL,
  intelligence_version text NOT NULL,
  extraction_version text NOT NULL,
  trust_index smallint NOT NULL CHECK (trust_index BETWEEN 0 AND 100),
  generated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS verification_ledgers_report_unique
  ON public.verification_ledgers (report_id);

CREATE INDEX IF NOT EXISTS verification_ledgers_ledger_id_idx
  ON public.verification_ledgers (ledger_id);

ALTER TABLE public.verification_ledgers ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.verification_ledgers IS 'Cryptographic verification records for completed EiXPropScore™ reports.';
COMMENT ON COLUMN public.verification_ledgers.report_hash IS 'SHA-256 fingerprint of the canonical report snapshot.';
