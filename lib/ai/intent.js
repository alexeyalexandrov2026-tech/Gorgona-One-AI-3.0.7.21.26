// ===========================================================================
// Intent matcher for Gorgona One AI.
//
// Thinks in user INTENT over the dynamic ecosystem index — not in a fixed set of
// categories. Given free text ("a yacht for 12 people", "kosher restaurant",
// "flights to Dubai", "sportsbook bonus") it scores every indexed ecosystem
// entity and returns the strongest matches plus the dominant `world` for the
// visual highlight. Phase 2 is a transparent client-side heuristic; the same
// contract is what a real model plugs into later (see lib/ai/provider.js).
// ===========================================================================

import { getEcosystemIndex } from './ecosystemIndex';

const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'me', 'i', 'need', 'want', 'find', 'show',
  'get', 'to', 'in', 'of', 'my', 'with', 'best', 'under', 'near', 'please', 'can',
  'you', 'looking', 'some', 'any', 'is', 'are', 'at', 'on', 'this', 'that', 'from'
]);

const norm = (s) => (s == null ? '' : String(s)).toLowerCase();

export function searchEcosystem(query, { limit = 6 } = {}) {
  const q = norm(query).trim();
  if (!q) return { results: [], world: null, tokens: [] };

  const tokens = q.split(/[^a-z0-9$]+/i).map(norm).filter((t) => t && !STOP.has(t));
  // "for 12 people" / "12 guests" -> capacity intent
  const numMatch = q.match(/\b(\d{1,3})\b/);
  const wantCapacity = numMatch && /(people|guest|guests|pax|person|persons)/.test(q)
    ? parseInt(numMatch[1], 10)
    : null;

  const index = getEcosystemIndex();
  const scored = [];

  for (const e of index) {
    let score = 0;
    for (const tok of tokens) {
      if (!tok) continue;
      const inText = e.text.includes(tok);
      if (inText) score += tok.length >= 5 ? 3 : 2;
      if (norm(e.title).includes(tok)) score += 3;
      if (norm(e.type) === tok) score += 4; // "yacht", "restaurant", "car"…
    }
    if (!score) continue;

    // Capacity heuristic — a group size favours entities that can hold it.
    if (wantCapacity) {
      if (e.capacity && e.capacity >= wantCapacity) score += 4;
      else if (e.capacity && e.capacity < wantCapacity) score -= 2;
    }
    // Prefer concrete listings over generic destinations on a tie.
    if (e.type !== 'Destination' && e.type !== 'Category' && e.type !== 'World') score += 0.5;

    scored.push({ e, score });
  }

  scored.sort((a, b) => b.score - a.score);
  const results = scored.slice(0, limit).map((s) => s.e);

  // Dominant world among the top results → drives the sphere highlight.
  const worldCount = {};
  for (const r of results) worldCount[r.world] = (worldCount[r.world] || 0) + 1;
  const world = Object.keys(worldCount).sort((a, b) => worldCount[b] - worldCount[a])[0] || null;

  return { results, world, tokens };
}
