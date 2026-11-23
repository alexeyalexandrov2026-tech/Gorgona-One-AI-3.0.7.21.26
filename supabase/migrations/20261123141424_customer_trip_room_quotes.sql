begin;
-- Stage 3: Service-role-only customer quote lookup for ELIO+ Guide Live Trip Room.
-- Strictly additive; private.payment_quotes remains inaccessible to anon/authenticated.

create index if not exists payment_quotes_client_email_idx
  on private.payment_quotes (lower(client_email), created_at desc);

create or replace function public.payment_quote_list_for_customer(
  p_actor uuid,
  p_email text default null
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  rows jsonb;
begin
  if p_actor is null then
    return jsonb_build_object('error', 'invalid');
  end if;
  if not exists (select 1 from public.profiles where id = p_actor) then
    return jsonb_build_object('error', 'forbidden');
  end if;

  update private.payment_quotes q
  set status = 'expired', updated_at = now()
  where q.status in ('open', 'signed')
    and q.expires_at <= now()
    and (
      (q.booking_id is not null and exists (
        select 1 from public.bookings b where b.id = q.booking_id and b.customer_user_id = p_actor
      ))
      or (v_email is not null and lower(q.client_email) = v_email)
    );

  select coalesce(jsonb_agg(item), '[]'::jsonb)
  into rows
  from (
    select jsonb_build_object(
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
      'amountCents', q.amount_cents,
      'currency', q.currency,
      'expiresAt', q.expires_at,
      'esignFullName', q.esign_full_name,
      'esignSignedAt', q.esign_signed_at,
      'paymentProvider', q.payment_provider,
      'providerPaymentId', case when q.status = 'paid' then q.provider_payment_id else null end,
      'paidAt', q.paid_at,
      'createdAt', q.created_at
    ) as item
    from private.payment_quotes q
    where (
      (q.booking_id is not null and exists (
        select 1 from public.bookings b where b.id = q.booking_id and b.customer_user_id = p_actor
      ))
      or (v_email is not null and lower(q.client_email) = v_email)
    )
    order by
      case q.status
        when 'open' then 0
        when 'signed' then 1
        when 'paid' then 2
        else 3
      end,
      q.created_at desc
    limit 30
  ) sub;

  return jsonb_build_object('success', true, 'quotes', rows);
end $$;

revoke all on function public.payment_quote_list_for_customer(uuid, text) from public, anon, authenticated;
grant execute on function public.payment_quote_list_for_customer(uuid, text) to service_role;
commit;
