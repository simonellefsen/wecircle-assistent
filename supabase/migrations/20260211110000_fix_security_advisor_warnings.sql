-- Fix Supabase Security Advisor warnings:
-- 1) Function search_path mutable
-- 2) Extension in public schema

create schema if not exists extensions;

do $$
begin
  if exists (
    select 1
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'citext'
      and n.nspname = 'public'
  ) then
    alter extension citext set schema extensions;
  end if;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, metadata)
  values (new.id, new.email, coalesce(new.raw_user_meta_data, '{}'::jsonb))
  on conflict (id) do update set email = excluded.email;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.user_plan_assignments (user_id, status)
  values (new.id, 'trialing')
  on conflict (user_id) do nothing;

  return new;
end;
$$;
