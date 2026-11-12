# Discovery Room and concierge acceptance

Report date: November 1, 2026 (America/New_York). Follow-up checks ran after November 2 00:00 UTC.

## Status and scope

**PARTIAL: current local and immutable hosted browser acceptance both pass 42/42; live conversational AI remains BLOCKED.** A previously recorded intermittent hosted hydration exception did not recur in the current hosted run but remains an open risk without a proven cause, as detailed below.

The visitor continues to receive recommendations with destination buttons, as explicitly requested. There is no automatic redirect. Tests use synthetic messages and isolated browser storage; they do not create customer bookings or send concierge notifications.

Initial application source: `0ee830bf9b69a66c238d3c4ede4f2e1510e80514`, tree `e05f38707c335eac506d6e67ca4866e88237ffa7`. Follow-up fixes: `29470c22d55f6edf7df2cd73216a56a8fe2cdace` and current application source `b62250034da89b67e3c6b04cdd2e2e469d0a8270`, tree `42bc2c8da3753f1a37e41b69160fbdc43a546862`.

The fixes are deployed only to the existing private `miami-elio-dashboard-staging` Worker, current version `f3304e77-a53e-4d45-997a-73188036e090`. The release identifies staging Supabase project `kaxslgjbrarapeyoifdh`. Current artifact SHA-256: `5c2e459b782f33a7026d63e48533cde009acd33bfa8e09d91fec7a87ba46600f`, built November 2 at 01:31 UTC from `b6225003`. Rollback: previous private version `e4c7f25f-7522-4100-ad45-a466d7fbd4ac` (initial source `0ee830bf`). Existing authentication gate, noindex controls and notification-dispatch restrictions remain in place. All versioned bindings and normalized runtime settings were compared before activation and preserved. No database migration was applied for these changes.

A fresh read-only deployment check on November 2 at 01:34 UTC confirmed production still serves version `2fb0f528-3310-44ec-b833-26c0bc418e14` and private staging serves the current version above. These concierge repairs have **not** been deployed to production.

## Defects repaired

- Correct section recommendations across 16 locales, including private jets, yachts, villas, dining and nightlife; remove retired brand destinations.
- Preserve a topic for short booking follow-ups, allow explicit topic changes, and retain both sections in mixed requests. Match real named venues before generic Miami terms and exclude insufficient yacht capacity.
- Share conversation state between homepage, dock and room; validate restored storage and allow only supported internal recommendation URLs.
- Show a localized unavailable-service response. An offline provider is not reported as a configured or successful AI conversation.
- Validate the chat request before contacting a provider: bounded UTF-8 payload, permitted roles, nonblank messages, valid locale and session fields. Keep the latest client message within the wire budget.
- Prevent late responses from restoring cleared conversations. Prevent duplicate submissions, stale voice callbacks and simultaneous voice ownership.
- Keep closed drawers inactive for keyboard navigation; trap and restore focus. Recover from failed lazy imports and searches. Wrap long messages on mobile and provide localized voice errors.
- Wait for saved language restoration before enabling chat, drawer search or microphone input; stop ongoing dictation when a language selection starts. A deterministic delayed-catalogue test reproduced English recognition during Russian restoration before the fix and passed afterward.
- Move the floating Discovery trigger's existing scoped CSS into the established global overlay stylesheet and disable the trigger until its providers are ready. Native event tracing proved that hydration previously moved the unstyled trigger between pointer-down and pointer-up, so the click missed the button. A no-JavaScript browser check failed before the CSS move and passed afterward. Focus setup now runs before paint, but the missed click was caused by the moving trigger, not by the focus helper.

## Executed verification

Evidence files are under the sibling workspace `outputs/` directory; logs contain no API credentials.

| Check | Actual result | Evidence |
| --- | --- | --- |
| Original production API baseline | FAIL: 97 passed, 14 failed of 111; exit 1 | `concierge-production-baseline.json` |
| Original browser baseline | FAIL: 5 passed, 8 failed of 13 groups; exit 1 | `concierge-browser-baseline/results.json` |
| Focused concierge contracts, latest repeat | PASS: 211 tests, zero failures/skips; exit 0 | `concierge-contracts-20261101.log` |
| Combined existing and concierge tests on application source | PASS: 424 tests, zero failures/skips; exit 0 | `concierge-full-tests-final.log` |
| Follow-up content, i18n and concierge tests | PASS: 307 tests, zero failures/skips; exit 0 | `concierge-full-tests-first-paint.log` |
| Deterministic delayed-language browser regression | PASS; exit 0, after red reproduction | `concierge-locale-red.log`, `concierge-locale-green.log` |
| Translation catalogue validation | PASS: 16 catalogues, 918 keys each; exit 0 | `concierge-i18n-final.log` |
| Current navigation index against production routes | PASS: 127 destinations returned HTTP 200 on the same origin; exit 0 | `concierge-production-destinations.json` |
| Initial local browser acceptance | PASS: 41 scenarios; exit 0 | `concierge-browser-complete-final/results.json` |
| Initial built private staging browser acceptance | PASS: 41 scenarios; exit 0 | `concierge-browser-hosted-final/results.json` |
| November 1 repeat of the initial staging version | FAIL: 39 passed, 2 failed of 41; exit 1 | `concierge-browser-hosted-20261101/results.json` |
| Intermediate local follow-up | FAIL: 40 passed, 1 failed of 41; exit 1; missed trigger click | `concierge-browser-local-20261101/results.json` |
| Current local browser acceptance, including first paint without JavaScript | PASS: 42 scenarios; exit 0 | `concierge-browser-local-final-20261101/results.json` |
| Current immutable hosted browser acceptance, source b6225003 | PASS: 42 scenarios; exit 0, completed November 2 at 01:36 UTC | `concierge-browser-hosted-b6225003/results.json` |
| Latest private staging API acceptance, source b6225003 | FAIL: 111 passed, 1 failed of 112; exit 1 | `concierge-hosted-api-b6225003.json` |
| Linux Next/OpenNext build and package verification | PASS: one handler and 108 referenced client assets; exit 0 | `concierge-staging-build.log` |
| Release validation | PASS: exact source/project identity, binding/runtime preservation and protected-secret scan across 2,209 artifact files | `concierge-staging-guard.json`, build validation |
| Current immutable Linux build and package, source b6225003 | PASS: one handler and 108 referenced client assets; exit 0 | `concierge-staging-build-final-20261101.log` |
| Current artifact validation and private deployment | PASS: source/project/hash, five protected values excluded across 2,209 files, dry run, binding/runtime preservation, activation; exit 0 | `concierge-immutable-validate.log`, `concierge-final-dry-run.log`, `concierge-final-stage-guard.json`, `concierge-final-activation.log` |

The one remaining API failure is `concierge produces an actual conversational response`: `provider is unavailable`. This check deliberately remains failing. Passing navigation and browser checks do not imply successful model responses.

The immutable Linux builds emitted existing catalogue lookup warnings about absent staging tables, including `public.sportsbooks`, while generating static pages. Those warnings were not hidden; the build/package command completed with exit 0. This acceptance does not verify database-backed sportsbook functionality.

The November 1 hosted repeat exposed two failures that the earlier green run missed: early Russian microphone input used `en-US`, and saved-history acceptance recorded React hydration error 418. The language race was reproduced deterministically and fixed. Ten further immutable hosted reloads and ten seeded development reloads did not reproduce 418; this does **not** prove that exception fixed. Later local click failures were independently traced to the moving trigger and resolved by the global CSS/readiness fix. Failed intermediate logs remain retained. Browser failures now record navigation history, timestamps, URLs and error stacks to improve future diagnosis.

Browser coverage includes homepage entry; room/dock continuity and reload; recommendations and destination buttons; saved items and reuse; empty, duplicate and long submissions; reset during an outstanding response; malformed saved data; recovery after network errors; drawer search and venue detail; focus/inert behavior; mobile layout; locale and direction checks for all 16 languages. Voice tests inject explicitly labelled recognition fixtures; no real microphone is opened.

The follow-up SQL integrity query, repeated after current hosted acceptance, returned the same aggregate row counts and digests as before concierge acceptance: bookings 13, request events 30, notification events 107, notification deliveries 214. No tested flow changed those records. The task-owned local QA server was stopped after local acceptance, with its process identity verified; no listener remained on port 3058.

An independent reviewer examined input validation, client storage/URL boundaries, navigation and asynchronous voice/reset behavior; its reported focused and reproduction checks passed after fixes. The reviewer did not validate a live model or real microphone. Tools used: Node's test runner, Playwright/Chromium, Linux Next/OpenNext, Wrangler/Cloudflare API, Supabase read-only SQL, browser inspection, official Cloudflare documentation and the Evidence Engineering skill.

Follow-up independent review reported the delayed-language regression passing, CSS declarations preserved without selector collisions, fixed/disabled first-paint trigger at widths 390 and 1280 without JavaScript, and three complete native pointer traces reaching the same trigger. Drawer opening, Komodo search and twelve Tab presses passed in those probes without browser exceptions.

## Live AI limitation and next prerequisite

The current chat chain defaults to a local FastAPI service at `127.0.0.1:8000`, then an OpenAI-compatible router at `localhost:20128`. Neither address supplies an accessible model inside the hosted Worker. Production binding inspection found no configured remote brain credentials or AI binding. Private staging deliberately has its local-brain flag off and no model credential. The separate `lib/ai/brain.js` also points to a local router; its comments do not prove a deployed external service.

Read-only investigation confirmed the existing Cloudflare account has a Workers Paid subscription in the dashboard. Listing model metadata succeeded through existing authentication, but no inference request or new AI binding was activated. The available OAuth token cannot read account subscriptions through the API (HTTP 403); the dashboard supplied the subscription evidence instead. The checked `gorgona-one-ai-agent` Worker did not provide evidence of a usable deployed model service. Unrelated tenants were not reused.

Cloudflare documents a daily free allocation and automatic overage billing on Workers Paid: <https://developers.cloudflare.com/workers-ai/platform/pricing/>. Account access or an existing subscription alone is not evidence that a chosen model works, that quota is available, or that a production cost policy exists. No new subscription, persistent credential, agreement, model service or billing setting was created or accepted.

Next work is to establish an authorized reachable model service, verify its model/terms and cost limits, connect it privately, and repeat real multilingual conversation, error and abuse-limit checks before proposing a production release. Existing navigation remains useful while this is unresolved.

## Changed files across the application commits

```text
app/api/chat/route.js
app/ai-overlays.css
app/components/LocaleProvider.jsx
app/components/ai/AIProvider.jsx
app/components/ai/AiConversation.jsx
app/components/ai/AiDock.jsx
app/components/ai/ChatProvider.jsx
app/components/ai/ConciergeRoom.jsx
app/components/ai/DiscoveryRoom.jsx
app/components/ai/DiscoveryDock.jsx
app/components/ai/useDialogFocus.js
app/components/ai/useVoice.js
app/components/home/HomeHero.jsx
app/components/home/shared.jsx
lib/ai/chatRequest.mjs
lib/ai/conversation.mjs
lib/ai/ecosystemIndex.js
lib/ai/intent.js
lib/ai/loadProvider.js
lib/ai/provider.js
lib/ai/session.mjs
lib/ai/voiceInputCopy.mjs
lib/aiSuggestions.js
lib/aiSuggestionsI18n.js
lib/ownedContent.js
scripts/concierge/audit-destinations.mjs
scripts/concierge/audit-hosted.mjs
scripts/concierge/hosted-context.mjs
tests/concierge/browser.mjs
tests/concierge/locale-browser.mjs
tests/concierge/load.cjs
tests/concierge/navigation.test.mjs
tests/concierge/offline-provider.cjs
tests/concierge/request.test.mjs
tests/concierge/route.test.mjs
tests/concierge/scenarios.mjs
tests/concierge/session.test.mjs
tests/concierge/voice.test.mjs
```

This report is an additional documentation file. Concurrent uncommitted R5 dining editor, dashboard and migration work in this checkout is outside this acceptance and is preserved; it was not bundled into the staged concierge release.

Exact follow-up checks: `node --test tests/content/*.test.mjs tests/i18n/*.test.mjs tests/concierge/*.test.mjs` (307 passed, exit 0); `node tests/concierge/locale-browser.mjs` (passed, exit 0); `node scripts/i18n/check.mjs` (16 catalogues matched, exit 0); opt-in `node tests/concierge/browser.mjs` (42 passed locally and on private staging, both exit 0); opt-in `node scripts/concierge/audit-hosted.mjs` (111 passed, 1 failed, exit 1). Hosted commands require the existing test-only staging identity variables and private gate helper; no credentials belong in documentation. Documentation/repository whitespace is checked with `git diff --check` and `git show --check --oneline HEAD`.

## Not verified

Live conversational AI, live microphone recognition, Safari/iOS hardware behavior, load/soak performance, real reservation creation and delivery, and production behavior with these unreleased fixes remain unverified. Intermittent hosted hydration 418 has not been attributed to a proven cause or declared resolved. No catalogue records or booking-provider integrations were added in this concierge-only phase. Current local browser acceptance ran in the existing checkout alongside preserved concurrent R5 changes; immutable Linux builds are materialized exclusively from saved Git objects, with all 13,483 tracked files hash-checked and zero mismatches, to exclude those changes from release artifacts.
