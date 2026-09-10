/* EiX Property Score — evidence-first report storage.
 *
 * These fields preserve the inputs, calculations, assumptions and limitations
 * used to produce a customer report. No calculated value is intended to imply
 * an external market fact unless the corresponding evidence exists.
 */

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS property_facts jsonb,
  ADD COLUMN IF NOT EXISTS property_evidence jsonb,
  ADD COLUMN IF NOT EXISTS score_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS assumptions jsonb,
  ADD COLUMN IF NOT EXISTS limitations jsonb,
  ADD COLUMN IF NOT EXISTS rental_yield_percent numeric,
  ADD COLUMN IF NOT EXISTS bond_monthly_payment_cents bigint,
  ADD COLUMN IF NOT EXISTS bond_loan_amount_cents bigint,
  ADD COLUMN IF NOT EXISTS risk_level text,
  ADD COLUMN IF NOT EXISTS recommendation text,
  ADD COLUMN IF NOT EXISTS confidence_label text,
  ADD COLUMN IF NOT EXISTS access_token text,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS reports_access_token_unique
  ON public.reports (access_token)
  WHERE access_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS reports_submission_id_idx
  ON public.reports (submission_id);

COMMENT ON COLUMN public.reports.property_facts IS 'Verified source facts used for this report.';
COMMENT ON COLUMN public.reports.property_evidence IS 'Evidence records supporting extracted property facts.';
COMMENT ON COLUMN public.reports.score_breakdown IS 'Deterministic EiX scoring inputs and points.';
COMMENT ON COLUMN public.reports.assumptions IS 'Explicit scenario assumptions; not verified property facts.';
COMMENT ON COLUMN public.reports.limitations IS 'Facts/data unavailable or claims intentionally withheld.';
