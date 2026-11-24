-- Stage 1A: Covering indexes for all Miami Elio foreign keys (private & public schemas).
-- Uses to_regclass guards so the migration is safe both in production and in minimal PGlite test schemas.
-- Applied to production Supabase (ctszqhhvalyqxhbfqifx).

DO $$
DECLARE
  spec text[];
  specs text[][] := ARRAY[
    ARRAY['private.concierge_ai_claims', 'concierge_ai_claims_day_idx', 'day'],
    ARRAY['private.notification_events', 'notification_events_booking_id_idx', 'booking_id'],
    ARRAY['private.partner_listing_history', 'partner_listing_history_actor_idx', 'actor'],
    ARRAY['private.partner_listing_media', 'partner_listing_media_listing_id_idx', 'listing_id'],
    ARRAY['private.payment_quotes', 'payment_quotes_created_by_idx', 'created_by'],
    ARRAY['private.telegram_notification_outbox', 'telegram_notification_outbox_booking_id_idx', 'booking_id'],
    ARRAY['public.analytics', 'analytics_coupon_id_idx', 'coupon_id'],
    ARRAY['public.app_support_requests', 'app_support_requests_resolved_by_idx', 'resolved_by'],
    ARRAY['public.chat_messages', 'chat_messages_participant_id_idx', 'participant_id'],
    ARRAY['public.chat_rooms', 'chat_rooms_created_by_idx', 'created_by'],
    ARRAY['public.coupons', 'coupons_store_id_idx', 'store_id'],
    ARRAY['public.event_analytics', 'event_analytics_event_id_idx', 'event_id'],
    ARRAY['public.event_analytics', 'event_analytics_provider_id_idx', 'provider_id'],
    ARRAY['public.event_providers', 'event_providers_provider_id_idx', 'provider_id'],
    ARRAY['public.event_teams', 'event_teams_team_id_idx', 'team_id'],
    ARRAY['public.events', 'events_category_idx', 'category'],
    ARRAY['public.events', 'events_league_id_idx', 'league_id'],
    ARRAY['public.leagues', 'leagues_category_idx', 'category'],
    ARRAY['public.organization_memberships', 'organization_memberships_user_id_idx', 'user_id'],
    ARRAY['public.partner_listings', 'partner_listings_partner_id_idx', 'partner_id'],
    ARRAY['public.teams', 'teams_league_id_idx', 'league_id']
  ];
BEGIN
  FOREACH spec SLICE 1 IN ARRAY specs LOOP
    IF to_regclass(spec[1]) IS NOT NULL THEN
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %s (%I)', spec[2], spec[1], spec[3]);
    END IF;
  END LOOP;
END
$$;
