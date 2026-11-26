begin;
-- Package 1 hardening (100% additive, zero DROP, zero-downtime compatible):
-- 1. Restore pg_advisory_xact_lock in payment_quote_create to prevent concurrent duplicate 503 races.
-- 2. Prevent out-of-order Stripe Identity webhooks from downgrading an already verified KYC status.
-- 3. Add payment_quote_mark_paid_v2 and payment_quote_mark_share_paid_v2 with server-side
--    p_expected_amount_cents verification against stored quote/share totals.

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
  v_kyc_required boolean := coalesce((p_input->>'kycRequired')::boolean, false);
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

  perform pg_advisory_xact_lock(hashtextextended('payment-quote:' || p_key::text, 0));

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
        'kycRequired', existing.kyc_required,
        'kycStatus', existing.kyc_status,
        'kycVerifiedAt', existing.kyc_verified_at,
        'flightNumber', existing.flight_number,
        'arrivalAirport', existing.arrival_airport,
        'arrivalTime', existing.arrival_time,
        'deliveryLocation', existing.delivery_location,
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
    weather_shield_enabled, split_ways, kyc_required, kyc_status
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
    v_split_ways,
    v_kyc_required,
    case when v_kyc_required then 'pending' else 'none' end
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
      'kycRequired', created.kyc_required,
      'kycStatus', created.kyc_status,
      'kycVerifiedAt', created.kyc_verified_at,
      'flightNumber', created.flight_number,
      'arrivalAirport', created.arrival_airport,
      'arrivalTime', created.arrival_time,
      'deliveryLocation', created.delivery_location,
      'shares', private.payment_quote_shares_json(created.id)
    )
  );
end $$;

create or replace function public.payment_quote_update_kyc(
  p_quote_id uuid,
  p_status text,
  p_session_id text default null
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  q private.payment_quotes;
  v_sid text := nullif(btrim(coalesce(p_session_id, '')), '');
begin
  if p_quote_id is null or p_status not in ('none', 'pending', 'verified', 'requires_input') then
    return jsonb_build_object('error', 'invalid');
  end if;
  select * into q from private.payment_quotes where id = p_quote_id for update;
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  if q.status = 'cancelled' then return jsonb_build_object('error', 'conflict'); end if;

  if q.kyc_status = 'verified' and p_status <> 'verified' then
    return jsonb_build_object(
      'success', true,
      'kycStatus', q.kyc_status,
      'kycSessionId', q.kyc_session_id,
      'kycVerifiedAt', q.kyc_verified_at
    );
  end if;

  update private.payment_quotes
  set
    kyc_required = true,
    kyc_status = p_status,
    kyc_session_id = coalesce(v_sid, kyc_session_id),
    kyc_verified_at = case when p_status = 'verified' then coalesce(kyc_verified_at, now()) else kyc_verified_at end,
    updated_at = now()
  where id = q.id
  returning * into q;

  return jsonb_build_object(
    'success', true,
    'kycStatus', q.kyc_status,
    'kycSessionId', q.kyc_session_id,
    'kycVerifiedAt', q.kyc_verified_at
  );
end $$;

create or replace function public.payment_quote_mark_paid_v2(
  p_quote_id uuid,
  p_provider text,
  p_session_id text,
  p_payment_id text,
  p_expected_amount_cents integer default null
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  q private.payment_quotes;
  e uuid;
begin
  if p_quote_id is null or p_provider not in ('stripe','paypal','manual')
     or length(btrim(coalesce(p_payment_id,''))) not between 3 and 255 then
    return jsonb_build_object('error','invalid');
  end if;
  select * into q from private.payment_quotes where id = p_quote_id for update;
  if not found then
    return jsonb_build_object('error','not_found');
  end if;
  if q.status = 'paid' then
    return jsonb_build_object('success', true, 'replayed', true, 'paidAt', q.paid_at, 'referenceCode', q.reference_code);
  end if;
  if q.status = 'cancelled' or q.esign_signed_at is null then
    return jsonb_build_object('error','conflict');
  end if;
  if p_expected_amount_cents is not null and p_expected_amount_cents <> q.amount_cents then
    return jsonb_build_object('error','invalid');
  end if;

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
    values ('payment_confirmed', q.booking_id, q.reference_code || ' · ' || q.item_title)
    returning id into e;
    insert into private.notification_deliveries(event_id, channel)
    values (e, 'telegram'), (e, 'email')
    on conflict do nothing;
  end if;

  return jsonb_build_object('success', true, 'replayed', false, 'paidAt', q.paid_at, 'referenceCode', q.reference_code);
end $$;

create or replace function public.payment_quote_mark_share_paid_v2(
  p_quote_id uuid,
  p_share_token text,
  p_provider text,
  p_session_id text,
  p_payment_id text,
  p_payer_name text default null,
  p_payer_email text default null,
  p_expected_amount_cents integer default null
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

  if p_expected_amount_cents is not null and p_expected_amount_cents <> s.amount_cents then
    return jsonb_build_object('error','invalid');
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

revoke all on function public.payment_quote_create(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.payment_quote_update_kyc(uuid, text, text) from public, anon, authenticated;
revoke all on function public.payment_quote_mark_paid_v2(uuid, text, text, text, integer) from public, anon, authenticated;
revoke all on function public.payment_quote_mark_share_paid_v2(uuid, text, text, text, text, text, text, integer) from public, anon, authenticated;

grant execute on function public.payment_quote_create(uuid, uuid, jsonb) to service_role;
grant execute on function public.payment_quote_update_kyc(uuid, text, text) to service_role;
grant execute on function public.payment_quote_mark_paid_v2(uuid, text, text, text, integer) to service_role;
grant execute on function public.payment_quote_mark_share_paid_v2(uuid, text, text, text, text, text, text, integer) to service_role;

commit;
