// ===========================================================================
// Gorgona One AI — provider seam.
//
// The single interface the AI surface talks to. Today it runs the transparent,
// client-side intelligence: language detection + intent search over the dynamic
// ecosystem index (no backend, no live APIs — Phase 2 scope).
//
// This is the extension point for the future. To introduce a real model/back
// end (Phase 2+), implement `askEcosystem` to call an endpoint and return the
// SAME shape — the UI, greeting flow, and result rendering do not change. The
// `source` field lets the UI/telemetry know which engine answered.
// ===========================================================================

import { searchEcosystem } from './intent';
import { detectLanguage, greeting } from './language';
import { getReadyIntegrations, matchIntegration } from './integrations';

/**
 * @param {Object} args
 * @param {string} args.query   Free-text (typed or transcribed) request.
 * @param {string} [args.locale] Current app locale, used as detection fallback.
 * @returns {Promise<{lang:string, greeting:string, world:(string|null),
 *   results:Array, source:string}>}
 */
export async function askEcosystem({ query, locale = 'en' } = {}) {
  const lang = detectLanguage(query, locale);
  const { results, world } = searchEcosystem(query, { limit: 6 });

  // Consult prepared ecosystem integrations (OVAGO, RentCars, …). Live ones can
  // inject their own results; today none are live, so this is a no-op that keeps
  // the seam wired. Prepared matches annotate the response for the UI/telemetry.
  const q = (query || '').toLowerCase();
  let liveResults = [];
  for (const integration of getReadyIntegrations()) {
    if (!integration.keywords.some((k) => q.includes(k))) continue;
    try {
      const r = await integration.search({ query, locale });
      if (r?.ready && r.results?.length) liveResults = liveResults.concat(r.results);
    } catch {
      /* integration failure must never break discovery */
    }
  }
  const matched = matchIntegration(query);

  return {
    lang,
    greeting: greeting(lang),
    world,
    results: liveResults.length ? [...liveResults, ...results] : results,
    integration: matched ? { id: matched.id, name: matched.name, ready: matched.ready } : null,
    source: liveResults.length ? 'client-index+live' : 'client-index'
  };
}

export { greeting, detectLanguage };
