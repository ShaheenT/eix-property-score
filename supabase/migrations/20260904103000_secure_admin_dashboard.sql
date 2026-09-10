-- EiX Property Score — secure admin dashboard access

create table if not exists public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "admin_users_self_read" on public.admin_users;

create policy "admin_users_self_read"
on public.admin_users
for select
to authenticated
using (id = auth.uid());

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "admins_read_customers" on public.customers;

create policy "admins_read_customers"
on public.customers
for select
to authenticated
using (public.is_admin());

drop policy if exists "admins_read_submissions" on public.property_submissions;

create policy "admins_read_submissions"
on public.property_submissions
for select
to authenticated
using (public.is_admin());

drop policy if exists "admins_read_payments" on public.payments;

create policy "admins_read_payments"
on public.payments
for select
to authenticated
using (public.is_admin());

drop policy if exists "admins_read_reports" on public.reports;

create policy "admins_read_reports"
on public.reports
for select
to authenticated
using (public.is_admin());
