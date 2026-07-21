// ===========================================================================
// Ecosystem integration registry (Phase 4 — architecture prep).
//
// Defines the contract for external ecosystem partners and registers the
// prepared integrations. NO live APIs are wired yet (per the approved plan):
// each adapter declares its capability, the intents it serves, and the in-app
// route it currently maps to, with `ready: false`. When real credentials/APIs
// arrive, implement `search()` and flip `ready` to true — the provider and
// index consult this registry, so results appear with no other code changes.
//
// Adapter contract:
//   { id, name, kind, ready, route, keywords[], async search(params) }
// ===========================================================================

import { ovago } from './ovago';
import { rentcars } from './rentcars';

export const integrations = [ovago, rentcars];

export function getIntegration(id) {
  return integrations.find((i) => i.id === id) || null;
}

// Integrations whose live API is wired and safe to query. Empty today by
// design — the seam exists so future additions light up automatically.
export function getReadyIntegrations() {
  return integrations.filter((i) => i.ready);
}

// Which prepared integration (if any) serves a given free-text query — used to
// annotate intent results ("powered by OVAGO") before the live API exists.
export function matchIntegration(query) {
  const q = (query || '').toLowerCase();
  return integrations.find((i) => i.keywords.some((k) => q.includes(k))) || null;
}
