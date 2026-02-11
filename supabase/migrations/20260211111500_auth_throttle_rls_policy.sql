-- Resolve RLS-without-policies advisory for auth_throttle.
-- This table is backend-only; allow only service_role access.

alter table if exists public.auth_throttle enable row level security;

drop policy if exists "Service role manages auth throttle" on public.auth_throttle;
create policy "Service role manages auth throttle"
  on public.auth_throttle
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
