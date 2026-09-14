create table if not exists public.property_intelligence_provider_cache (
  cache_key text primary key,
  provider text not null,
  query_hash text not null,
  response_json jsonb not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null,
  status text not null default 'available' check (status in ('available','partial','unknown'))
);

create index if not exists property_intelligence_provider_cache_expiry_idx
  on public.property_intelligence_provider_cache (expires_at);

create index if not exists property_intelligence_provider_cache_provider_query_idx
  on public.property_intelligence_provider_cache (provider, query_hash);

alter table public.property_intelligence_provider_cache enable row level security;

comment on table public.property_intelligence_provider_cache is
  'Server-side cache for bounded intelligence-provider responses. Never expose directly to clients.';

create policy "service role manages intelligence provider cache"
  on public.property_intelligence_provider_cache
  for all
  to service_role
  using (true)
  with check (true);
