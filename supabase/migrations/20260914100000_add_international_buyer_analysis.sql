/*
  EiXPropScore™ — International Buyer Intelligence report output.
*/

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS international_buyer_analysis jsonb;

COMMENT ON COLUMN public.reports.international_buyer_analysis IS
  'Structured International Buyer Intelligence generated from verified property evidence and buyer profile inputs.';
