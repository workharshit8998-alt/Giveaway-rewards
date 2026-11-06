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
  initiated_by_discord_id text,
  error_code text,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (claim_id)
);

alter table public.trg_reward_deliveries
  add column if not exists initiated_by_discord_id text;

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


-- A ticket can create only one real-delivery claim, even if an invite-log embed is replayed.
alter table public.trg_reward_claims
  add column if not exists source_ticket_channel_id text;
create unique index if not exists trg_claims_source_ticket_uidx
  on public.trg_reward_claims (source_ticket_channel_id)
  where source_ticket_channel_id is not null;

-- Reserve exactly one matching stock item and move the claim into delivery_pending.
-- The function is callable only with the bot's service-role key.
drop function if exists public.trg_reserve_reward_delivery(uuid, text);
create or replace function public.trg_reserve_reward_delivery(
  p_claim_id uuid,
  p_guild_id text,
  p_actor_discord_id text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_claim public.trg_reward_claims%rowtype;
  v_stock public.trg_reward_inventory%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service role required';
  end if;

  select * into v_claim
  from public.trg_reward_claims
  where id = p_claim_id and guild_id = p_guild_id
    and status in ('pending','delivery_failed')
  for update;

  if not found then
    raise exception 'claim is not pending or retryable';
  end if;

  select * into v_stock
  from public.trg_reward_inventory
  where guild_id = p_guild_id
    and reward_key = v_claim.reward_key
    and status = 'available'
  order by created_at, id
  for update skip locked
  limit 1;

  if not found then
    raise exception 'no matching reward stock is available';
  end if;

  update public.trg_reward_inventory
  set status = 'reserved',
      reserved_for_discord_id = v_claim.discord_user_id
  where id = v_stock.id;

  update public.trg_reward_claims
  set status = 'delivery_pending',
      inventory_id = v_stock.id,
      approved_at = coalesce(approved_at, now())
  where id = v_claim.id;

  insert into public.trg_reward_deliveries
    (claim_id, discord_user_id, status, attempts, error_code, sent_at, discord_message_id, initiated_by_discord_id)
  values
    (v_claim.id, v_claim.discord_user_id, 'sending', 1, null, null, null, p_actor_discord_id)
  on conflict (claim_id) do update
    set status = 'sending',
        attempts = public.trg_reward_deliveries.attempts + 1,
        error_code = null,
        sent_at = null,
        discord_message_id = null,
        initiated_by_discord_id = p_actor_discord_id;

  return jsonb_build_object(
    'inventory_id', v_stock.id,
    'discord_user_id', v_claim.discord_user_id,
    'reward_name', v_claim.reward_name,
    'secret_payload', v_stock.secret_payload,
    'source_ticket_channel_id', v_claim.source_ticket_channel_id
  );
end;
$$;

-- Finalize a delivery. Failed DMs release stock so an administrator can retry.
create or replace function public.trg_finish_reward_delivery(
  p_claim_id uuid,
  p_inventory_id uuid,
  p_message_id text,
  p_success boolean,
  p_error text default null
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_delivery public.trg_reward_deliveries%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service role required';
  end if;

  select * into v_delivery
  from public.trg_reward_deliveries
  where claim_id = p_claim_id and status = 'sending'
  for update;

  if not found then
    raise exception 'delivery is not in sending state';
  end if;

  if p_success then
    update public.trg_reward_inventory
      set status = 'delivered', delivered_at = now()
      where id = p_inventory_id and status = 'reserved';
    if not found then raise exception 'reserved inventory item not found'; end if;

    update public.trg_reward_claims
      set status = 'delivered', delivered_at = now()
      where id = p_claim_id and inventory_id = p_inventory_id;

    update public.trg_reward_deliveries
      set status = 'sent', discord_message_id = p_message_id,
          sent_at = now(), error_code = null
      where claim_id = p_claim_id;
  else
    update public.trg_reward_inventory
      set status = 'available', reserved_for_discord_id = null
      where id = p_inventory_id and status = 'reserved';

    update public.trg_reward_claims
      set status = 'delivery_failed'
      where id = p_claim_id and inventory_id = p_inventory_id;

    update public.trg_reward_deliveries
      set status = 'failed', error_code = left(coalesce(p_error, 'delivery_failed'), 80)
      where claim_id = p_claim_id;
  end if;

  return true;
end;
$$;

revoke all on function public.trg_reserve_reward_delivery(uuid, text, text) from public, anon, authenticated;
revoke all on function public.trg_finish_reward_delivery(uuid, uuid, text, boolean, text) from public, anon, authenticated;
grant execute on function public.trg_reserve_reward_delivery(uuid, text, text) to service_role;
grant execute on function public.trg_finish_reward_delivery(uuid, uuid, text, boolean, text) to service_role;


commit;
