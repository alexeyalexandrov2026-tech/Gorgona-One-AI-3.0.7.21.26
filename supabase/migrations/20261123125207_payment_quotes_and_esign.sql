begin;
-- Stage 2: Service-only clickwrap consent log, confirmed payment quotes,
-- immutable ESIGN agreement audit trail, and verified Stripe/PayPal settlement.
-- Strictly additive; private tables are inaccessible to anon/authenticated roles.

create table if not exists private.booking_consents (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  terms_version text not null check (length(btrim(terms_version)) between 1 and 64),
  ip_hash text not null check (ip_hash ~ '^[a-f0-9]{64}$'),
  accepted_at timestamptz not null default now()
);

create table if not exists private.payment_quotes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  public_token text not null unique check (public_token ~ '^[A-Za-z0-9_-]{32,64}$'),
  reference_code text not null unique check (reference_code ~ '^ELIO-[A-Z0-9]{4,16}$'),
  created_by uuid not null references public.profiles(id),
  status text not null default 'open' check (status in ('open','signed','paid','expired','cancelled')),
  item_title text not null check (length(btrim(item_title)) between 1 and 240),
  kind text not null check (kind in ('car','yacht','stay','experience','dining','nightlife','jet')),
  supplier_name text not null check (length(btrim(supplier_name)) between 1 and 200),
  service_dates text not null check (length(btrim(service_dates)) between 1 and 300),
  cancellation_policy text not null check (length(btrim(cancellation_policy)) between 1 and 1000),
  notes text not null default '' check (length(notes) <= 1500),
  amount_cents integer not null check (amount_cents between 100 and 50000000),
  currency text not null default 'USD' check (currency = 'USD'),
  client_name text not null check (length(btrim(client_name)) between 1 and 120),
  client_email text not null check (length(btrim(client_email)) between 3 and 254),
  expires_at timestamptz not null,
  esign_full_name text,
  esign_signed_at timestamptz,
  esign_terms_version text,
  esign_document_hash text check (esign_document_hash is null or esign_document_hash ~ '^[a-f0-9]{64}$'),
  esign_ip_hash text check (esign_ip_hash is null or esign_ip_hash ~ '^[a-f0-9]{64}$'),
  esign_ua_hash text check (esign_ua_hash is null or esign_ua_hash ~ '^[a-f0-9]{64}$'),
  esign_shield_accepted boolean not null default false,
  payment_provider text check (payment_provider is null or payment_provider in ('stripe','paypal','manual')),
  provider_session_id text,
  provider_payment_id text,
  paid_at timestamptz,
  request_key uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_quotes_booking_idx on private.payment_quotes(booking_id, created_at desc);
create index if not exists payment_quotes_session_idx on private.payment_quotes(provider_session_id) where provider_session_id is not null;

alter table private.booking_consents enable row level security;
alter table private.payment_quotes enable row level security;
revoke all on private.booking_consents, private.payment_quotes from public, anon, authenticated;
grant all on private.booking_consents, private.payment_quotes to service_role;

create or replace function public.booking_record_consent(
  p_booking_id uuid,
  p_terms_version text,
  p_ip_hash text
) returns jsonb language plpgsql security invoker set search_path = '' as $$
begin
  if p_booking_id is null or length(btrim(coalesce(p_terms_version,''))) not between 1 and 64
     or coalesce(p_ip_hash,'') !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('error','invalid');
  end if;
  if not exists (select 1 from public.bookings where id = p_booking_id) then
    return jsonb_build_object('error','missing');
  end if;
  insert into private.booking_consents(booking_id, terms_version, ip_hash)
  values (p_booking_id, btrim(p_terms_version), p_ip_hash)
  on conflict (booking_id) do nothing;
  return jsonb_build_object('success', true);
end $$;

create or replace function public.payment_quote_create(
  p_actor uuid,
  p_key uuid,
  p_input jsonb
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  actor_role text;
  existing private.payment_quotes;
  created private.payment_quotes;
  b public.bookings;
  v_booking_id uuid;
  v_expires_hours integer;
begin
  if p_actor is null or p_key is null or p_input is null then
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
        'amountCents', existing.amount_cents,
        'currency', existing.currency,
        'supplierName', existing.supplier_name,
        'itemTitle', existing.item_title,
        'serviceDates', existing.service_dates,
        'expiresAt', existing.expires_at,
        'createdAt', existing.created_at
      )
    );
  end if;

  if coalesce(p_input->>'bookingId','') <> '' then
    v_booking_id := (p_input->>'bookingId')::uuid;
    select * into b from public.bookings where id = v_booking_id;
    if not found then
      return jsonb_build_object('error','missing');
    end if;
  end if;

  v_expires_hours := greatest(1, least(168, coalesce((p_input->>'expiresHours')::integer, 24)));

  insert into private.payment_quotes(
    booking_id, public_token, reference_code, created_by,
    item_title, kind, supplier_name, service_dates, cancellation_policy, notes,
    amount_cents, currency, client_name, client_email, expires_at, request_key
  ) values (
    v_booking_id,
    p_input->>'publicToken',
    p_input->>'referenceCode',
    p_actor,
    btrim(p_input->>'itemTitle'),
    p_input->>'kind',
    btrim(p_input->>'supplierName'),
    btrim(p_input->>'serviceDates'),
    btrim(p_input->>'cancellationPolicy'),
    coalesce(btrim(p_input->>'notes'), ''),
    (p_input->>'amountCents')::integer,
    'USD',
    btrim(p_input->>'clientName'),
    lower(btrim(p_input->>'clientEmail')),
    now() + make_interval(hours => v_expires_hours),
    p_key
  ) returning * into created;

  return jsonb_build_object(
    'success', true,
    'replayed', false,
    'quote', jsonb_build_object(
      'id', created.id,
      'bookingId', created.booking_id,
      'publicToken', created.public_token,
      'referenceCode', created.reference_code,
      'status', created.status,
      'amountCents', created.amount_cents,
      'currency', created.currency,
      'supplierName', created.supplier_name,
      'itemTitle', created.item_title,
      'serviceDates', created.service_dates,
      'expiresAt', created.expires_at,
      'createdAt', created.created_at
    )
  );
exception
  when check_violation or invalid_text_representation or not_null_violation then
    return jsonb_build_object('error','invalid');
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
    'supplierName', q.supplier_name,
    'serviceDates', q.service_dates,
    'amountCents', q.amount_cents,
    'currency', q.currency,
    'expiresAt', q.expires_at,
    'esignFullName', q.esign_full_name,
    'esignSignedAt', q.esign_signed_at,
    'paymentProvider', q.payment_provider,
    'providerPaymentId', q.provider_payment_id,
    'paidAt', q.paid_at,
    'createdAt', q.created_at
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
begin
  if coalesce(p_token,'') !~ '^[A-Za-z0-9_-]{32,64}$' then
    return jsonb_build_object('error','not_found');
  end if;
  select * into q from private.payment_quotes where public_token = p_token;
  if not found then
    return jsonb_build_object('error','not_found');
  end if;
  if q.status in ('open','signed') and q.expires_at <= now() then
    update private.payment_quotes set status = 'expired', updated_at = now() where id = q.id returning * into q;
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
      'createdAt', q.created_at
    )
  );
end $$;

create or replace function public.payment_quote_sign(
  p_token text,
  p_full_name text,
  p_terms_version text,
  p_doc_hash text,
  p_ip_hash text,
  p_ua_hash text
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  q private.payment_quotes;
  clean_name text := btrim(coalesce(p_full_name,''));
begin
  if coalesce(p_token,'') !~ '^[A-Za-z0-9_-]{32,64}$'
     or length(clean_name) not between 2 and 120
     or length(btrim(coalesce(p_terms_version,''))) not between 1 and 64
     or coalesce(p_doc_hash,'') !~ '^[a-f0-9]{64}$'
     or coalesce(p_ip_hash,'') !~ '^[a-f0-9]{64}$'
     or coalesce(p_ua_hash,'') !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('error','invalid');
  end if;

  select * into q from private.payment_quotes where public_token = p_token for update;
  if not found then
    return jsonb_build_object('error','not_found');
  end if;
  if q.status = 'cancelled' then
    return jsonb_build_object('error','conflict');
  end if;
  if q.status in ('open','signed') and q.expires_at <= now() then
    update private.payment_quotes set status = 'expired', updated_at = now() where id = q.id;
    return jsonb_build_object('error','conflict');
  end if;
  if q.status = 'expired' then
    return jsonb_build_object('error','conflict');
  end if;
  if q.status = 'paid' then
    return jsonb_build_object('success', true, 'alreadyPaid', true, 'esignSignedAt', q.esign_signed_at, 'esignDocumentHash', q.esign_document_hash);
  end if;
  if q.status = 'signed' and q.esign_signed_at is not null then
    return jsonb_build_object('success', true, 'alreadySigned', true, 'esignFullName', q.esign_full_name, 'esignSignedAt', q.esign_signed_at, 'esignDocumentHash', q.esign_document_hash);
  end if;

  update private.payment_quotes
  set
    status = 'signed',
    esign_full_name = clean_name,
    esign_signed_at = now(),
    esign_terms_version = btrim(p_terms_version),
    esign_document_hash = p_doc_hash,
    esign_ip_hash = p_ip_hash,
    esign_ua_hash = p_ua_hash,
    esign_shield_accepted = true,
    updated_at = now()
  where id = q.id
  returning * into q;

  return jsonb_build_object(
    'success', true,
    'esignFullName', q.esign_full_name,
    'esignSignedAt', q.esign_signed_at,
    'esignTermsVersion', q.esign_terms_version,
    'esignDocumentHash', q.esign_document_hash
  );
end $$;

create or replace function public.payment_quote_attach_session(
  p_token text,
  p_provider text,
  p_session_id text
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  q private.payment_quotes;
begin
  if coalesce(p_token,'') !~ '^[A-Za-z0-9_-]{32,64}$'
     or p_provider not in ('stripe','paypal')
     or length(btrim(coalesce(p_session_id,''))) not between 4 and 255 then
    return jsonb_build_object('error','invalid');
  end if;
  select * into q from private.payment_quotes where public_token = p_token for update;
  if not found then
    return jsonb_build_object('error','not_found');
  end if;
  if q.status in ('open','signed') and q.expires_at <= now() then
    update private.payment_quotes set status = 'expired', updated_at = now() where id = q.id;
    return jsonb_build_object('error','conflict');
  end if;
  -- Hard server guardrail: payment cannot start before ESIGN signature is recorded.
  if q.status <> 'signed' or q.esign_signed_at is null or q.esign_document_hash is null then
    return jsonb_build_object('error','conflict');
  end if;
  update private.payment_quotes
  set payment_provider = p_provider, provider_session_id = btrim(p_session_id), updated_at = now()
  where id = q.id;
  return jsonb_build_object('success', true);
end $$;

create or replace function public.payment_quote_mark_paid(
  p_quote_id uuid,
  p_provider text,
  p_session_id text,
  p_payment_id text
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

create or replace function public.payment_quote_cancel(
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
  select * into q from private.payment_quotes where id = p_quote_id for update;
  if not found then
    return jsonb_build_object('error','not_found');
  end if;
  if q.status = 'paid' then
    return jsonb_build_object('error','conflict');
  end if;
  update private.payment_quotes set status = 'cancelled', updated_at = now() where id = q.id;
  return jsonb_build_object('success', true);
end $$;

revoke all on function public.booking_record_consent(uuid, text, text) from public, anon, authenticated;
revoke all on function public.payment_quote_create(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.payment_quote_list_for_booking(uuid, uuid) from public, anon, authenticated;
revoke all on function public.payment_quote_get_by_token(text) from public, anon, authenticated;
revoke all on function public.payment_quote_sign(text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.payment_quote_attach_session(text, text, text) from public, anon, authenticated;
revoke all on function public.payment_quote_mark_paid(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.payment_quote_cancel(uuid, uuid) from public, anon, authenticated;

grant execute on function public.booking_record_consent(uuid, text, text) to service_role;
grant execute on function public.payment_quote_create(uuid, uuid, jsonb) to service_role;
grant execute on function public.payment_quote_list_for_booking(uuid, uuid) to service_role;
grant execute on function public.payment_quote_get_by_token(text) to service_role;
grant execute on function public.payment_quote_sign(text, text, text, text, text, text) to service_role;
grant execute on function public.payment_quote_attach_session(text, text, text) to service_role;
grant execute on function public.payment_quote_mark_paid(uuid, text, text, text) to service_role;
grant execute on function public.payment_quote_cancel(uuid, uuid) to service_role;
commit;
