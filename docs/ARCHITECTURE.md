# Miami Elio — Platform Architecture & Build Sequence

Authoritative blueprint for completing the ecosystem. Execute phases in
order; each phase must ship complete (no half-built systems on `main`).
Branding rule: the brand is **Miami Elio**. "Da'at by Miami Elio" names
only the discovery assistant feature and must never displace the brand.

## Current state (2026-07-17, commit d898ac4)

**Live in production (protect — do not regress):**
- Concierge chain (updated 2026-11-21, concierge cleanup PR 2):
  `/api/chat` runs exactly three steps — deterministic facts (greeting,
  Miami time, NWS weather; `lib/ai/conciergeFacts.mjs`) → native Workers AI
  (`lib/ai/workersBrain.mjs`, `CONCIERGE_WORKERS_AI_ENABLED`, durable usage
  limits) → the deterministic authored fallback (`lib/ai/catalogueAnswer.mjs`).
  A disabled, denied or failed Workers AI call never starts a second engine.
  The former `lib/ai/brain.js` (OpenRouter via a local router port),
  `lib/ai/localBrain.js` (FastAPI + Ollama) and the vendored `ai-router`
  were unreachable from the deployed Worker and have been removed.
- Homepage concierge chat (GorgonaOneAI): conversation context
  (sessionStorage), voice in/out, 16 locales, ecosystem-grounded replies
  via `lib/aiEcosystemDigest.js` (server-only inventory digest).
- Track B dock (AiSphere/AiDock/AiConversation) sharing the same backend.
- `/api/chat` always answers `200` with the same JSON contract for a
  well-formed request, so the chat widget has no failure branch; a degraded
  answer is labelled `error:true`/`configured:false`. `GET /api/chat` is a
  bare `{ok:true}` health check.
- Client intent index (`lib/ai/provider.js`) — non-LLM constellation
  highlighting; intentionally client-side, do not "upgrade" it to LLM calls.
- Deploy: push to `main` → Cloudflare Workers Builds (OpenNext).

**Known debt (scheduled below, do not hotfix ad hoc):**
- Inventory lives in static JS files (`lib/*Data.js`).
- No global search surface. Ovago/RentCars integrations are stubs.
- No streaming AI replies; system TTS only. PWA install implementation
  exists in a git stash ("prev-session: sphere blend fix + sw.js ...").
- Legacy i18n keys named `gemini*` hold provider-specific wording.

## Phase 1 — Canonical data layer (foundation for everything)

Move inventory from static JS to Supabase Postgres. One schema, one access
path:

- Tables: `listings` (id, world, slug, title, subtitle, location, attrs
  jsonb, price_text, image_url, href, status), `worlds`, `venues` folded
  into `listings.world`. Multilingual display stays in app i18n; data
  fields remain English (matches current behavior).
- Access via `lib/data/listings.js` (server-only repository module).
  Pages keep their current props by
  reading through it; static `lib/*Data.js` files become seed scripts
  (`scripts/seed/*.mjs`) and are deleted from runtime imports.
- `lib/aiEcosystemDigest.js` switches to the repository (cached, per-worker)
  so the AI brain automatically speaks from live inventory.
- RLS: public read on published rows only; writes via service key (admin
  tooling later). Never expose the service key to the client.

Exit criteria: all world pages + AI digest read from Supabase; seeds
reproducible; zero visual change.

## Phase 2 — Search system (built on Phase 1, not before)

- Postgres FTS (tsvector column on listings, GIN index) as the core;
  add pgvector + embeddings only if FTS relevance proves insufficient —
  do not start with vectors.
- `/api/search?q=` route (thin adapter, same pattern as chat) + a global
  search surface: extend the existing homepage AI input and header with a
  results view. The concierge gains a `search_listings` capability so AI
  answers and search share one engine.
- The client intent index remains for instant visual highlighting; real
  queries go to the API.

## Phase 3 — AI system completion

- Streaming replies (SSE from `/api/chat`, incremental render in both
  surfaces). Not built: the earlier unwired prototype (`askBrainStream()`
  in `brain.js` plus the client `chatTransport.js`) was removed as dead
  code in the 2026-11-21 concierge cleanup.
- Tool use: expose `search_listings` (Phase 2) to paid models via
  OpenRouter tool-calling; free pool keeps digest grounding.
- Premium TTS behind an interface (`lib/ai/voice.js`) with system
  speechSynthesis as default and ElevenLabs/OpenAI voice as env-gated
  upgrade. i18n hygiene: rename `gemini*` keys to provider-neutral
  (`aiSnag`, `aiRateLimited`, …) across all 16 locales in one commit.

## Phase 4 — Integrations & PWA

- Ovago / RentCars: keep the existing integration seam
  (`lib/ai/integrations/`), implement server-side adapters with the same
  repository read-path; a stub must never block or corrupt discovery.
- PWA install: rebase the stashed implementation (public/sw.js +
  ServiceWorkerRegistrar + manifest start_url `view=concierge` +
  AiDockProvider auto-open) onto current main — re-verify against Track A
  surfaces before merging.

## Phase 5 — Reliability & operations

- Observability: structured logs in brain/adapters (already emit model +
  provider), Cloudflare Workers analytics dashboards, uptime check on
  `/api/chat` (non-LLM ping mode to avoid burning quota).
- E2E smoke suite (Playwright): homepage chat round-trip, locale switch,
  each world page renders, search round-trip.
- Ops runbook: OpenRouter quota (free tier ≈ 50 req/day; $10 lifetime
  top-up → 1000/day; paid chain via env), Cloudflare env var inventory.

## Operating rules

1. One authoritative module per concern: brain (LLM), repository (data),
   search route (queries). New features consume these; they never bypass.
2. Env-driven policy, no hardcoded providers/models/keys at call sites.
3. Every phase ships with its verification (build + live E2E) before merge.
4. Protect the premium UX: no visual regressions; both AI themes stay
   first-class.
