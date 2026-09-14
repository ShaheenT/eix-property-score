create table if not exists public.property_intelligence_provider_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text primary key,
  provider text not null,
  operation text not null,
  query_hash text not null,
  query_json jsonb,
  response_json jsonb not null,
  status text not null default 'available' check (status in ('available', 'success', 'empty', 'error')),
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, operation, query_hash)
);

create index if not exists property_intelligence_provider_cache_expires_idx
  on public.property_intelligence_provider_cache (expires_at);

create index if not exists property_intelligence_provider_cache_provider_operation_idx
  on public.property_intelligence_provider_cache (provider, operation);

alter table public.property_intelligence_provider_cache enable row level security;

revoke all on table public.property_intelligence_provider_cache from anon, authenticated;

drop policy if exists "service role manages intelligence provider cache" on public.property_intelligence_provider_cache;
create policy "service role manages intelligence provider cache"
  on public.property_intelligence_provider_cache
  for all
  to service_role
  using (true)
  with check (true);

create or replace function public.touch_property_intelligence_provider_cache_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists property_intelligence_provider_cache_touch_updated_at
  on public.property_intelligence_provider_cache;

create trigger property_intelligence_provider_cache_touch_updated_at
before update on public.property_intelligence_provider_cache
for each row execute function public.touch_property_intelligence_provider_cache_updated_at();
