// ===========================================================================
// Stage 3 ELIO+ Guide: Zero-PII Authenticated Guest Memory for FactPack.
//
// When a signed-in guest talks to ELIO (Authorization: Bearer <jwt>), loads
// ONLY that guest's own My Miami favorites and Live Trip Room quote/pass
// statuses under RLS, strictly bounded (<= 650ms, zero email/phone/card PII).
// ===========================================================================

import { database } from './dashboardCore.mjs';

const MEMORY_TIMEOUT_MS = 650;

export async function loadGuestAccountMemory(request, env = process.env, fetcher = fetch) {
  const authHeader = request?.headers?.get('authorization') || '';
  if (!/^Bearer\s+\S{20,}$/i.test(authHeader)) return null;
  if (!env?.NEXT_PUBLIC_SUPABASE_URL || !env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;

  const task = (async () => {
    try {
      const db = database(env, fetcher);
      const user = await db.identity(request, true);
      if (!user?.id || !user?.token) return null;

      const [favoritesRaw, bookingsRaw, quotesResult] = await Promise.all([
        db.call(
          `/rest/v1/favorites?select=kind,slug,title&user_id=eq.${user.id}&order=created_at.desc&limit=6`,
          { token: user.token }
        ).catch(() => []),
        db.call(
          `/rest/v1/bookings?select=item_title,dates,status,kind&customer_user_id=eq.${user.id}&order=created_at.desc&limit=5`,
          { token: user.token }
        ).catch(() => []),
        db.rpc('payment_quote_list_for_customer', {
          p_actor: user.id,
          p_email: user.emailConfirmed && user.email ? user.email : null
        }).catch(() => ({ quotes: [] }))
      ]);

      const favorites = Array.isArray(favoritesRaw)
        ? favoritesRaw.map((f) => String(f.title || f.slug || '').trim()).filter(Boolean).slice(0, 6)
        : [];
      const bookings = Array.isArray(bookingsRaw)
        ? bookingsRaw
            .filter((b) => b.status !== 'closed')
            .slice(0, 3)
            .map((b) => `${String(b.item_title || '').slice(0, 50)} (${b.status})`)
        : [];
      const quotes = Array.isArray(quotesResult?.quotes) ? quotesResult.quotes : [];
      const paidPasses = quotes.filter((q) => q.status === 'paid').length;
      const pendingEsign = quotes.filter((q) => q.status === 'open' || q.status === 'signed').length;

      if (!favorites.length && !bookings.length && !paidPasses && !pendingEsign) return null;
      return { favorites, bookings, paidPasses, pendingEsign };
    } catch {
      return null;
    }
  })();

  let timer;
  try {
    return await Promise.race([
      task,
      new Promise((resolve) => { timer = setTimeout(() => resolve(null), MEMORY_TIMEOUT_MS); })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** Compact, zero-PII prompt line injected into Workers AI system instructions (<= 340 chars). */
export function formatGuestMemoryPromptLine(memory) {
  if (!memory || typeof memory !== 'object') return '';
  const parts = [];
  if (Array.isArray(memory.favorites) && memory.favorites.length) {
    parts.push(`My Miami saved: ${memory.favorites.slice(0, 5).join(', ')}`);
  }
  if (Number.isInteger(memory.paidPasses) && memory.paidPasses > 0) {
    parts.push(`Confirmed Live Trip Room passes: ${memory.paidPasses}`);
  }
  if (Number.isInteger(memory.pendingEsign) && memory.pendingEsign > 0) {
    parts.push(`Quotes awaiting ESIGN/payment: ${memory.pendingEsign}`);
  }
  if (Array.isArray(memory.bookings) && memory.bookings.length) {
    parts.push(`Active requests: ${memory.bookings.slice(0, 2).join('; ')}`);
  }
  return parts.length ? `Authenticated guest account memory (do not repeat private IDs): ${parts.join(' | ')}.`.slice(0, 360) : '';
}
