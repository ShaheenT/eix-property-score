create extension if not exists pgcrypto;

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  fingerprint text unique not null,
  normalized_address text,
  suburb text,
  city text,
  province text,
  country text default 'South Africa',
  property_type text,
  bedrooms integer,
  bathrooms numeric,
  parking integer,
  floor_area_m2 numeric,
  erf_area_m2 numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.property_sources (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  source_type text not null,
  source_url text not null,
  title text,
  asking_price numeric,
  raw_content_hash text,
  observed_at timestamptz not null default now(),
  unique(property_id, source_url)
);

create table if not exists public.property_evidence (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  evidence_type text not null,
  source text not null,
  value_json jsonb not null,
  confidence numeric not null check (confidence >= 0 and confidence <= 1),
  observed_at timestamptz not null default now(),
  expires_at timestamptz,
  notes text
);

create table if not exists public.property_comparables (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  comparable_label text not null,
  price numeric,
  relevance numeric not null check (relevance >= 0 and relevance <= 1),
  rationale text,
  created_at timestamptz not null default now()
);

create table if not exists public.property_analyses (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  score integer not null check (score >= 0 and score <= 100),
  confidence integer not null check (confidence >= 0 and confidence <= 100),
  verdict text not null check (verdict in ('BUY','NEGOTIATE','INVESTIGATE','AVOID')),
  price_signal text,
  price_low numeric,
  price_high numeric,
  negotiation_opening numeric,
  negotiation_target numeric,
  negotiation_maximum numeric,
  components_json jsonb not null default '[]'::jsonb,
  actions_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists property_evidence_property_idx on public.property_evidence(property_id, observed_at desc);
create index if not exists property_analysis_property_idx on public.property_analyses(property_id, created_at desc);

alter table public.properties enable row level security;
alter table public.property_sources enable row level security;
alter table public.property_evidence enable row level security;
alter table public.property_comparables enable row level security;
alter table public.property_analyses enable row level security;

-- Public clients receive no direct table access. Server-side service-role operations own ingestion/analysis.
-- Add authenticated policies later for user-owned report history once account ownership is enabled.
