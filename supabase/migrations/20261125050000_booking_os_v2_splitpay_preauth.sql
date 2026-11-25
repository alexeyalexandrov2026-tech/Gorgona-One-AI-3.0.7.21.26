begin;
-- Booking OS 2.0 (Stage 3B Step A):
-- 1. Real Group Split-Pay by individual share links (private.payment_quote_shares)
-- 2. Separate Refundable Security Deposit Pre-Auth (capture_method = manual) + 1-click Release Hold
-- 3. Transparent All-In Line-Item Breakdown (line_items jsonb) + NOAA Weather Shield
-- 4. 24-Hour Price Lock refundable hold (price_lock_cents)
-- Strictly additive; all private tables remain locked to service_role only.

alter table private.payment_quotes
  add column if not exists line_items jsonb not null default '[]'::jsonb,
  add column if not exists deposit_cents integer not null default 0 check (deposit_cents >= 0 and deposit_cents <= 50000000),
  add column if not exists deposit_status text not null default 'none' check (deposit_status in ('none', 'pending', 'held', 'released', 'captured')),
  add column if not exists deposit_payment_intent_id text,
  add column if not exists deposit_held_at timestamptz,
  add column if not exists deposit_released_at timestamptz,
  add column if not exists price_lock_cents integer not null default 0 check (price_lock_cents >= 0 and price_lock_cents <= 5000000),
  add column if not exists price_lock_status text not null default 'none' check (price_lock_status in ('none', 'pending', 'locked', 'applied', 'released')),
  add column if not exists price_lock_payment_intent_id text,
  add column if not exists price_lock_until timestamptz,
  add column if not exists weather_shield_enabled boolean not null default true,
  add column if not exists split_ways integer not null default 1 check (split_ways between 1 and 12);

create table if not exists private.payment_quote_shares (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references private.payment_quotes(id) on delete cascade,
  share_index integer not null check (share_index between 1 and 12),
  share_token text not null unique,
  amount_cents integer not null check (amount_cents >= 100 and amount_cents <= 50000000),
  status text not null default 'open' check (status in ('open', 'paid', 'cancelled')),
  payer_name text,
  payer_email text,
  payment_provider text check (payment_provider in ('stripe', 'paypal', 'manual')),
  provider_session_id text,
  provider_payment_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quote_id, share_index)
);

create index if not exists payment_quote_shares_quote_idx
  on private.payment_quote_shares (quote_id, share_index);

alter table private.payment_quote_shares enable row level security;
revoke all on private.payment_quote_shares from public, anon, authenticated;
grant all on private.payment_quote_shares to service_role;

create or replace function private.payment_quote_shares_json(p_quote_id uuid)
returns jsonb language sql security invoker set search_path = '' as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'shareIndex', s.share_index,
        'shareToken', s.share_token,
        'amountCents', s.amount_cents,
        'status', s.status,
        'payerName', s.payer_name,
        'payerEmail', s.payer_email,
        'paymentProvider', s.payment_provider,
        'providerSessionId', s.provider_session_id,
        'providerPaymentId', case when s.status = 'paid' then s.provider_payment_id else null end,
        'paidAt', s.paid_at
      )
      order by s.share_index asc
    ),
    '[]'::jsonb
  )
  from private.payment_quote_shares s
  where s.quote_id = p_quote_id;
$$;

revoke all on function private.payment_quote_shares_json(uuid) from public, anon, authenticated;
grant execute on function private.payment_quote_shares_json(uuid) to service_role;

create or replace function public.payment_quote_create(
  p_actor uuid,
  p_key uuid,
  p_input jsonb
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  actor_role text;
  existing private.payment_quotes;
  created private.payment_quotes;
  b_id uuid;
  amt integer := coalesce((p_input->>'amountCents')::integer, 0);
  exp_hours integer := coalesce((p_input->>'expiresHours')::integer, 24);
  v_kind text := btrim(coalesce(p_input->>'kind',''));
  v_token text := btrim(coalesce(p_input->>'publicToken',''));
  v_ref text := btrim(coalesce(p_input->>'referenceCode',''));
  v_line_items jsonb := case when jsonb_typeof(p_input->'lineItems') = 'array' then p_input->'lineItems' else '[]'::jsonb end;
  v_deposit_cents integer := greatest(0, coalesce((p_input->>'depositCents')::integer, 0));
  v_price_lock_cents integer := greatest(0, coalesce((p_input->>'priceLockCents')::integer, 0));
  v_weather_shield boolean := coalesce((p_input->>'weatherShieldEnabled')::boolean, true);
  v_split_ways integer := coalesce((p_input->>'splitWays')::integer, 1);
  v_share_tokens jsonb := case when jsonb_typeof(p_input->'shareTokens') = 'array' then p_input->'shareTokens' else '[]'::jsonb end;
  v_base_share integer;
  v_rem integer;
  v_share_amt integer;
  v_share_tok text;
  i integer;
begin
  if p_actor is null or p_key is null then
    return jsonb_build_object('error','invalid');
  end if;
  select role into actor_role from public.profiles where id = p_actor;
  if actor_role is distinct from 'admin' then
    return jsonb_build_object('error','forbidden');
  end if;

  select * into existing from private.payment_quotes where request_key = p_key;
  if found then
    return jsonb_build_object(
      'success', true,
      'replayed', true,
      'quote', jsonb_build_object(
        'id', existing.id,
        'bookingId', existing.booking_id,
        'publicToken', existing.public_token,
        'referenceCode', existing.reference_code,
        'status', existing.status,
        'itemTitle', existing.item_title,
        'kind', existing.kind,
        'supplierName', existing.supplier_name,
        'serviceDates', existing.service_dates,
        'cancellationPolicy', existing.cancellation_policy,
        'notes', existing.notes,
        'amountCents', existing.amount_cents,
        'currency', existing.currency,
        'clientName', existing.client_name,
        'clientEmail', existing.client_email,
        'expiresAt', existing.expires_at,
        'createdAt', existing.created_at,
        'lineItems', existing.line_items,
        'depositCents', existing.deposit_cents,
        'depositStatus', existing.deposit_status,
        'priceLockCents', existing.price_lock_cents,
        'priceLockStatus', existing.price_lock_status,
        'priceLockUntil', existing.price_lock_until,
        'weatherShieldEnabled', existing.weather_shield_enabled,
        'splitWays', existing.split_ways,
        'shares', private.payment_quote_shares_json(existing.id)
      )
    );
  end if;

  if v_kind not in ('car','yacht','stay','experience','dining','nightlife','jet')
     or amt < 100 or amt > 50000000
     or exp_hours < 1 or exp_hours > 168
     or v_deposit_cents < 0 or v_deposit_cents > 50000000
     or v_price_lock_cents < 0 or v_price_lock_cents > 5000000
     or v_split_ways < 1 or v_split_ways > 12
     or length(v_token) not between 32 and 64
     or length(v_ref) not between 6 and 24
     or length(btrim(coalesce(p_input->>'itemTitle',''))) not between 1 and 240
     or length(btrim(coalesce(p_input->>'supplierName',''))) not between 1 and 200
     or length(btrim(coalesce(p_input->>'serviceDates',''))) not between 1 and 300
     or length(btrim(coalesce(p_input->>'cancellationPolicy',''))) not between 1 and 1000
     or length(btrim(coalesce(p_input->>'clientName',''))) not between 1 and 120
     or length(btrim(coalesce(p_input->>'clientEmail',''))) not between 3 and 254 then
    return jsonb_build_object('error','invalid');
  end if;

  if v_split_ways > 1 then
    if (amt / v_split_ways) < 100 or jsonb_array_length(v_share_tokens) <> v_split_ways then
      return jsonb_build_object('error','invalid');
    end if;
  end if;

  if nullif(btrim(coalesce(p_input->>'bookingId','')),'') is not null then
    begin
      b_id := (p_input->>'bookingId')::uuid;
    exception when others then
      return jsonb_build_object('error','invalid');
    end;
    if not exists (select 1 from public.bookings where id = b_id) then
      return jsonb_build_object('error','not_found');
    end if;
  end if;

  insert into private.payment_quotes (
    booking_id, created_by, request_key, public_token, reference_code,
    item_title, kind, supplier_name, service_dates, cancellation_policy,
    notes, amount_cents, currency, client_name, client_email, expires_at,
    line_items, deposit_cents, deposit_status, price_lock_cents, price_lock_status,
    weather_shield_enabled, split_ways
  ) values (
    b_id, p_actor, p_key, v_token, v_ref,
    btrim(p_input->>'itemTitle'), v_kind, btrim(p_input->>'supplierName'),
    btrim(p_input->>'serviceDates'), btrim(p_input->>'cancellationPolicy'),
    coalesce(btrim(p_input->>'notes'), ''), amt, 'USD',
    btrim(p_input->>'clientName'), lower(btrim(p_input->>'clientEmail')),
    now() + make_interval(hours => exp_hours),
    v_line_items,
    v_deposit_cents,
    case when v_deposit_cents > 0 then 'pending' else 'none' end,
    v_price_lock_cents,
    case when v_price_lock_cents > 0 then 'pending' else 'none' end,
    v_weather_shield,
    v_split_ways
  ) returning * into created;

  if v_split_ways > 1 then
    v_base_share := amt / v_split_ways;
    v_rem := amt - (v_base_share * v_split_ways);
    for i in 1..v_split_ways loop
      v_share_amt := v_base_share + case when i <= v_rem then 1 else 0 end;
      v_share_tok := btrim(coalesce(v_share_tokens->>(i - 1), ''));
      if length(v_share_tok) not between 20 and 64 then
        raise exception 'invalid share token';
      end if;
      insert into private.payment_quote_shares (
        quote_id, share_index, share_token, amount_cents
      ) values (
        created.id, i, v_share_tok, v_share_amt
      );
    end loop;
  end if;

  return jsonb_build_object(
    'success', true,
    'replayed', false,
    'quote', jsonb_build_object(
      'id', created.id,
      'bookingId', created.booking_id,
      'publicToken', created.public_token,
      'referenceCode', created.reference_code,
      'status', created.status,
      'itemTitle', created.item_title,
      'kind', created.kind,
      'supplierName', created.supplier_name,
      'serviceDates', created.service_dates,
      'cancellationPolicy', created.cancellation_policy,
      'notes', created.notes,
      'amountCents', created.amount_cents,
      'currency', created.currency,
      'clientName', created.client_name,
      'clientEmail', created.client_email,
      'expiresAt', created.expires_at,
      'createdAt', created.created_at,
      'lineItems', created.line_items,
      'depositCents', created.deposit_cents,
      'depositStatus', created.deposit_status,
      'priceLockCents', created.price_lock_cents,
      'priceLockStatus', created.price_lock_status,
      'priceLockUntil', created.price_lock_until,
      'weatherShieldEnabled', created.weather_shield_enabled,
      'splitWays', created.split_ways,
      'shares', private.payment_quote_shares_json(created.id)
    )
  );
end $$;

create or replace function public.payment_quote_list_for_booking(
  p_actor uuid,
  p_booking uuid
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  actor_role text;
  rows jsonb;
begin
  select role into actor_role from public.profiles where id = p_actor;
  if actor_role is distinct from 'admin' then
    return jsonb_build_object('error','forbidden');
  end if;
  if p_booking is null then
    return jsonb_build_object('error','invalid');
  end if;

  update private.payment_quotes
  set status = 'expired', updated_at = now()
  where booking_id = p_booking and status in ('open','signed') and expires_at <= now();

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', q.id,
    'bookingId', q.booking_id,
    'publicToken', q.public_token,
    'referenceCode', q.reference_code,
    'status', q.status,
    'itemTitle', q.item_title,
    'kind', q.kind,
    'supplierName', q.supplier_name,
    'serviceDates', q.service_dates,
    'cancellationPolicy', q.cancellation_policy,
    'notes', q.notes,
    'amountCents', q.amount_cents,
    'currency', q.currency,
    'clientName', q.client_name,
    'clientEmail', q.client_email,
    'expiresAt', q.expires_at,
    'esignFullName', q.esign_full_name,
    'esignSignedAt', q.esign_signed_at,
    'paymentProvider', q.payment_provider,
    'providerPaymentId', q.provider_payment_id,
    'paidAt', q.paid_at,
    'createdAt', q.created_at,
    'lineItems', q.line_items,
    'depositCents', q.deposit_cents,
    'depositStatus', q.deposit_status,
    'depositPaymentIntentId', q.deposit_payment_intent_id,
    'depositHeldAt', q.deposit_held_at,
    'depositReleasedAt', q.deposit_released_at,
    'priceLockCents', q.price_lock_cents,
    'priceLockStatus', q.price_lock_status,
    'priceLockPaymentIntentId', q.price_lock_payment_intent_id,
    'priceLockUntil', q.price_lock_until,
    'weatherShieldEnabled', q.weather_shield_enabled,
    'splitWays', q.split_ways,
    'paidAmountCents', coalesce((select sum(s.amount_cents) from private.payment_quote_shares s where s.quote_id = q.id and s.status = 'paid'), case when q.status = 'paid' then q.amount_cents else 0 end),
    'paidSharesCount', coalesce((select count(*)::integer from private.payment_quote_shares s where s.quote_id = q.id and s.status = 'paid'), 0),
    'shares', private.payment_quote_shares_json(q.id)
  ) order by q.created_at desc), '[]'::jsonb)
  into rows
  from private.payment_quotes q
  where q.booking_id = p_booking;

  return jsonb_build_object('success', true, 'quotes', rows);
end $$;

create or replace function public.payment_quote_get_by_token(
  p_token text
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  q private.payment_quotes;
  v_paid_amount integer := 0;
  v_paid_shares integer := 0;
begin
  if coalesce(p_token,'') !~ '^[A-Za-z0-9_-]{32,64}$' then
    return jsonb_build_object('error','not_found');
  end if;

  select * into q from private.payment_quotes where public_token = p_token;
  if not found then
    return jsonb_build_object('error','not_found');
  end if;

  if q.status in ('open','signed') and q.expires_at <= now() then
    update private.payment_quotes set status = 'expired', updated_at = now()
    where id = q.id and status in ('open','signed')
    returning * into q;
  end if;

  if q.split_ways > 1 then
    select coalesce(sum(amount_cents), 0)::integer, count(*)::integer
    into v_paid_amount, v_paid_shares
    from private.payment_quote_shares
    where quote_id = q.id and status = 'paid';
  elsif q.status = 'paid' then
    v_paid_amount := q.amount_cents;
  end if;

  return jsonb_build_object(
    'success', true,
    'quote', jsonb_build_object(
      'id', q.id,
      'bookingId', q.booking_id,
      'referenceCode', q.reference_code,
      'status', q.status,
      'itemTitle', q.item_title,
      'kind', q.kind,
      'supplierName', q.supplier_name,
      'serviceDates', q.service_dates,
      'cancellationPolicy', q.cancellation_policy,
      'notes', q.notes,
      'amountCents', q.amount_cents,
      'currency', q.currency,
      'clientName', q.client_name,
      'clientEmail', q.client_email,
      'expiresAt', q.expires_at,
      'esignFullName', q.esign_full_name,
      'esignSignedAt', q.esign_signed_at,
      'esignTermsVersion', q.esign_terms_version,
      'esignDocumentHash', q.esign_document_hash,
      'paymentProvider', q.payment_provider,
      'providerSessionId', q.provider_session_id,
      'providerPaymentId', q.provider_payment_id,
      'paidAt', q.paid_at,
      'createdAt', q.created_at,
      'lineItems', q.line_items,
      'depositCents', q.deposit_cents,
      'depositStatus', q.deposit_status,
      'depositPaymentIntentId', q.deposit_payment_intent_id,
      'depositHeldAt', q.deposit_held_at,
      'depositReleasedAt', q.deposit_released_at,
      'priceLockCents', q.price_lock_cents,
      'priceLockStatus', q.price_lock_status,
      'priceLockPaymentIntentId', q.price_lock_payment_intent_id,
      'priceLockUntil', q.price_lock_until,
      'weatherShieldEnabled', q.weather_shield_enabled,
      'splitWays', q.split_ways,
      'paidAmountCents', v_paid_amount,
      'paidSharesCount', v_paid_shares,
      'shares', private.payment_quote_shares_json(q.id)
    )
  );
end $$;

create or replace function public.payment_quote_attach_share_session(
  p_token text,
  p_share_token text,
  p_provider text,
  p_session_id text,
  p_payer_name text default null,
  p_payer_email text default null
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  q private.payment_quotes;
  s private.payment_quote_shares;
begin
  if coalesce(p_token,'') !~ '^[A-Za-z0-9_-]{32,64}$'
     or coalesce(p_share_token,'') !~ '^[A-Za-z0-9_-]{20,64}$'
     or p_provider not in ('stripe','paypal')
     or length(btrim(coalesce(p_session_id,''))) not between 4 and 255 then
    return jsonb_build_object('error','invalid');
  end if;

  select * into q from private.payment_quotes where public_token = p_token for update;
  if not found then return jsonb_build_object('error','not_found'); end if;
  if q.status in ('open','signed') and q.expires_at <= now() then
    update private.payment_quotes set status = 'expired', updated_at = now() where id = q.id;
    return jsonb_build_object('error','conflict');
  end if;
  if q.status <> 'signed' or q.esign_signed_at is null or q.esign_document_hash is null then
    return jsonb_build_object('error','conflict');
  end if;

  select * into s from private.payment_quote_shares
  where quote_id = q.id and share_token = p_share_token for update;
  if not found then return jsonb_build_object('error','not_found'); end if;
  if s.status <> 'open' then return jsonb_build_object('error','conflict'); end if;

  update private.payment_quote_shares
  set
    payment_provider = p_provider,
    provider_session_id = btrim(p_session_id),
    payer_name = coalesce(nullif(btrim(coalesce(p_payer_name,'')),''), s.payer_name),
    payer_email = coalesce(nullif(lower(btrim(coalesce(p_payer_email,''))),''), s.payer_email),
    updated_at = now()
  where id = s.id;

  return jsonb_build_object('success', true, 'shareIndex', s.share_index);
end $$;

create or replace function public.payment_quote_mark_share_paid(
  p_quote_id uuid,
  p_share_token text,
  p_provider text,
  p_session_id text,
  p_payment_id text,
  p_payer_name text default null,
  p_payer_email text default null
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  q private.payment_quotes;
  s private.payment_quote_shares;
  v_total_shares integer := 0;
  v_paid_shares integer := 0;
  v_all_paid boolean := false;
  e uuid;
begin
  if p_quote_id is null
     or coalesce(p_share_token,'') !~ '^[A-Za-z0-9_-]{20,64}$'
     or p_provider not in ('stripe','paypal','manual')
     or length(btrim(coalesce(p_payment_id,''))) not between 3 and 255 then
    return jsonb_build_object('error','invalid');
  end if;

  select * into q from private.payment_quotes where id = p_quote_id for update;
  if not found then return jsonb_build_object('error','not_found'); end if;
  if q.status = 'cancelled' or q.esign_signed_at is null then
    return jsonb_build_object('error','conflict');
  end if;

  select * into s from private.payment_quote_shares
  where quote_id = q.id and share_token = p_share_token for update;
  if not found then return jsonb_build_object('error','not_found'); end if;

  if s.status = 'paid' then
    select count(*)::integer, count(*) filter (where status = 'paid')::integer
    into v_total_shares, v_paid_shares
    from private.payment_quote_shares where quote_id = q.id;
    return jsonb_build_object(
      'success', true,
      'replayed', true,
      'shareIndex', s.share_index,
      'paidSharesCount', v_paid_shares,
      'totalShares', v_total_shares,
      'allPaid', v_paid_shares >= v_total_shares,
      'quoteStatus', q.status
    );
  end if;

  update private.payment_quote_shares
  set
    status = 'paid',
    payment_provider = p_provider,
    provider_session_id = coalesce(nullif(btrim(coalesce(p_session_id,'')),''), s.provider_session_id),
    provider_payment_id = btrim(p_payment_id),
    payer_name = coalesce(nullif(btrim(coalesce(p_payer_name,'')),''), s.payer_name),
    payer_email = coalesce(nullif(lower(btrim(coalesce(p_payer_email,''))),''), s.payer_email),
    paid_at = now(),
    updated_at = now()
  where id = s.id;

  select count(*)::integer, count(*) filter (where status = 'paid')::integer
  into v_total_shares, v_paid_shares
  from private.payment_quote_shares where quote_id = q.id;

  v_all_paid := (v_total_shares > 0 and v_paid_shares >= v_total_shares);

  if v_all_paid and q.status <> 'paid' then
    update private.payment_quotes
    set
      status = 'paid',
      payment_provider = p_provider,
      provider_session_id = coalesce(nullif(btrim(coalesce(p_session_id,'')),''), q.provider_session_id),
      provider_payment_id = btrim(p_payment_id),
      paid_at = now(),
      updated_at = now()
    where id = q.id
    returning * into q;

    if q.booking_id is not null then
      insert into private.notification_events(event_type, booking_id, title)
      values ('payment_confirmed', q.booking_id, q.reference_code || ' · ' || q.item_title || ' (Split-Pay 100%)')
      returning id into e;
      insert into private.notification_deliveries(event_id, channel)
      values (e, 'telegram'), (e, 'email')
      on conflict do nothing;
    end if;
  end if;

  return jsonb_build_object(
    'success', true,
    'replayed', false,
    'shareIndex', s.share_index,
    'paidSharesCount', v_paid_shares,
    'totalShares', v_total_shares,
    'allPaid', v_all_paid,
    'quoteStatus', q.status
  );
end $$;

create or replace function public.payment_quote_update_hold_status(
  p_quote_id uuid,
  p_hold_kind text,
  p_status text,
  p_payment_intent_id text default null,
  p_hold_hours integer default 24
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  q private.payment_quotes;
  v_pi text := nullif(btrim(coalesce(p_payment_intent_id, '')), '');
  v_hours integer := greatest(1, least(168, coalesce(p_hold_hours, 24)));
begin
  if p_quote_id is null or p_hold_kind not in ('deposit', 'price_lock') then
    return jsonb_build_object('error', 'invalid');
  end if;

  select * into q from private.payment_quotes where id = p_quote_id for update;
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  if q.status = 'cancelled' then return jsonb_build_object('error', 'conflict'); end if;

  if p_hold_kind = 'deposit' then
    if p_status not in ('none', 'pending', 'held', 'released', 'captured') then
      return jsonb_build_object('error', 'invalid');
    end if;
    update private.payment_quotes
    set
      deposit_status = p_status,
      deposit_payment_intent_id = coalesce(v_pi, deposit_payment_intent_id),
      deposit_held_at = case when p_status = 'held' then coalesce(deposit_held_at, now()) else deposit_held_at end,
      deposit_released_at = case when p_status = 'released' then now() else deposit_released_at end,
      updated_at = now()
    where id = q.id
    returning * into q;
    return jsonb_build_object(
      'success', true,
      'holdKind', 'deposit',
      'status', q.deposit_status,
      'paymentIntentId', q.deposit_payment_intent_id,
      'heldAt', q.deposit_held_at,
      'releasedAt', q.deposit_released_at
    );
  else
    if p_status not in ('none', 'pending', 'locked', 'applied', 'released') then
      return jsonb_build_object('error', 'invalid');
    end if;
    update private.payment_quotes
    set
      price_lock_status = p_status,
      price_lock_payment_intent_id = coalesce(v_pi, price_lock_payment_intent_id),
      price_lock_until = case when p_status = 'locked' then now() + make_interval(hours => v_hours) else price_lock_until end,
      expires_at = case when p_status = 'locked' then greatest(expires_at, now() + make_interval(hours => v_hours)) else expires_at end,
      updated_at = now()
    where id = q.id
    returning * into q;
    return jsonb_build_object(
      'success', true,
      'holdKind', 'price_lock',
      'status', q.price_lock_status,
      'paymentIntentId', q.price_lock_payment_intent_id,
      'priceLockUntil', q.price_lock_until,
      'expiresAt', q.expires_at
    );
  end if;
end $$;

create or replace function public.payment_quote_get_by_id_admin(
  p_actor uuid,
  p_quote_id uuid
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  actor_role text;
  q private.payment_quotes;
begin
  select role into actor_role from public.profiles where id = p_actor;
  if actor_role is distinct from 'admin' then
    return jsonb_build_object('error','forbidden');
  end if;
  if p_quote_id is null then
    return jsonb_build_object('error','invalid');
  end if;
  select * into q from private.payment_quotes where id = p_quote_id;
  if not found then
    return jsonb_build_object('error','not_found');
  end if;
  return jsonb_build_object(
    'success', true,
    'quote', jsonb_build_object(
      'id', q.id,
      'status', q.status,
      'depositCents', q.deposit_cents,
      'depositStatus', q.deposit_status,
      'depositPaymentIntentId', q.deposit_payment_intent_id,
      'priceLockCents', q.price_lock_cents,
      'priceLockStatus', q.price_lock_status,
      'priceLockPaymentIntentId', q.price_lock_payment_intent_id
    )
  );
end $$;

revoke all on function public.payment_quote_attach_share_session(text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.payment_quote_mark_share_paid(uuid, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.payment_quote_update_hold_status(uuid, text, text, text, integer) from public, anon, authenticated;
revoke all on function public.payment_quote_get_by_id_admin(uuid, uuid) from public, anon, authenticated;

grant execute on function public.payment_quote_attach_share_session(text, text, text, text, text, text) to service_role;
grant execute on function public.payment_quote_mark_share_paid(uuid, text, text, text, text, text, text) to service_role;
grant execute on function public.payment_quote_update_hold_status(uuid, text, text, text, integer) to service_role;
grant execute on function public.payment_quote_get_by_id_admin(uuid, uuid) to service_role;

commit;
