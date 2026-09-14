-- EiXPropScore Property Intelligence OS persistence model.
-- Writes are performed server-side with the Supabase service-role client.

create table if not exists public.property_intelligence_runs (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references public.property_submissions(id) on delete cascade,
  extraction_run_id uuid references public.property_extraction_runs(id) on delete set null,
  engine_version text not null,
  trust_index smallint not null default 0 check (trust_index between 0 and 100),
  status text not null default 'completed' check (status in ('queued','processing','completed','partial','failed')),
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists property_intelligence_runs_submission_idx
  on public.property_intelligence_runs(submission_id, created_at desc);

create table if not exists public.property_intelligence_signals (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.property_intelligence_runs(id) on delete cascade,
  engine text not null,
  signal_key text not null,
  label text not null,
  value_json jsonb,
  status text not null check (status in ('available','partial','unknown','requires_confirmation')),
  confidence smallint not null default 0 check (confidence between 0 and 100),
  created_at timestamptz not null default now()
);

create index if not exists property_intelligence_signals_run_idx
  on public.property_intelligence_signals(run_id);

create table if not exists public.property_intelligence_evidence (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid not null references public.property_intelligence_signals(id) on delete cascade,
  evidence_key text not null,
  claim text not null,
  evidence_type text not null check (evidence_type in ('verified','calculated','proximity','confirmation_required')),
  source text not null,
  source_url text,
  confidence smallint not null default 0 check (confidence between 0 and 100),
  retrieved_at timestamptz not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists property_intelligence_evidence_signal_idx
  on public.property_intelligence_evidence(signal_id);

create table if not exists public.property_risk_signals (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.property_intelligence_runs(id) on delete cascade,
  risk_key text not null,
  severity text not null check (severity in ('critical','high','medium','low','info')),
  title text not null,
  description text not null,
  evidence_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists property_risk_signals_run_idx
  on public.property_risk_signals(run_id, severity);

alter table public.property_intelligence_runs enable row level security;
alter table public.property_intelligence_signals enable row level security;
alter table public.property_intelligence_evidence enable row level security;
alter table public.property_risk_signals enable row level security;
