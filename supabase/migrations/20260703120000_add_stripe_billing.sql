-- Stripe billing: customer linkage, a subscriptions table, and a credits
-- ledger the stripe-webhook Edge Function writes to for idempotent,
-- auditable credit grants (unique on stripe_event_id so a retried webhook
-- delivery can't double-grant credits).

alter table public.profiles
  add column if not exists stripe_customer_id text unique;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_subscription_id text not null unique,
  plan_id text not null check (plan_id in ('weekly', 'monthly', 'yearly')),
  status text not null check (status in ('active', 'past_due', 'canceled')),
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "Users can view their own subscriptions"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);

create table if not exists public.credits_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null,
  reason text not null,
  stripe_event_id text unique,
  created_at timestamptz not null default now()
);

alter table public.credits_ledger enable row level security;

create policy "Users can view their own credits ledger"
  on public.credits_ledger for select
  using (auth.uid() = user_id);

create index if not exists credits_ledger_user_id_idx on public.credits_ledger (user_id);
