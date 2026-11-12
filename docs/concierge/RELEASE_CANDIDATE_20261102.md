# Discovery Room and concierge release candidate — November 2, 2026

## Decision and scope

**PASS: the bounded Discovery Room / concierge candidate is built and verified on protected staging.** No application blocker was found in the final independent review. This is not certification of every external booking provider, physical Safari/iOS or a public native-AI launch. The separate strict WebKit forced-reload suite remains **FAIL: 106/112**, retained below rather than relabeled green.

Visitors still receive recommendation buttons and choose when to navigate. Visitor access remains free. No subscription, payment collection, partner application, agreement, customer notification or production deployment was introduced. Existing catalogue records and supplier widgets were preserved; no new venue or provider permission is claimed in this phase. Concurrent R5 venue-editor work was excluded from the immutable candidate and was not overwritten.

## Implemented corrections

- Model output now selects canonical section identifiers through a strict, versioned JSON contract. The server supplies authored, localized display text. Free-form provider claims, invented listings, prices, URLs and booking confirmations cannot pass that response boundary. All three model adapters use it; explicit visitor intent retains navigation priority. Invalid output produces the existing honest unavailable response and usable local recommendations.
- Persisted discovery, conversation, theme, language and account contexts expose the server snapshot to each consumer during selective hydration. Actual-provider delayed-boundary regressions reproduced the mismatch before the fix and now cover empty/saved state, account state and a configured light theme. Existing providers, account loading and permission checks retain ownership of their state.
- Saved-language initialization avoids an unnecessary server refresh when cookie and storage already agree. Disagreement refreshes eligible pages in either direction, including a Russian cookie with saved English. Explicit language selections and protected embed exclusions remain covered.
- Local-provider deadlines now cover response-body consumption, not just receipt of headers. JSON responses are limited to 512 KiB and unfinished streams are cancelled. Provider error bodies and exception messages no longer enter route logs; status/coarse failure metadata remain available. Owned HTTP regressions cover a stalled body and an oversized body.
- Targeted lockfile overrides remove the audited vulnerable build-time glob/minimatch dependency paths. No top-level dependency was added. CI now includes concierge unit tests and five offline browser regressions alongside existing content, translation, dashboard, audit and build gates.
- QA explicitly distinguishes offline UI recovery from real model acceptance. The selected browser engine is used consistently. Navigation diagnostics retain raw messages and correlate fetch attempt IDs, document IDs, departure events and network observations; a deliberate genuine exception checks that actual JavaScript failures remain detectable.

## Exact candidate and activation

| Field | Value |
| --- | --- |
| Application commit | `d499562ec437ab11b15b45c61a20cd1b3442e06f` |
| Application tree | `2da6e37e0d229854a8019e3795275bdd2ee982b7` |
| Immutable source verification | 13,508 tracked files, zero mismatches |
| Built at | `2026-11-02T15:16:13.633Z` |
| Artifact hash | `6db83eb20267da0ee6eb61dba973b706e09ecd19eed217fee796e88672d65b44` |
| Protected staging project | `kaxslgjbrarapeyoifdh` |
| Active private Worker version | `07a80690-2420-4d00-a248-859a29e74cdc`, 100% |
| Previous private Worker version | `8311c7fc-65b3-4f06-89f3-a2938bbe4c74` |
| Public Worker version | `2fb0f528-3310-44ec-b833-26c0bc418e14`, 100%, unchanged |

All hosted acceptance below asserts the application commit and staging project before running. Binding/runtime comparison passed before private activation. The artifact scan covered 2,214 files, excluded all five checked private credential values and the browser fixture, and verified the retained Linux artifact hash. No extra Windows artifact copy was made. Later engine-selection, navigation-observer and report-only commits are QA/documentation changes, not part of the compiled application snapshot.

The successful build retains the existing missing staging `public.sportsbooks` table warning and catalogue fallback. It does not establish that all production catalogue database tables exist in staging. The warning was not suppressed or repaired through an unrelated migration.

## Fresh verification

Evidence paths below are under the sibling local `outputs/` directory. PASS rows have structured process exit 0; the failed rows retain exit 1.

| Check | Actual outcome | Evidence |
| --- | --- | --- |
| Clean Linux dependency installation | PASS: npm 10.9.9, Node 24.18.0, 410 packages installed, audit 0 vulnerabilities | `concierge-release-clean-install.log` |
| Immutable content/i18n/dashboard/concierge tests | PASS: 448/448, zero skipped/cancelled | `concierge-release-d499-linux-recheck.log` |
| Request-context isolated regression | PASS: 3/3 | `concierge-release-request-context-recheck.log` |
| Next/OpenNext build/package | PASS: one handler, 108 referenced client assets | `concierge-release-d499-build.log` |
| Language catalogue gate | PASS: all 16 catalogues match current sources and named slots | `concierge-release-final-i18n.log` |
| Local actual-component regressions | PASS in Chromium and WebKit: delayed language readiness; five restoration cases; twelve provider hydration cells; dialog focus; four voice/form recovery cases | `concierge-release-local-browsers-chromium.log`, `concierge-release-local-browsers-webkit-final.log` |
| Chromium engine-selection smoke after QA-only change | PASS | Command result for `node tests/concierge/locale-browser.mjs` |
| Hosted complete UI suite | PASS: 44/44 Chromium and 44/44 WebKit | `concierge-release-ui-{chromium,webkit}/results.json` |
| Hosted cold/reload/recommendation history | PASS: 48/48 per engine, all 16 languages | `concierge-release-hydration-{chromium,webkit}/results.json` |
| Hosted normal visitor journeys | PASS: 112/112 per engine; 114 chat requests deliberately aborted per engine, no unexpected writes | `concierge-release-journeys-{chromium,webkit}/results.json` |
| Real model acceptance | PASS: English, Russian, Chinese and multi-turn yacht scenario; five actual admissions | `concierge-release-real-model.json` |
| Real VIP/confirmation and concert-ticket requests | PASS: 2/2, actual `workers-ai` and `catalogue-v1`; correct first destinations, explicit no-confirmation guidance, zero partner calls | `concierge-release-partner-guidance.json` |
| Hosted usage/transport protection | PASS: 5/5; duplicate/conflicting request IDs cannot admit a second inference; foreign-origin JSON and form-like requests rejected | `concierge-release-usage.json` |
| Artifact, dry run, comparison, private activation | PASS at each step; bindings/runtime preserved | `concierge-release-final-dry-run.log`, `concierge-release-final-guard.json`, `concierge-release-final-activation.log`; artifact-validator command output |
| Deployment metadata | PASS: public unchanged, private candidate active | `concierge-release-deployments.json` |
| WebKit forced-document-reload journeys, raw errors | **FAIL: 106/112**, six same-origin access-control diagnostics; no error filter was added to this suite | `concierge-release-reload-webkit/results.json` |
| Dedicated WebKit navigation provenance | PASS: 11/11; ten navigation cases, zero native application exceptions, genuine-error positive control captured | `concierge-release-navigation-webkit-provenance/results.json` |

The large UI/history/journey suites block model calls. They verify actual hosted forms, serialization, storage, navigation, localized recovery, keyboard focus, mobile overflow and voice failure/recovery fixtures, not external availability or microphone hardware. The small real-model probes are separate evidence. The customer/account security and SQL/RLS tests use disposable database fixtures, not a new live customer account.

### Retained failures and diagnostic limits

An earlier final Linux run, executed alongside the build and browser suites, exited 1 with a file-level failure in `request-context.test.mjs` after approximately 103 seconds and no individual assertion detail (`concierge-release-d499-linux-tests.log`). Its exact cause was not established. The immutable file passed independently in 2.6 seconds, then the unchanged full suite passed 448/448. No assertion was removed, no test was skipped, and no speculative application fix was made to hide the first failure.

The forced-reload WebKit run still has six failures and is not considered passing. A separate instrumented run retained nine raw page-error messages: one deliberate genuine exception and eight RSC access-control diagnostics. All eight correlated with a new fetch attempted after departure of its own document, a matching TypeError, and no matching Playwright request event during that attempt. Native `window.error` / `unhandledrejection` capture found no application exception in the ten navigation cases. Readiness in that run was 353–851 ms. This supports a document-replacement explanation consistent with the [upstream WebKit/Playwright issue](https://github.com/microsoft/playwright/issues/43120); it does not prove absence of server ingress, retroactively classify every older message, or establish that all WebKit errors have disappeared.

Initial diagnostic runs failed separately: a 5-second readiness deadline, overly broad prior-URL accounting, and an observer treating `URL` objects as `/undefined`. The final observer supports URL/string/Request inputs, preserves fulfillment values and rethrows rejections. Those failed reports remain in `concierge-release-navigation-webkit/`, `...-strict/` and `...-traced/`. The 15-second readiness assertion matches the main hosted UI suite. Independent review recomputed all eight final correlations and confirmed the genuine-error control. No browser error-reporting behavior in the production app was modified.

## Data, limits and rollback

Read-only SQL confirms existing rows still match the prior full-row snapshot. The digest definition is `md5(string_agg(to_jsonb(row)::text, E'\n' order by id))`.

| Area | Rows | Digest |
| --- | --- | --- |
| Bookings | 13 | `5e4bcf619c2dd689761ece3f4409b747` |
| Request events | 30 | `5747e3cecaf3bfc78005890ef9e79104` |
| Notification events | 107 | `aeec606495fd620f5d7121d533c5c4e5` |
| Notification deliveries | 214 | `e296b828ec26713a3bfe5e2022d9eac4` |

Eight real model admissions were used in this final hosted phase. Read-only verification now shows 62 calls / 186,712 input bytes / 23,808 reserved output tokens for UTC November 2. The existing service-only daily policy was neither raised nor reset: 64 calls / 400,000 input bytes / 24,576 reserved output tokens, with 24 admissions per client window. Counters are conservative reservations, not a bill or a guarantee of successful replies. Visitor access remains free. No secret, billing setting or permanent credential changed. No migration was applied in this release phase.

Private UI rollback can restore version `8311c7fc-65b3-4f06-89f3-a2938bbe4c74`; its older model response policy is weaker, so an AI safety incident should first disable the existing service-only admission policy. A pre-native-AI fallback version remains documented in [usage control](./USAGE_CONTROL_20261101.md). Preserve additive tables and audit records. Public activation is a separate release operation; the native model adapter remains explicitly staging-gated in application code.

## Unverified boundaries

- **NOT TESTED:** physical Safari/iPhone, microphone recognition/permissions on actual hardware, live legacy local/router model deployments, remote GitHub CI execution and a full production-domain regression of this unpublished candidate.
- **NOT VERIFIED:** provider invoices or commercial/API permission grants. No new OpenTable, SevenRooms, Discotech, TablelistPro or Headout production booking access is asserted. This candidate creates no partner reservation or payment. Referral/widget availability and existing supported request handling remain distinct from confirmed direct booking.
- **EXCLUDED:** unrelated dirty R5 editor/backend/migration changes. They need their own final source snapshot and acceptance before inclusion in a release. This report does not certify the entire R1–R5 ecosystem as complete.
- **RETAINED QA LIMITATION:** the strict forced-reload WebKit suite is 106/112. The separately proven lifecycle diagnostics support the bounded candidate decision but do not convert that suite to PASS.

## Changed files

The release work since `f87d10df` changed these files; existing focus/voice/metering implementation is retained. All unrelated R5 working-tree files remain excluded.

```text
.github/workflows/ci.yml
package.json
package-lock.json
app/api/chat/route.js
app/components/AuthProvider.jsx
app/components/LocaleProvider.jsx
app/components/ThemeProvider.jsx
app/components/useHydratedValue.js
app/components/ai/AIProvider.jsx
app/components/ai/ChatProvider.jsx
lib/ai/groundedReply.mjs
lib/ai/localBrain.js
lib/ai/workersBrain.mjs
lib/aiSuggestions.js
tests/concierge/browser.mjs
tests/concierge/deferred-hydration-browser.mjs
tests/concierge/grounded.test.mjs
tests/concierge/local-body.test.mjs
tests/concierge/locale-browser.mjs
tests/concierge/locale-restoration-browser.mjs
tests/concierge/navigation-diagnostics-browser.mjs
tests/concierge/route.test.mjs
tests/concierge/workers-ai.test.mjs
docs/concierge/RELEASE_CANDIDATE_20261102.md
```

Tools used: Git, Node/npm, WSL, Next/OpenNext, Wrangler/Cloudflare private deployment, Playwright Chromium 153 and WebKit 27.2, Supabase read-only SQL, official upstream advisory/issue sources and the Evidence Engineering skill with an independent reviewer. No new tooling dependency or partner agreement was introduced. Final documentation/whitespace checks are the subsequent standalone `git diff --check` and `git show --check --oneline HEAD` process results.
