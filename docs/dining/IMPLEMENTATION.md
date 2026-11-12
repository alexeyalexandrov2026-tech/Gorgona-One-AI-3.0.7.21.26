# Miami Dining Gateway — implementation and release boundary

Latest continuation (2026-11-01): the canonical venue draft/publication editor is
implemented, its migration passed real dedicated-staging SQL acceptance, its
Chromium editor workflows passed 18/18, and Linux CI passed all 230 tests plus
standalone Next/OpenNext/Wrangler dry-run. See
[R5 Linux verification](R5_LINUX_VERIFICATION.md) for the pinned commit, artifact
and exact limits. Hosted and production activation remain open; the full R1–R5
objective is still open.

Branch: `feat/dining-gateway`; isolated checkout `miami-elio-dining`, initially based on `ff9878c1` and subsequently merged with the newer production catalogue/navigation/copy source. The catalogue/photo/referral release was published with owner approval. The new inquiry migration and enabled form were subsequently validated in dedicated private staging. Headout sandbox product/date reads now work in the private admin dashboard, and an authorized production-access request was sent. No new agreement, payment, provider reservation or production database migration was performed. See `API_AND_FORM_STAGING.md` and `HEADOUT_SANDBOX_PREVIEW.md` for exact evidence and remaining boundaries.

## Acceptance and reuse

- Preserve every original venue route, public navigation, concierge, existing property catalogues and all sixteen languages.
- A canonical source-backed venue may expose several verified public booking destinations, never several inventory cards for the same provider match.
- Requests and referrals must never imply confirmed reservations, real-time capacity or earned commission.
- Reuse `bookings`, `dashboard_submit`, `dashboard_command`, existing profile roles/RLS/indexes, `request_events`, notification outbox and the bounded same-tab booking journal.
- Unknown API permissions fail closed. Reuse existing provider credentials and authentication; introduce no payment collection, external package or live webhook. The existing Headout sandbox key is encrypted in dedicated staging only.
- The legacy database continues to serve request history with dining schema flags off.

## Phase evidence

| Phase | Delivered and environment | Remaining boundary |
|---|---|---|
| R1 | Canonical identity/evidence, audited legacy routes, versioned provider/selection contracts, strict validation and feature gates | Full live release acceptance pending |
| R2 | 27 source-backed venues, 16 additions, corrected Brickell locations, deduplication, source audit, photographic cards, a split photographic header, compact filters and detail photographs | 27 licensed photographs (8 venue photographs, 19 explicitly marked illustrative/editorial images). Additional current venue photography, expanded culinary offers and tracked Eatwith tools remain unverified |
| R3 | Verified OpenTable and SevenRooms external booking destinations; explicit provider confirmation/cancellation wording; no-slot availability contract | DIRECT and EMBEDDED are disabled; API approval, authorized widget terms and confirmation channels not available |
| R4 | Discotech LIV and Tablelist Midline public destinations; VIP/private/guest-list concierge inquiries where offered, with pending request states | Provider APIs, VIP confirmation and signature-verified webhooks unavailable; no invented minimum spend or event inventory |
| R5 | Customer history/withdrawal and inquiry migration verified in dedicated staging; published diagnostics/catalogue; private Headout sandbox preview; venue editor with real staging SQL, 18/18 Chromium scenarios and full successful Linux CI on 2026-11-01 | Hosted editor/Auth acceptance, production activation, reviewed multilingual prose editing, verified commission reconciliation and live provider events remain open |

The catalogue, photographic UI, external booking destinations and read-only admin diagnostics were published with owner approval on 2026-10-31; see `VERIFICATION.md` for the exact artifact, checks and rollback target. Structured concierge submissions now work in dedicated staging; production retains both schema/write flags disabled. This is **not** completion of every R1–R5 acceptance criterion. In particular, the operational view is read-only; it is not presented as a venue editor.

## Partner evidence and account boundary

- OpenTable [official API documentation](https://docs.opentable.com/) requires partner approval and a production agreement. Public external booking links are separate from API access. No API or logo rights are inferred.
- SevenRooms [API documentation](https://api-docs.sevenrooms.com/) requires provisioned documentation access. Only links offered by the venue itself are used; no booking widget script is copied.
- Discotech [Miami](https://discotech.me/miami/) and [LIV listing](https://app.discotech.me/miami/liv) supply ordinary external browsing/booking destinations. No Miami Elio referral commission or private API is verified.
- TablelistPro [developer overview](https://www.tablelistpro.com/developers) describes APIs, widgets and webhooks. [Midline](https://buy.tablelist.com/v/midline-miami) is a verified public Tablelist destination. That does not provision a TablelistPro API key or venue authorization.
- Eatwith [official affiliate page](https://www.eatwith.com/l/affiliations) currently points to Awin. The available Travelpayouts account opens to Drive onboarding and does not expose Eatwith tools in the observed session. Drive was not installed, configured or enabled. Eatwith is an ordinary discovery link; there is no tracked affiliate offer and no commission claim.

The public dining provider capability flags remain false for availability/create/cancel/webhooks/embedded until authorized functionality is available. `providerAdapter()` deliberately rejects these calls. The separate [Headout admin sandbox preview](HEADOUT_SANDBOX_PREVIEW.md) now verifies real sandbox product/date reads behind strict staging and admin gates; it does not change those public capabilities. No webhook URL accepts unsigned events. No unverified provider reference can enter a confirmed reservation state because this release only saves inquiries.

## Data and safe rollout

Migration: `supabase/migrations/20261031210000_dining_requests.sql`, applied to dedicated staging only as ledger version `20261031204420`; not applied to production. The rollout controls below still apply to production.

1. Keep both `DINING_SCHEMA_ENABLED=false` and `DINING_REQUESTS_ENABLED=false` before migration. Existing history reads must omit the new column.
2. Review and apply the additive migration in an approved staging database. It adds nullable `bookings.hospitality` for existing kinds, requires a strict version-1 object for new dining/nightlife kinds, and expands the existing transactional RPCs. It preserves current role grants, RLS, indexes, events and outbox. No duplicate customer table is introduced.
3. Verify schema/RLS and existing app compatibility, then set `DINING_SCHEMA_ENABLED=true`. Keep this flag true after migration so saved inquiry details remain visible even if new writes are disabled.
4. Enable `DINING_REQUESTS_ENABLED=true` only after local and hosted staging acceptance. With either flag off, the public detail page retains external links and the existing concierge chat without rendering a non-working submission form.
5. Obtain owner approval before production deployment or a live migration.

Rollback: disable new requests first; retain the additive schema, historical data and expanded RPCs. Revert application code if necessary; do not drop the column or delete inquiry data as rollback. Current migration retains request-key replay checks before date-related processing. New identical requests with different keys are rejected within fifteen minutes; the journal preserves the original key across same-tab recovery for thirty minutes. Recovery after expiry or across devices is not provided, as in the existing booking flow.

States `pending`, `reviewing`, `responded`, `closed` describe concierge work, never provider confirmation. Customer `withdraw` is limited to the owner of a hospitality inquiry. It does not call a partner cancellation endpoint. Assigned partners can see only assigned requests, and only an admin can inspect integration diagnostics.

## Validation and reproducibility

`npm ci --ignore-scripts` installed this branch's existing lockfile without changing package versions. Shared dependencies pointed to an older Next.js 14 runtime, so they were not used for final build validation. The checked-in stack is Next.js 15.5.28; no new dependency was added.

Run:

- `npm run i18n:check`
- `node --test --test-concurrency=2 tests/content/*.test.mjs tests/i18n/*.test.mjs tests/dashboard/*.test.mjs`
- `node node_modules/next/dist/bin/next build`
- `node scripts/i18n/build-worker.mjs`
- `node tests/dashboard/dining-browser.mjs` (disposable SQL-backed QA; fixture sends never reach real providers)

For an existing browser installation set `I18N_BROWSER_EXECUTABLE`. Browser QA starts local ports 3056/3057, uses synthetic accounts and the same real SQL functions/RLS via the established test provider, then closes its services. It is not proof of live Supabase deployment, external reservation completion or browser-engine parity.

The production build has the existing missing-Supabase fallback warning when no database is configured. A successful compilation is not proof that external services are connected.
