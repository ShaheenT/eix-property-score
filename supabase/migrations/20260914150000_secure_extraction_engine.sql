-- EiXPropScore secure extraction audit model.
-- Operational writes use the Supabase service-role client from the server.
-- RLS remains enabled so browser clients cannot read extraction evidence directly.

create table if not exists public.property_extraction_runs (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references public.property_submissions(id) on delete cascade,
  input_url text not null,
  canonical_url text,
  source text,
  page_type text,
  listing_id text,
  status text not null default 'queued',
  report_eligible boolean not null default false,
  evidence_completeness smallint,
  extractor_version text not null default '2.0.0',
  security_result jsonb not null default '{}'::jsonb,
  error_code text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint property_extraction_runs_status_check check (status in ('queued','processing','extracted','insufficient_data','extraction_failed','blocked')),
  constraint property_extraction_runs_completeness_check check (evidence_completeness is null or (evidence_completeness between 0 and 100))
);

create index if not exists property_extraction_runs_submission_idx on public.property_extraction_runs(submission_id, created_at desc);
create index if not exists property_extraction_runs_canonical_idx on public.property_extraction_runs(canonical_url);

create table if not exists public.property_extraction_evidence (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.property_extraction_runs(id) on delete cascade,
  field text not null,
  value_json jsonb not null,
  evidence_status text not null,
  retrieval_method text not null,
  source_url text not null,
  created_at timestamptz not null default now(),
  constraint property_extraction_evidence_status_check check (evidence_status in ('verified','supported','conflict','missing','not_applicable','unavailable')),
  constraint property_extraction_evidence_method_check check (retrieval_method in ('json_ld','meta','html','legacy_adapter'))
);

create index if not exists property_extraction_evidence_run_idx on public.property_extraction_evidence(run_id);

create table if not exists public.property_extraction_conflicts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.property_extraction_runs(id) on delete cascade,
  field text not null,
  values_json jsonb not null,
  resolution text not null default 'unresolved',
  created_at timestamptz not null default now(),
  constraint property_extraction_conflicts_resolution_check check (resolution in ('unresolved','page_evidence','structured_data','source_adapter'))
);

create index if not exists property_extraction_conflicts_run_idx on public.property_extraction_conflicts(run_id);

alter table public.property_extraction_runs enable row level security;
alter table public.property_extraction_evidence enable row level security;
alter table public.property_extraction_conflicts enable row level security;

-- No anonymous/authenticated browser policies are intentionally created.
-- The server-side service-role client is the only application writer/reader.
