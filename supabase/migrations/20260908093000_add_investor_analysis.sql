/* EiX Property Score — Investor Report Pro storage. */

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS investor_analysis jsonb;

COMMENT ON COLUMN public.reports.investor_analysis IS
  'Evidence-first Investor Report Pro analysis. Contains verified facts, market comparisons, acquisition scenarios, evidence status, assumptions and limitations.';
