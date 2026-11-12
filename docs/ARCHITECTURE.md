# Miami Elio — Platform Architecture & Build Sequence

Authoritative blueprint for completing the ecosystem. Execute phases in
order; each phase must ship complete (no half-built systems on `main`).
Branding rule: the brand is **Miami Elio**. "Da'at by Miami Elio" names
only the discovery assistant feature and must never displace the brand.

## Current state (2026-07-17, commit d898ac4)

**Live in production (protect — do not regress):**
- Concierge engine chain (`app/api/chat/route.js`), as of 2026-11-11:
  Workers AI → local brain → ai-router → the concierge's own line + cards.
  - Production answers from **Cloudflare Workers AI** through the `AI`
    binding in `wrangler.jsonc` (`lib/ai/workersAi.mjs`; model =
    `WORKERS_AI_MODEL`). No API key. A Worker cannot reach localhost, so
    the local brain and the ai-router are skipped on Cloudflare unless
    `GORGONA_AI_URL` / `AI_ROUTER_URL` point at a public address.
  - Every engine gets the same system prompt: persona
    (`lib/aiEcosystemContext.js`) + live inventory
    (`lib/aiEcosystemDigest.js`) + the UI language.
  - Input is sanitized, replies are stripped of markdown and checked, and
    requests are rate-limited per address (`lib/ai/chatCore.mjs`).
  - Every message gets a reply: when no engine answers the guest still
    reads a localized line and gets navigation cards.
  - `lib/ai/brain.js` (OpenRouter) is retained but has no caller.
- Homepage concierge chat (GorgonaOneAI): conversation context
  (sessionStorage), voice in/out, 16 locales, ecosystem-grounded replies
  via `lib/aiEcosystemDigest.js` (server-only inventory digest).
- Track B dock (AiSphere/AiDock/AiConversation) sharing the same backend.
- Local AI backend: `lib/ai/localBrain.js` — an optional, self-contained
  adapter for the self-hosted Miami Elio AI Brain microservice (FastAPI +
  Ollama, `POST /api/v1/chat/completions`). `/api/chat` runs a fallback
  chain (see above) and always
  answers `200` with the same JSON contract, so the chat widget has no
  failure branch and an offline backend is a non-event.
  - Detection: `GET /api/health` identifies the service and reports whether
    Ollama itself is connected, so "engine down" is caught without spending
    a completion. If the service moves, the adapter falls back to reading
    `/openapi.json`, then to probing conventional paths.
  - Sessions: the service owns conversation memory and its own system
    prompt — it reads only the newest turn (`ChatRequest.get_user_input()`)
    and rebuilds context from `session_id`. So `/api/chat` echoes
    `sessionId` back to the client and the client returns it on the next
    turn; dropping it would start a fresh, amnesiac session per message.
    Corollary: on this path the site's `SYSTEM_PROMPT` is not in play (the
    service injects `GORGONA_SYSTEM_PROMPT`), while the internal-link
    suggestions still come from `matchSuggestions` client-side.
  - A circuit breaker keeps a switched-off backend from costing latency
    (measured: ~15-30ms per message with everything down).
  - `GET /api/chat` is a bare health check (`{ ok: true }`); engine
    addresses and state are not exposed.
  - Config: `GORGONA_AI_*` in `.env.example`; nothing is required for the
    site to run, build, or deploy.
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
- Access via `lib/data/listings.js` (server-only repository module —
  the data twin of `lib/ai/brain.js`). Pages keep their current props by
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
  surfaces). Implement in `brain.js` as `askBrainStream()` alongside
  `askBrain()` — adapters choose.
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
