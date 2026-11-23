// Server handler for ELIO+ Guide Live Trip Room (GET /api/dashboard/trip-room).
// Aggregates strictly real, authenticated guest data:
// - Customer's verified payment quotes & Confirmed Reservation Passes
// - Multi-item trip plans (booking_plans) & active booking requests
// - Official 5-day Miami NOAA/NWS weather forecast (fail-safe)
// - Private 24/7 direct phone line unlocked EXCLUSIVELY when at least one quote is paid.

import { database, json, failure } from './dashboardCore.mjs';
import { cleanSupportPhone } from './paymentQuoteHandlers.mjs';
import { getMiamiForecast } from '../ai/miamiForecast.mjs';
import {
  MANAGER_TELEGRAM,
  MANAGER_WHATSAPP,
  managerTelegramUrl,
  managerWhatsAppUrl
} from '../managerContact.mjs';

function itemHrefFor(kind, slug) {
  if (!slug || typeof slug !== 'string') return null;
  switch (kind) {
    case 'car': return `/rentals/${slug}`;
    case 'stay': return `/vacation-rentals/${slug}`;
    case 'dining':
    case 'nightlife': return `/restaurants-nightlife/${slug}`;
    case 'experience': return `/experiences/${slug}`;
    case 'yacht': return '/yachts';
    case 'jet': return '/private-jets';
    default: return null;
  }
}

export function tripRoomHandlers(env, fetcher = fetch, { forecastLoader = getMiamiForecast } = {}) {
  const guarded = (fn) => async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      return failure(error);
    }
  };

  return {
    overview: guarded(async (request) => {
      const db = database(env, fetcher);
      const user = await db.identity(request);
      const plansEnabled = env.PLAN_REQUESTS_ENABLED === 'true';

      const bookingCols = 'id,item_slug,item_title,dates,status,kind,created_at,updated_at,response' +
        (plansEnabled ? ',plan_id,plan_position' : '');

      const [quotesResult, bookingsRaw, plansRaw, forecastRaw] = await Promise.all([
        db.rpc('payment_quote_list_for_customer', {
          p_actor: user.id,
          p_email: user.emailConfirmed && user.email ? user.email : null
        }).catch(() => ({ quotes: [] })),
        db.call(
          `/rest/v1/bookings?select=${bookingCols}&customer_user_id=eq.${user.id}&order=created_at.desc,id.desc&limit=30`,
          { token: user.token }
        ).catch(() => []),
        plansEnabled
          ? db.call(
              `/rest/v1/booking_plans?select=id,start_date,end_date,guests,note,created_at&customer_user_id=eq.${user.id}&order=created_at.desc&limit=10`,
              { token: user.token }
            ).catch(() => [])
          : Promise.resolve([]),
        Promise.resolve(forecastLoader({ env, fetcher })).catch(() => [])
      ]);

      const quotes = Array.isArray(quotesResult?.quotes) ? quotesResult.quotes : [];
      const bookings = Array.isArray(bookingsRaw)
        ? bookingsRaw.map((row) => ({
            id: row.id,
            itemSlug: row.item_slug,
            itemTitle: row.item_title || row.item_slug,
            dates: row.dates,
            status: row.status,
            kind: row.kind,
            response: row.response || null,
            planId: row.plan_id || null,
            planPosition: row.plan_position ?? null,
            href: itemHrefFor(row.kind, row.item_slug),
            createdAt: row.created_at,
            updatedAt: row.updated_at
          }))
        : [];

      const byPlan = new Map();
      for (const b of bookings) {
        if (!b.planId) continue;
        if (!byPlan.has(b.planId)) byPlan.set(b.planId, []);
        byPlan.get(b.planId).push(b);
      }

      const plans = Array.isArray(plansRaw)
        ? plansRaw.map((plan) => {
            const items = (byPlan.get(plan.id) || []).sort(
              (a, b) => (a.planPosition ?? 99) - (b.planPosition ?? 99)
            );
            return {
              id: plan.id,
              startDate: plan.start_date,
              endDate: plan.end_date,
              guests: plan.guests,
              note: plan.note || '',
              createdAt: plan.created_at,
              items
            };
          })
        : [];

      const weather = Array.isArray(forecastRaw) ? forecastRaw.slice(0, 5) : [];

      const paidQuotes = quotes.filter((q) => q.status === 'paid');
      const awaitingQuotes = quotes.filter((q) => q.status === 'open' || q.status === 'signed');
      const activeBookings = bookings.filter((b) => b.status !== 'closed');

      const hasPaidPass = paidQuotes.length > 0;
      const supportPhone = hasPaidPass ? cleanSupportPhone(env.CONFIRMED_SUPPORT_PHONE) : null;

      return json({
        guest: {
          name: user.name || null,
          email: user.email || null
        },
        summary: {
          activeRequests: activeBookings.length,
          awaitingAction: awaitingQuotes.length,
          confirmedPasses: paidQuotes.length,
          totalPlans: plans.length
        },
        quotes,
        plans,
        bookings: bookings.slice(0, 12),
        weather,
        chatContacts: {
          telegram: managerTelegramUrl(env.NEXT_PUBLIC_MANAGER_TELEGRAM || MANAGER_TELEGRAM),
          whatsapp: managerWhatsAppUrl(env.NEXT_PUBLIC_MANAGER_WHATSAPP || MANAGER_WHATSAPP)
        },
        // Hard business guardrail: private 24/7 direct phone unlocks ONLY after
        // at least one verified paid reservation exists on the guest's account.
        confirmedSupport: hasPaidPass
          ? {
              active: true,
              phoneDisplay: supportPhone?.phoneDisplay || null,
              phoneHref: supportPhone?.phoneHref || null
            }
          : null
      });
    })
  };
}
