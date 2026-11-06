-- Trigger Rewards: secure real-reward delivery foundation
-- Apply in Supabase SQL Editor after reviewing existing project tables.
begin;

create extension if not exists pgcrypto;

create table if not exists public.trg_reward_inventory (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  reward_key text not null,
  reward_name text not null,
  region text not null default 'AS',
  secret_payload text not null,
  status text not null default 'available'
    check (status in ('available','reserved','delivered','void')),
  reserved_for_discord_id text,
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  unique (guild_id, reward_key, id)
);

create table if not exists public.trg_reward_claims (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  discord_user_id text not null,
  discord_username text,
  reward_key text not null,
  reward_name text not null,
  status text not null default 'pending'
    check (status in ('pending','approved','delivery_pending','delivered','rejected','delivery_failed')),
  inventory_id uuid references public.trg_reward_inventory(id),
  delivery_channel text not null default 'both'
    check (delivery_channel in ('discord','website','both')),
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  delivered_at timestamptz,
  approved_by text,
  unique (guild_id, discord_user_id, reward_key, id)
);

create table if not exists public.trg_reward_deliveries (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.trg_reward_claims(id) on delete restrict,
  discord_user_id text not null,
  status text not null default 'queued'
    check (status in ('queued','sending','sent','failed')),
  discord_message_id text,
  error_code text,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (claim_id)
);

create index if not exists trg_claims_pending_idx
  on public.trg_reward_claims (guild_id, status, requested_at desc);
create index if not exists trg_inventory_available_idx
  on public.trg_reward_inventory (guild_id, reward_key, status);

-- Keep all inventory and claim data server-only. Access via trusted bot/API using service role.
alter table public.trg_reward_inventory enable row level security;
alter table public.trg_reward_claims enable row level security;
alter table public.trg_reward_deliveries enable row level security;

revoke all on public.trg_reward_inventory from anon, authenticated;
revoke all on public.trg_reward_claims from anon, authenticated;
revoke all on public.trg_reward_deliveries from anon, authenticated;

commit;
