# Gorgona One — Platform Architecture & Build Sequence

Authoritative blueprint for completing the ecosystem. Execute phases in
order; each phase must ship complete (no half-built systems on `main`).
Branding rule: the brand is **Gorgona One**. "Da'at by Gorgona One" names
only the discovery assistant feature and must never displace the brand.

## Current state (2026-10-04)

See `docs/AUDIT.md` for the full audit behind this snapshot.

**Live in production:**
- Concierge chat: `/api/chat` runs a fallback chain and always answers
  `200` with the same JSON contract:
  1. the self-hosted Gorgona AI Brain (FastAPI + Ollama) via
     `lib/ai/localBrain.js`, at `GORGONA_AI_URL`;
  2. the ai-router (OpenAI-compatible) at `AI_ROUTER_URL`, default
     `http://localhost:20128`;
  3. a localized "temporarily unavailable" line.
  A Cloudflare Worker cannot reach either default (localhost), so
  production answers with the line in step 3 unless those variables point
  at hosted services. Navigation suggestions and action cards are matched
  locally (`lib/aiSuggestions.js`), so guests still get somewhere to go.
  - Detection: `GET /api/health` identifies the brain service and reports
    whether Ollama itself is connected, so "engine down" is caught without
    spending a completion. If the service moves, the adapter falls back to
    reading `/openapi.json`, then to probing conventional paths.
  - Sessions: the service owns conversation memory and its own system
    prompt - it reads only the newest turn and rebuilds context from
    `session_id`, so `/api/chat` echoes `sessionId` back and the client
    returns it on the next turn. On this path the site's `SYSTEM_PROMPT` is
    not in play.
  - A circuit breaker keeps a switched-off backend from costing latency.
  - `GET /api/chat` reports engine status only outside production or with
    `GORGONA_AI_DIAGNOSTICS=on`.
- One conversation, three surfaces (homepage `GorgonaOneAI`, sphere dock
  `AiSphere`/`AiDock`, `/discovery` `ConciergeRoom`), held by
  `ChatProvider` in the root layout. Voice is input only (Web Speech API in
  `useVoice.js`); there is no text-to-speech anywhere.
- Client intent index (`lib/ai/provider.js`) - non-LLM constellation
  highlighting; intentionally client-side, do not "upgrade" it to LLM calls.
- Data: world pages import `lib/*Data.js` directly. `/api/search` goes
  through `lib/data/listings.js`, which falls back to the same modules
  because `public.listings` does not exist yet. Sportsbook profiles read
  `public.sportsbooks` and fall back to the list in `lib/mockData.js`.
- Accounts and roles: Supabase Auth, roles in `public.profiles`
  (`database/README.md`). Reservations: `/api/book` stores a row in
  `public.bookings` and emails `ADMIN_EMAIL`; partner activity emails come
  from `/api/notify` (signed-in users only).
- PWA: `public/sw.js`, registered by `ServiceWorkerRegistrar`, enables the
  install prompt.
- Tests: `npm test` (node:test), `npm run test:e2e` (Playwright),
  `npm run test:db` (Postgres policy tests); `.github/workflows/ci.yml`.
- Deploy: push to `main` → Cloudflare Workers Builds (OpenNext).

**Known debt:**
- Next.js 14 is end-of-life with open advisories; upgrade to 15.5+/16
  (React 19) on its own branch.
- Every page ships all 16 locales (`lib/i18n.js`, ~240 KB) through the
  root providers; load the active locale only.
- No hosted AI engine for production (see the chain above).
- Inventory lives in static JS files (`lib/*Data.js`); `public.listings`
  is not created yet.
- Ovago/RentCars integrations are stubs.
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
- A server-side inventory digest for the concierge prompt reads the
  repository (cached, per-worker) so the AI speaks from live inventory.
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

- Streaming replies (SSE from `/api/chat`, incremental render in every
  surface), implemented in the `/api/chat` engine chain.
- Tool use: expose `search_listings` (Phase 2) to paid models via
  OpenRouter tool-calling; free pool keeps digest grounding.
- Voice output was removed by product decision (the concierge is
  text-only). i18n hygiene: rename `gemini*` keys to provider-neutral
  (`aiSnag`, `aiRateLimited`, …) across all 16 locales in one commit.

## Phase 4 — Integrations & PWA

- Ovago / RentCars: keep the existing integration seam
  (`lib/ai/integrations/`), implement server-side adapters with the same
  repository read-path; a stub must never block or corrupt discovery.
- PWA install: done - `public/sw.js` is registered by
  `ServiceWorkerRegistrar` in the root layout.

## Phase 5 — Reliability & operations

- Observability: structured logs in brain/adapters (already emit model +
  provider), Cloudflare Workers analytics dashboards, uptime check on
  `/api/chat` (non-LLM ping mode to avoid burning quota).
- E2E smoke suite (Playwright): started in `e2e/smoke.spec.js` (core pages,
  concierge reply, booking failure path); add locale switch and search.
- Ops runbook: OpenRouter quota (free tier ≈ 50 req/day; $10 lifetime
  top-up → 1000/day; paid chain via env), Cloudflare env var inventory.

## Operating rules

1. One authoritative module per concern: `/api/chat` (LLM), repository
   (data), search route (queries). New features consume these; they never
   bypass.
2. Env-driven policy, no hardcoded providers/models/keys at call sites.
3. Every phase ships with its verification (build + live E2E) before merge.
4. Protect the premium UX: no visual regressions; both AI themes stay
   first-class.
