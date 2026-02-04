-- Extend user_settings to capture AI prompt overrides and usage totals -------
alter table public.user_settings
  add column if not exists custom_prompt text,
  add column if not exists ai_usage_runs integer not null default 0,
  add column if not exists ai_prompt_tokens bigint not null default 0,
  add column if not exists ai_completion_tokens bigint not null default 0,
  add column if not exists ai_total_tokens bigint not null default 0,
  add column if not exists ai_cost_usd numeric(14,4) not null default 0;

-- Normalize stored percentages to fractional values (0.25 == 25%)
update public.user_settings
  set commission_percent = commission_percent / 100
  where commission_percent > 1;

update public.user_settings
  set discount_percent = discount_percent / 100
  where discount_percent > 1;

alter table public.user_settings
  alter column commission_percent type numeric(6,4),
  alter column discount_percent type numeric(6,4),
  alter column commission_percent set default 0.2,
  alter column discount_percent set default 0;

create index if not exists idx_user_settings_user_id on public.user_settings(user_id);
