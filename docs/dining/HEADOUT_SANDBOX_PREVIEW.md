# Headout admin sandbox preview — 2026-10-31

## Delivered scope

The existing private staging admin dashboard can now load three real Headout sandbox culinary products, select a verified variant, request seven days of date-level availability and open the exact attributed Headout destination after choosing an available date. The interface explicitly labels test inventory, starting test prices and the absence of a reservation or payment.

This is a read-only Affiliate API integration. Checkout remains on Headout. The documented API does not provide a verified selected-date prefill for this handoff; the interface instructs the administrator to choose the date and guests again on Headout. Neither a date selection nor opening the link creates a Miami Elio reservation or a provider confirmation.

The existing dining/VIP inquiry form and its staging migration remain available and unchanged. Their `pending`, `reviewing`, `responded` and `closed` states describe concierge work, not provider-confirmed restaurant tables. No migration was required or executed in this increment.

## Exact release boundary

- Dedicated staging Worker: `miami-elio-dashboard-staging`.
- Final active version: `3f8fd96e-b7c1-4a72-a332-839c52897743` at 100%.
- Staged application source: `154443fa17cfddb59d7c6d5f1f29dfd0ffa054dd`; tree `982e91bb49890ec7306d00d55dea2c1e463f6556`.
- Exported artifact SHA-256: `e9ae49e9c1627b08342f604d24e5af79219925a2f37fe01bd2aed1f1b2846f33`.
- Dedicated Supabase project: `kaxslgjbrarapeyoifdh`.
- Production remains version `2fb0f528-3310-44ec-b833-26c0bc418e14` at 100%. Its deployment record matched the before snapshot exactly. The new public API path returned 404 on production.
- No production deployment, database migration, Git push, main merge, payment, provider reservation or commercial agreement was performed in this increment.

The application bundle was built from the saved source above. Subsequent documentation commits are not claimed to be inside that deployed bundle. All 13,463 materialized tracked files matched the saved Git blobs before the build; all 2,212 exported artifact files matched the Linux build, and its aggregate hash was verified before upload. No package or lockfile was changed.

## Implementation and security

`headoutPreviewHandler()` serves the new `/api/dashboard/dining/headout` read endpoint through the existing application. It fails closed unless the application environment, project reference, Supabase URL, explicit preview flag and existing encrypted sandbox key all match dedicated staging. Existing real Supabase identity/profile checks require an administrator before any provider request. Customer, partner and anonymous identities cannot retrieve the preview.

The server permits only three source-backed sandbox candidate IDs: `55702`, `58903`, `58904`. Each product is fetched from the official single-product endpoint, checked against the requested ID and Miami city, and projected into the existing sanitized read contract. Variants must belong to a freshly fetched normal product. The calendar validates real dates, limits the horizon and requests a fixed seven-day window. Unknown, duplicate and injected query parameters are rejected.

The adapter preserves the API-returned canonical link with exactly one matching affiliate code. It does not invent date, time or guest parameters. The environment is pinned to sandbox; responses expose `mode: REFERRAL`, `bookingCreationEnabled: false`, `confirmation: null` and `slots: null`. There is no create-booking, payment, hold, cancellation or webhook ingress. No commission amount is presented as earned revenue.

Catalogue reads tolerate a partial provider failure while reporting it explicitly. Total failure and rate limiting remain errors. A selection change aborts the browser request, discards late responses and clears prior dates and the handoff link. A failed request cannot leave an old link looking current. Own interface copy covers all 16 supported locales; provider descriptions are explicitly identified as potentially English.

The existing sandbox key was supplied to Cloudflare as one encrypted staging-only secret, `HEADOUT_SANDBOX_API_KEY`, through stdin. It was never copied into Git, build environment variables or browser assets. Scanning all 2,212 packaged files found no copy of that key. All original staging bindings were retained. The existing private gate, no-store/noindex headers, project pinning and blocked notification dispatch remain active. Observability was read back as disabled.

## Verified candidates and catalogue effect

| Sandbox product | API-returned title |
|---|---|
| `55702` | Miami Little Havana Walking Tour with Food Tastings and Cuban Coffee |
| `58903` | Miami Little Havana Food and Culture Walking Tour with Tastings |
| `58904` | Miami Little Havana Food & Culture Tour |

All three actual product records and normal variants were returned by the hosted staging server. Product `55702` also returned actual sandbox date records and test starting prices. These records are internal preview candidates, not new canonical public venues. Their similar names still require supplier matching and production inventory verification. No public venue record, photo, price, count or existing route was changed.

## Verification and actual outcomes

Evidence paths below are in the parent workspace's `outputs` directory.

| Check | Outcome | Evidence |
|---|---|---|
| Full content, i18n and dashboard suite on final application source | PASS — 213/213, zero skipped, exit 0 | `headout-preview-final-full-tests.log` |
| Headout SDK, preview authorization/input contracts and locale copy | PASS — 23/23 focused; SDK 15, endpoint 7, copy 1 | `headout-workers-redirect-green.log` |
| Saved localization catalogue check | PASS — all 16 locales match, exit 0 | `headout-preview-layout-i18n.log` |
| Real workerd runtime → Headout sandbox product | PASS — product `55702`, exit 0 | `headout-preview-workerd-green.log` |
| Final Next 15.5.28 / OpenNext 1.20.13 build | PASS — one handler, 108 referenced client assets, exit 0 | `headout-preview-mobile-build.log` |
| Package, encrypted-key exclusion, version/binding guards and staging activation | PASS — exact source/hash, dry-run and activation; no production change | `headout-preview-mobile-dry-run.log`, `headout-preview-final-version.json`, `headout-preview-final-activation.log` |
| Real hosted API/Auth plus desktop browser | PASS — private gate, source identity, admin boundary, real catalogue/date responses, forged selections rejected, exact attributed navigation, late-response cancellation and error recovery | `headout-preview-hosted-final/results.json` |
| Mobile layout in Russian 390px, Arabic 320px and Hebrew 390px | PASS — cached actual API responses for layout; no JavaScript exceptions or document overflow | Same report and `ru.png`, `ar.png`, `he.png` |
| Complete opt-in hosted acceptance harness | PASS — 8/8 groups, exit 0 | `headout-preview-hosted-final.log` |
| Independent security/correctness review | PASS — no remaining blockers; 23/23 focused checks for the transport fix | Independent reviewer result |
| Production deployment and endpoint isolation | PASS — unchanged deployment record; public preview path 404 | `headout-preview-prod-before.json`, `headout-preview-prod-after.json` and direct HTTP check |
| Booking, request-event and notification/outbox preservation | PASS — all row counts and full-row digests unchanged before/after | Direct dedicated-staging SQL, values below |

The main hosted desktop scenario used real Auth and real upstream provider responses. Its deliberate 503 browser fault and held real response are test-only fault injection. The three mobile layout scenarios reused those actual responses to avoid unnecessary provider requests. External checkout navigation was intercepted after checking its exact destination; no checkout page interaction, provider reservation or payment is claimed.

Preserved full-row digests, ordered by row ID:

| Table | Rows | Before and after MD5 |
|---|---:|---|
| `public.bookings` | 13 | `5e4bcf619c2dd689761ece3f4409b747` |
| `public.request_events` | 30 | `5747e3cecaf3bfc78005890ef9e79104` |
| `private.notification_events` | 107 | `aeec606495fd620f5d7121d533c5c4e5` |
| `private.notification_deliveries` | 214 | `e296b828ec26713a3bfe5e2022d9eac4` |

Real Auth logins can update Auth session/audit records. The unchanged-data claim above is specifically about bookings, request history and the notification outbox.

## Failures diagnosed and corrected

The first hosted attempt exposed a real runtime incompatibility: Cloudflare Workers throws before sending a request when `redirect: error` is used. A local workerd probe reproduced the exact exception. The read client now uses `manual` and rejects every non-2xx response, cancelling its body without following redirects or forwarding credentials. Regression tests cover 301, 302, 303, 307 and 308. This follows the official [Cloudflare Request contract](https://developers.cloudflare.com/workers/runtime-apis/request/). The failing probe and regression checks are retained separately from the passing evidence.

The first browser selector expected an exact implicit-label text for a select, whose DOM label also contains its options. A minimal browser reproduction confirmed the mismatch; the harness now selects the actual accessible combobox role/name. The product control was already accessible.

Mobile acceptance then found an existing long translated admin heading extending the Russian document width to 421px on a 390px viewport. Only the admin heading's mobile minimum font size and word wrapping were adjusted. Final RU/AR/HE acceptance passed. Desktop typography, public header and menus were preserved.

Cloudflare secret-version metadata makes default asset handling values explicit, whereas code-upload metadata can omit them. Release checks normalize only the documented `auto-trailing-slash`/`none` defaults before comparing all other runtime settings and bindings.

Host disk space was constrained. Two older duplicate Headout tar files were removed only after every regular archived file was byte-hash-verified against its retained expanded counterpart. Final artifacts were refreshed by bounded file deltas and verified in full; user files, credential storage and expanded release artifacts were retained.

## Configuration, rollback and remaining boundaries

Only dedicated staging contains `HEADOUT_SANDBOX_PREVIEW_ENABLED=true` and the encrypted sandbox key. Removing the flag hides and disables the preview. The application also refuses to enable it on another project or environment even if a key is present. The pre-increment stable staging version is `f8f26110-52fb-4be1-ba54-193bca830127`; app rollback must retain the existing inquiry schema and data, gate and notification restrictions. No database rollback is needed for this preview.

The Headout production-access thread was reread after implementation: it still contained only the sent request, with no reply or granted production key. Production access, final scopes and any new agreement/fees remain BLOCKED on the partner's response and any required owner approval. The declined Viator API licence remains unaccepted and no Viator API key was created. Existing authorized public referral flows are preserved.

NOT TESTED / NOT DELIVERED: production Headout inventory or checkout, real payment or provider confirmation, cancellation/refund synchronization, signed provider events, earned commission reconciliation, Safari/iOS, screen-reader or load acceptance, and production activation of the structured dining/VIP inquiry migration. The wider R1–R5 scope is not marked complete. Next work is to validate granted production scopes and inventory, match canonical suppliers and prepare the corresponding production release for explicit approval.

## Changed files in this increment

- `app/admin/page.js`
- `app/api/dashboard/dining/headout/route.js`
- `app/components/dashboard/RequestBoard.jsx`
- `app/components/dining/HeadoutPreview.jsx`
- `lib/dining/headoutPreviewCopy.mjs`
- `lib/server/dashboardHandlers.mjs`
- `lib/server/headoutApi.mjs`
- `lib/server/headoutPreview.mjs`
- `tests/content/headout-preview-copy.test.mjs`
- `tests/dashboard/headout-api.test.mjs`
- `tests/dashboard/headout-preview.test.mjs`
- `tests/dashboard/staging/headout-preview-browser.mjs`
- `wrangler.dashboard-staging.json`
- `docs/dining/API_AND_FORM_STAGING.md`
- `docs/dining/IMPLEMENTATION.md`
- `docs/dining/VERIFICATION.md`
- This report.

Tools used: the existing Headout sandbox API, real Supabase Auth/PostgREST and Supabase SQL connector, Playwright/Chromium, installed Miniflare/workerd and build tools, Cloudflare Wrangler, read-only Gmail thread inspection, official provider/runtime documentation and the existing independent reviewer. The evidence-engineering and Supabase workflows guided verification; no new dependency was introduced.
