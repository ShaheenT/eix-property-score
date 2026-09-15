-- EiXPropScore operational privilege hotfix.
--
-- The operational tables below intentionally keep RLS enabled so browser roles
-- cannot read/write extraction, intelligence, cache, or verification data.
-- Server-side report processing uses Supabase's service-role client, so grant
-- that role explicit table/sequence privileges in addition to RLS bypass.

grant usage on schema public to service_role;

grant all privileges on table
  public.property_extraction_runs,
  public.property_extraction_evidence,
  public.property_extraction_conflicts,
  public.property_intelligence_runs,
  public.property_intelligence_signals,
  public.property_intelligence_evidence,
  public.property_risk_signals,
  public.property_intelligence_provider_cache,
  public.verification_ledgers
  to service_role;

grant usage, select, update on sequence public.eix_verification_ledger_number_seq
  to service_role;

grant execute on function public.allocate_eix_verification_ledger_id()
  to service_role;

grant execute on function public.persist_property_intelligence_report(jsonb)
  to service_role;
