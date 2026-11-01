# Dining Gateway — verification record

Latest continuation: [R5 venue editor — 1 November](R5_VENUE_EDITOR.md) records
the new source-only editor, real staging migration/SQL acceptance and current
build restrictions. Historical release evidence below remains valid for its
specified source and environment; the complete R1–R5 objective remains open.

Date: 2026-10-31. Branch: `feat/dining-gateway`. The catalogue/photo/referral increment was published with the owner's explicit approval. Source commits: `7daad4b3` (dining) and `946fbc6e` (preserves the latest production changes). No Git push, PR, remote CI or live database migration was performed.

## Latest incremental evidence

The [Headout admin sandbox preview report](HEADOUT_SANDBOX_PREVIEW.md) records the latest dedicated staging version, 213/213 local tests, 8/8 hosted acceptance groups, real provider-read evidence and preserved booking/event/outbox digests. Production remains unchanged. This supplements the historical catalogue and inquiry verification below; it does not assert completion of R1–R5.

## Published release and fresh acceptance

Production: https://gorgona-one.com/restaurants-nightlife . Cloudflare Worker `2fb0f528-3310-44ec-b833-26c0bc418e14` was activated at 100% on 2026-10-31 at 20:31:16 UTC. Rollback target: `2dae06cd-f876-4b5d-a871-11bd351f144f`. No routes, cron triggers or domains were redeployed.

- PASS — 190/190 content, i18n and dashboard tests, zero skips, after merging the newer Florida catalogue, Private Jets and partner-copy production source `b1f84424`. Evidence: `outputs/dining-integrated-tests.log` in the parent workspace.
- PASS — all 16 locale catalogues contain 918 messages with zero missing entries. An independent review verified all 39 unrelated production modules/assets byte-for-byte, every production translation key/value, and the 17 dining additions per locale. Its focused checks passed 10/10.
- PASS — isolated Linux Next.js 15.5.28 production compilation and OpenNext 1.20.13 packaging: 1 handler, 107 referenced client assets. Build source came from a Git archive of `946fbc6e`; the copied Linux dependencies had an identical lockfile. Artifact SHA-256: `281dcc7aa2728dbc76d5513627f70acbb3007bc11c9a9ca72dbaa11f7d124b18`. Evidence: `outputs/dining-linux-build.log`, `outputs/dining-artifact.json`.
- PASS — Wrangler dry-run; 70 local Worker checks; a pre-activation guard confirmed production still used the captured rollback version. All 9 prior binding names/types were retained. The only additional bindings explicitly set `DINING_SCHEMA_ENABLED=false` and `DINING_REQUESTS_ENABLED=false`. Evidence: `outputs/dining-dry-run.log`, `outputs/dining-local-worker-smoke.json`, `outputs/dining-activation-guard.json`.
- PASS — 70 checks against the published domain: all active detail pages, all 27 image files with exact SHA-256 matches, Wynwood filtering, held Story page, provider destinations, original site routes, experience card IDs/order, Private Jets sandbox/tracker, the old Viator redirect, honest no-slot availability, anonymous dashboard access rejection, and the disabled dining-write gate (503 before any database access). Evidence: `outputs/dining-production-smoke.json` and `outputs/dining-production-smoke.log`.
- PASS — actual Edge inspection of the published Russian catalogue, decoded visible photographs, Wynwood resulting in DOYA/Midline, DOYA/SevenRooms and LIV/Discotech destinations, seven nightlife cards, and no horizontal overflow at 320px/390px. English, Russian, Arabic and Hebrew rendered correctly at 320px; Arabic/Hebrew switched to RTL. The temporary viewport override was reset. Browser console errors observed: none.
- PASS — existing signed-in admin page loaded Listings, Requests, Notifications and the new provider diagnostics with no alert and no pending loading state. All five provider names were present. No production account, listing or reservation was modified by this UI inspection.

The release uses ordinary external booking destinations and the existing concierge. New structured dining submissions remain disabled pending a separately validated hosted migration. This is a published increment, not completion of all R1–R5 requirements.

## Directly verified

| Check | Outcome | Evidence |
|---|---|---|
| All content, i18n and dashboard test gates | PASS — 180/180, zero skipped | `outputs/dining-test-gates.log` in parent workspace |
| Photographic asset provenance/integrity and focused i18n checks | PASS — 17/17 | `outputs/dining-photo-checks.log` |
| Saved locale catalogue | PASS — 918 messages in each of 16 languages | `outputs/dining-i18n.log` |
| Next production compilation | PASS — Next.js 15.5.28 | `outputs/dining-next-build.log` |
| Cloudflare package | PASS — 1 handler, 105 referenced client assets | `outputs/dining-worker-build.log` |
| Browser acceptance | PASS — 22 flows, all 16 languages at 320px, mobile and desktop account flows; no JavaScript errors | `outputs/dining-browser/results.json` |
| Local image endpoints | PASS — all 27 respond successfully, visible images decoded before preview capture | Browser acceptance and preview capture |
| Dependency audit at high threshold | PASS — no high/critical advisories; 5 moderate advisories remain | `outputs/dining-dependency-audit.json` |
| Whitespace/final diff check | PASS | `git diff --check` |

Browser coverage includes search/neighborhood filtering, the withheld Story page, provider-link presence, a deliberately lost saved-request response, page reload with the same idempotency key, exactly one saved inquiry, customer history, admin assignment, assigned-partner Arabic mobile access, customer withdrawal, and catalogue imagery. All identities, notifications and database writes are confined to the existing disposable SQL-backed test harness. Browser execution uses the already-installed Chromium executable; no browser download or production login is part of the tests.

An independent security review reproduced and led to fixes for pre-migration history reads, calendar validation (including DateStyle), same-tab recovery and UTF-8 separators. Fresh regression coverage verifies those fixes. A separate browser issue at 320px was corrected by simplifying the detail layout and stacking form controls. An initial browser run overlapped packaging and recorded closed streams; the final sequential run above passes. No failed check is being reported as a pass.

## Photo and visual correction

All 27 active cards and venue details have licensed local photographs. Eight are photographs of the actual venues; nineteen are explicitly marked illustrative/editorial photographs. Captions preserve attribution and licence links, and indicate Creative Commons crops. The directory now has a photographic split header, full-width photo cards and collapsible secondary filters. Existing branding, navigation, concierge and public routes remain in place. Public inventory totals are not introduced.

## Unverified or not delivered

The subsequent dedicated-staging migration, real inquiry/browser acceptance and Headout sandbox client are documented in `API_AND_FORM_STAGING.md`. The production limits below remain; statements about hosted staging are superseded by that later report.

- No real partner reservation, live availability response, provider cancellation, authenticated provider webhook or verified commission reconciliation was exercised or enabled.
- OpenTable/SevenRooms API permissions, TablelistPro venue/API authorization, Discotech API/referral terms and Eatwith affiliate tools remain unverified. Ordinary public outbound destinations are available; they do not constitute those integrations.
- Eatwith is a discovery link, not a tracked Travelpayouts offer. Drive remains untouched.
- The admin catalogue quality/integration view is read-only. A venue/channel editing and publication workflow is still required to finish the full R5 scope.
- Production migration/RLS acceptance for the new column and actual notification delivery for dining inquiries were not performed. Dedicated staging migration/RLS and hosted inquiry acceptance have since passed. Production keeps both new schema/write flags disabled.
- The photo records do not claim that archival photographs are current venue-issued media. Additional current venue photography is an editorial follow-up.
- Safari/iOS device, screen reader and sustained-load acceptance were not performed.

The complete R1–R5 objective is not marked complete. The published deliverable is the expanded catalogue, photographic UI, honest referral gateway and read-only admin diagnostics. The structured concierge request flow and its dashboard history remain staged behind disabled flags. No partner applications, outreach or commercial commitments were made.

## Changed files

- `.env.example`
- `app/admin/page.js`
- `app/api/dashboard/dining/route.js`
- `app/api/dining/availability/route.js`
- `app/components/VenueCard.jsx`
- `app/components/dashboard/RequestBoard.jsx`
- `app/components/dining/DiningBooking.jsx`
- `app/components/dining/DiningPhoto.jsx`
- `app/components/g1/VenueDirectory.jsx`
- `app/restaurants-nightlife/[slug]/page.js`
- `docs/dining/CATALOGUE_AUDIT.md`
- `docs/dining/IMPLEMENTATION.md`
- `docs/dining/PHOTO_CREDITS.md`
- `docs/dining/VERIFICATION.md`
- `i18n/context.json`
- `i18n/locales/ar.js`
- `i18n/locales/de.js`
- `i18n/locales/en.js`
- `i18n/locales/es.js`
- `i18n/locales/fa.js`
- `i18n/locales/fr.js`
- `i18n/locales/he.js`
- `i18n/locales/it.js`
- `i18n/locales/ja.js`
- `i18n/locales/ko.js`
- `i18n/locales/pl.js`
- `i18n/locales/pt.js`
- `i18n/locales/ru.js`
- `i18n/locales/tr.js`
- `i18n/locales/uk.js`
- `i18n/locales/zh.js`
- `i18n/revisions/ar.json`
- `i18n/revisions/de.json`
- `i18n/revisions/es.json`
- `i18n/revisions/fa.json`
- `i18n/revisions/fr.json`
- `i18n/revisions/he.json`
- `i18n/revisions/it.json`
- `i18n/revisions/ja.json`
- `i18n/revisions/ko.json`
- `i18n/revisions/pl.json`
- `i18n/revisions/pt.json`
- `i18n/revisions/ru.json`
- `i18n/revisions/tr.json`
- `i18n/revisions/uk.json`
- `i18n/revisions/zh.json`
- `i18n/source.json`
- `lib/bookingJournal.mjs`
- `lib/dining/catalogue.mjs`
- `lib/dining/copy.mjs`
- `lib/dining/gateway.mjs`
- `lib/dining/photos.mjs`
- `lib/restaurantsNightlifeData.js`
- `lib/server/dashboardCore.mjs`
- `lib/server/dashboardHandlers.mjs`
- `public/images/dining/ball-and-chain.jpg`
- `public/images/dining/carbone.jpg`
- `public/images/dining/club-space.jpg`
- `public/images/dining/cote.jpg`
- `public/images/dining/doya.jpg`
- `public/images/dining/e11even.jpg`
- `public/images/dining/fontana.jpg`
- `public/images/dining/glass-and-vine.jpg`
- `public/images/dining/il-mulino.jpg`
- `public/images/dining/joes-stone-crab.jpg`
- `public/images/dining/komodo.jpg`
- `public/images/dining/liv.jpg`
- `public/images/dining/lpm.jpg`
- `public/images/dining/makoto.jpg`
- `public/images/dining/mandolin.jpg`
- `public/images/dining/michaels-genuine.jpg`
- `public/images/dining/midline.jpg`
- `public/images/dining/mila.jpg`
- `public/images/dining/nikki-beach.jpg`
- `public/images/dining/papi-steak.jpg`
- `public/images/dining/prime-112.jpg`
- `public/images/dining/rosa-sky.jpg`
- `public/images/dining/rusty-pelican.jpg`
- `public/images/dining/sexy-fish.jpg`
- `public/images/dining/sugar-rooftop.jpg`
- `public/images/dining/surf-club.jpg`
- `public/images/dining/versailles.jpg`
- `scripts/dining/translate-catalogue.mjs`
- `supabase/migrations/20261031210000_dining_requests.sql`
- `tests/content/dining.test.mjs`
- `tests/dashboard/dining-browser.mjs`
- `tests/dashboard/dining.test.mjs`
- `tests/dashboard/journal.test.mjs`
