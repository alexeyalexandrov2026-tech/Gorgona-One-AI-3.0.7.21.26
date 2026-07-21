// Analytics preparation for the Tickets & Events Marketplace.
// No analytics backend exists yet - these are the hook points a future
// integration (e.g. a Supabase `analytics` table, or a third-party
// provider) will wire into. Calling them today is a safe no-op.

function track(eventName, payload) {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log(`[analytics] ${eventName}`, payload);
  }
}

export function trackEventView(eventSlug) {
  track('event_view', { eventSlug });
}

export function trackTicketClick(eventSlug, providerSlug) {
  track('ticket_click', { eventSlug, providerSlug });
}

export function trackProviderClick(providerSlug) {
  track('provider_click', { providerSlug });
}
