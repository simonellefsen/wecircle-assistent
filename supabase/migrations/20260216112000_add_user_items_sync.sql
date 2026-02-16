-- Persist user item history in Supabase so sessions across browsers/devices share data.

create table if not exists public.user_items (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id text not null,
  item_timestamp bigint not null default 0,
  item_data jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, item_id)
);

create index if not exists idx_user_items_user_timestamp
  on public.user_items (user_id, item_timestamp desc);

drop trigger if exists set_user_items_updated_at on public.user_items;
create trigger set_user_items_updated_at
before update on public.user_items
for each row execute procedure public.set_updated_at();

alter table public.user_items enable row level security;

drop policy if exists "Users manage their items" on public.user_items;
create policy "Users manage their items"
  on public.user_items
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
