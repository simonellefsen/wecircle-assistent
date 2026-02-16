-- Extend auditing with auth lifecycle events:
-- - user_signed_up
-- - email_confirmed

alter table public.audit_events
  drop constraint if exists audit_events_event_type_check;

alter table public.audit_events
  add constraint audit_events_event_type_check
  check (event_type in ('item_created', 'item_deleted', 'user_signed_up', 'email_confirmed'));

create or replace function public.audit_auth_user_signed_up()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_events (user_id, event_type, entity_type, entity_id, metadata)
  values (
    new.id,
    'user_signed_up',
    'auth_user',
    new.id::text,
    jsonb_build_object('email', new.email)
  );
  return new;
exception
  when others then
    -- Auditing must never block auth user creation.
    return new;
end;
$$;

create or replace function public.audit_auth_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    insert into public.audit_events (user_id, event_type, entity_type, entity_id, metadata)
    values (
      new.id,
      'email_confirmed',
      'auth_user',
      new.id::text,
      jsonb_build_object(
        'email', new.email,
        'confirmed_at', new.email_confirmed_at
      )
    );
  end if;
  return new;
exception
  when others then
    -- Auditing must never block auth updates.
    return new;
end;
$$;

drop trigger if exists z_audit_auth_user_created on auth.users;
create trigger z_audit_auth_user_created
after insert on auth.users
for each row execute procedure public.audit_auth_user_signed_up();

drop trigger if exists z_audit_auth_email_confirmed on auth.users;
create trigger z_audit_auth_email_confirmed
after update of email_confirmed_at on auth.users
for each row execute procedure public.audit_auth_email_confirmed();
