# Durable AI usage protection

This stage adds technical usage protection to the existing private concierge pilot. **The concierge remains free to visitors.** No subscription, payment flow or provider billing setting is changed. These are application usage ceilings, not a guarantee that Cloudflare's entire account invoice is zero or capped; other account workloads and provider pricing remain outside this module.

## Acceptance and reuse

- Atomically reserve capacity in the existing Supabase project before each native model call; never use a per-isolate counter as a global limit.
- Prevent repeated request IDs from starting inference twice, including simultaneous requests.
- Reject cross-origin/form-like browser traffic before quota admission.
- Fail closed when identity, credentials, configuration or the database is missing. A denied metered engine must not start an unmetered fallback engine.
- Preserve canonical recommendations, existing booking data, authentication and public production behavior.

The implementation reuses `database`, `digest` and `requireKey` from the established server boundary, the existing rate-limit table, the current chat input/navigation contracts, and the installed Postgres test infrastructure. No dependency or authentication system is added. The HMAC key is the existing server-only rate secret with distinct purpose prefixes. Neither raw IP addresses nor transcripts are stored in the new tables.

## Policy and behavior

The private pilot defaults to **64 admitted model calls, 400,000 serialized model-message UTF-8 bytes, and 24,576 reserved output tokens per database UTC day**. Each call is still limited to 24,000 model-message bytes and 384 output tokens. A daily anonymized client IP has a fixed ten-minute window allowing 24 calls. The service-only database policy owns these values; request bodies cannot raise them. These defaults are for a restricted pilot and require traffic planning before a public launch.

`concierge_ai_reserve` takes a UUID advisory lock followed by a locked UTC-day row, then checks all day/client dimensions and writes the admission receipt in one transaction. The same request ID is denied on replay; a changed fingerprint/client is a conflict. Responses are not cached in the database. The browser assigns one request UUID per send; older/non-browser callers without a key receive a server-generated key. Admission reservations are conservative: failure, timeout or disconnect does not refund capacity because native inference might already be running.

The service stores only UUIDs, daily HMAC identities, HMAC fingerprints, byte/token ceilings and timestamps. Claims older than seven days and this module's rate rows older than one day are deleted **on the next admitted request**. This is opportunistic cleanup, not a guaranteed seven-day expiry: idle, disabled or continually denied operation can retain records longer. Aggregate UTC day counters are retained. Booking rate-limit rows are not touched.

All three new tables are private, RLS-enabled and inaccessible to anonymous/authenticated browser roles. The public RPC is an invoker function with an empty search path and execution granted only to `service_role`. Privileges are deliberately denied even to a browser session whose profile is an administrator. The project's existing verified server boundary remains responsible for privileged access.

Chat POSTs now require JSON. A supplied Origin must match the request's origin; Fetch Metadata must be `same-origin` or `none` when supplied. Non-browser authorized callers may omit those browser headers. The ingress IP comes from Cloudflare's header, not the JSON body or X-Forwarded-For. Missing ingress identity denies inference.

Quota denial, database failure and enabled-but-broken cloud configuration return the established visible unavailable answer with canonical navigation buttons. They do not invoke another model. Explicitly disabling the optional cloud feature preserves the established legacy-engine behavior.

## Source and database verification

Initial metered application source: `8925a11395b36c90288bc2e88e15376317d55f69`, tree `8c33b4f0294f5253e80d8ee86695ed046bd013a7`. All 13,492 tracked files matched materialized Git objects, excluding concurrent uncommitted R5 work. Linux build/package passed with one handler and 108 referenced client assets. Initial artifact hash: `ec0c7df2cce314701bb5e135932b79ca89503786a11b597ef5f3657fd5b5d94a`, built November 2 at 03:25 UTC. The final application snapshot and its fresh acceptance results are recorded below. Existing staging catalogue-table warnings remain visible in the build logs.

The additive migration `20261102030000_concierge_usage.sql` was applied only to staging project `kaxslgjbrarapeyoifdh`, after schema inspection, privilege tests and independent SQL review. Existing profiles, bookings, venue data and production schema were not altered by this migration.

Executed checks:

| Check | Actual outcome | Evidence in sibling `outputs/` |
| --- | --- | --- |
| Immutable content/i18n/concierge tests | PASS: 322/322, zero skipped, exit 0 | `concierge-usage-immutable-tests.log` |
| Immutable existing dashboard/server tests | PASS: 117/117, zero skipped, exit 0 | `concierge-usage-dashboard-tests.log` |
| Translation catalogue check | PASS: all 16 catalogues match, exit 0 | `concierge-usage-i18n.log` |
| PGlite migration and privilege tests | PASS: 3/3, exit 0 | `concierge-usage-db-green.log` |
| Actual route/usage/adapter contracts | PASS: 17/17, exit 0 | `concierge-usage-csrf.log` |
| Native Postgres multi-session global admission | PASS: 16 concurrent calls, exactly 8 admitted and 8 budget-denied, exit 0 | `concierge-usage-concurrency.json` |
| Native Postgres multi-session duplicate admission | PASS: 16 simultaneous calls using one ID, exactly 1 admitted and 15 duplicate-denied, exit 0 | `concierge-usage-duplicate-concurrency.json` |
| Anonymous native RPC | PASS: HTTP 401; both anonymous/authenticated execute privileges false | Native concurrency receipts and SQL inspection |

For the hosted concurrency test, the staging-only call ceiling was temporarily reduced to eight, then restored to the defaults and read back. Both concurrency probes invoked only metadata reservation RPCs: zero model calls and zero booking calls. Nine synthetic metadata reservations remain conservatively counted; no usage credit was refunded. Test fixtures and red regressions are retained. PGlite's single connection was not misrepresented as multi-session concurrency.

Supabase security advisors were checked before/after DDL. The three new private tables add expected INFO notices for RLS without browser policies, consistent with their deliberately service-only access. The pre-existing leaked-password-protection WARN remains unrelated and unchanged; its documented remediation is [leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Relevant references: [private service-role/RLS boundaries](https://supabase.com/docs/guides/database/postgres/row-level-security), [function permissions](https://supabase.com/docs/guides/database/functions).

Independent review found and reproduced an enabled-but-missing-binding path that could invoke a legacy engine, and a cross-origin form-like request path. Both were fixed and covered by regression checks. The final bounded review reported 23 focused checks passing and no remaining blocker for protected staging. It did not rerun the hosted concurrency probes.

## Final protected release and acceptance

Final application source: `9cd349f03cf82f5376c31fd88f3e3d558b1ec2f0`, tree `636863f197e38caac06dce0fb3c99d5b089c378c`. All 13,493 tracked files matched materialized Git objects. The final Linux build/package passed with one handler and 108 referenced client assets. Built at `2026-11-02T03:50:46.184Z`, artifact hash `f751e936192c4df7067139723af730a3404b6e2ba324ff2e3d9e7344768b38be`. Artifact validation scanned 2,210 files and excluded all five protected values; the dry run passed. Concurrent R5 changes were excluded from this immutable build and remain untouched in the working checkout.

Private Worker `miami-elio-dashboard-staging` runs version `9fb93531-790d-4ba2-a959-8c4cd30fbcf8` at 100%. The existing staging access gate, project pin, no-index/no-store behavior and notification-dispatch block remain in place. A read-only deployment inspection at `2026-11-02T04:05:53.428Z` confirmed public Worker `gorgonaoneai3072126` still runs version `2fb0f528-3310-44ec-b833-26c0bc418e14` at 100%, created October 31 at 20:31 UTC. This phase did not deploy production.

| Final or hosted check | Actual outcome and source | Evidence in sibling `outputs/` |
| --- | --- | --- |
| Final immutable content/i18n/concierge tests | PASS: 323/323, zero skipped, exit 0; source `9cd349f0` | `concierge-usage-final-immutable-tests.log` |
| Hosted admission, replay, changed-body conflict, foreign-origin JSON and form-like traffic | PASS: 5/5, exit 0; source `9cd349f0` | `concierge-usage-final-hosted.json` |
| Actual native AI replies in 16 languages plus multi-turn continuation | PASS: 17/17, exit 0; source `9cd349f0`, native AI required | `concierge-usage-final-live-ai.json` |
| Discovery Room, dock/history, recommendation destinations, keyboard/focus, network retry, reset, mobile layouts and voice fixtures | PASS: 42/42, exit 0; source `8925a113` | `concierge-usage-browser/results.json` |
| Final immutable source, build/package, artifact validation, deployment dry run and private activation | PASS: exit 0 at each stage; source `9cd349f0` | `concierge-usage-final-source.log`, `concierge-usage-final-build.log`, `concierge-usage-final-validate.log`, `concierge-usage-final-dry-run.log`, `concierge-usage-final-activation.log` |

The full browser suite and 117 existing dashboard tests ran on the initial metered source `8925a113`, before the final narrow server response-filter change. No frontend code or SQL changed between that source and `9cd349f0`; those suites were not repeated on the final source. The older 112-case general chat API suite was not rerun in this phase: its model cases would exceed the deliberately small pilot allowance. Real microphone hardware and Safari/iOS were not covered by voice fixtures.

The first metered live AI run genuinely failed: 16/17 passed and the multi-turn case returned the navigation fallback (`concierge-usage-live-ai.json`, exit 1). Two operator diagnostic calls went through the same durable admission gate and reproduced a filter rejecting valid advice: “availability ... should be confirmed through” was read as an already confirmed booking. The exact original failing model reply was not retained, so the reproduction is evidence of the defect, not proof of that original reply's precise wording. A regression test failed before the fix (`concierge-availability-advice-red.log`). The narrow fix normalizes this advisory construction before the existing confirmation filter; the completed-booking claims covered by regression tests remained rejected. The language guard is heuristic and does not guarantee factual correctness for every generated reply. Independent review reran 12 focused tests successfully. The final live audit kept all 17 default scenarios and passed; no failing scenario was removed.

At the end of acceptance, the database UTC day `2026-11-02` recorded 54 admitted calls, 153,921 input bytes and 20,736 reserved output tokens, within the unchanged defaults of 64 / 400,000 / 24,576. These counters include nine metadata-only concurrency admissions and two operator diagnostic model admissions. They are conservative reservations, not a provider invoice or a count of successful replies. No reservations were refunded. Further model testing was stopped to leave capacity for private review.

Read-only row counts and full-row digests still match the pre-test snapshot:

| Existing area | Rows | MD5 of ordered serialized rows |
| --- | --- | --- |
| Bookings | 13 | `5e4bcf619c2dd689761ece3f4409b747` |
| Request events | 30 | `5747e3cecaf3bfc78005890ef9e79104` |
| Notification events | 107 | `aeec606495fd620f5d7121d533c5c4e5` |
| Notification deliveries | 214 | `e296b828ec26713a3bfe5e2022d9eac4` |

No live reservation, cancellation or customer notification was created by these probes. A billing-subscription read returned HTTP 403 with the existing token, so provider invoice/subscription state was not independently verified. No billing setting or subscription was modified. Actual native inference and deployment state were verified separately with successful authorized requests.

## Follow-up: saved-session hydration acceptance

Added `tests/concierge/hydration-browser.mjs`, a private-staging-only audit reusing the established `hostedContext`, installed Playwright, supported-language list and application storage contracts. No application code, dependency, database or deployment changed. Acceptance is explicit: saved conversation and Discovery history/cards survive cold load, reload and a restored `/yachts` recommendation followed by a fresh `/discovery` load; all 16 locales retain their language/direction; runtime exceptions and hydration warnings fail the check.

The browser fixture seeds each disposable context only once. Later document loads use the application's real persisted writes, rather than re-seeding storage on every reload. All API requests are intercepted and aborted except read-only GETs for listing photographs; any attempted model, booking or other API request fails acceptance. No model or reservation endpoint was invoked.

- **PASS: 48/48 hosted checks, exit 0**, against application source `9cd349f0`. Evidence: `outputs/concierge-hydration-accepted-20261102/results.json` and sibling `.log`.
- **PASS: 209/209 focused navigation, session, request and voice-copy tests, zero skipped, exit 0**. Evidence: `outputs/concierge-hydration-focused-tests.log`.
- **PASS: `node --check tests/concierge/hydration-browser.mjs`, exit 0**.

Initial QA setup was not green: the expected Playwright browser revision was absent, so the existing installed Chromium was selected explicitly with `I18N_BROWSER_EXECUTABLE`, without downloading a package/browser. An initial run was interrupted after identifying an exact-text assertion that failed to account for the visible history icon. A subsequent complete run recorded 32 passes and 16 failures because the audit incorrectly treated GET listing photographs as model/booking traffic. Its retained `outputs/concierge-hydration-final-20261102/results.json` records no runtime errors in those failures. The corrected policy allows only those read-only photographs; all side-effect/model boundaries remain blocked. These are QA harness corrections, not application defect fixes.

The prior intermittent React 418 did not recur. This does not establish its cause or prove it resolved. The audit used desktop Chromium with mobile viewports, not real Safari/iOS or microphone hardware. No new production build was required or claimed for these test/documentation-only changes; the deployed application remains the previously validated immutable artifact.

## Follow-up: recognition initialization failures

Changed `app/components/ai/useVoice.js` to contain exceptions across browser recognition construction, configuration and start, using the existing error state and text fallback. The previous owner is invalidated before stopping it. A failed recognition loses ownership before cleanup, so a delayed result cannot submit a stale request. No new abstraction, dependency, permissions flow or provider was added.

Added `tests/concierge/voice-lifecycle-browser.mjs`, reusing installed esbuild/Playwright and the real voice hook, `ChatProvider` and `AiConversation`. Its recognition API, offline transport and framework router/link are explicitly isolated test fixtures: the form and href are real application output, while framework navigation itself is covered by the separate hosted audit. The fixture opens no microphone and calls no model/booking service.

The constructor-failure regression failed against the unchanged implementation with an uncaught `Fixture constructor failure` (exit 1, `outputs/concierge-voice-lifecycle-red.log`). After the fix, four browser cases pass (exit 0, `outputs/concierge-voice-lifecycle-green.log`): constructor, language configuration and start failures each remain contained, ignore stale results and permit subsequent dictation; the real conversation form also recovers through text and produces the yacht recommendation. During expansion of the isolated test to the real form, missing UTF-8 headers and framework-only browser assumptions were corrected in the harness, not application code.

The delayed-language browser regression also passes (exit 0, `outputs/concierge-voice-locale-green.log`). Content/i18n/concierge tests pass **323/323**, zero skipped, exit 0 (`outputs/concierge-voice-full-tests.log`). The test bundles compile the changed hook and actual form with installed esbuild. No fresh Next production build or hosted deployment is claimed for this local fix; the protected hosted release still uses `9cd349f0`. Real microphone hardware, Safari/iOS and the earlier intermittent hydration cause remain unverified.

## Release boundaries

The pilot remains restricted to authenticated staging. Provider-language factual accuracy, a public response policy, public front-door abuse protection, real microphone/Safari/iOS acceptance and the previously observed intermittent hydration issue remain separate readiness items. A usage cap alone does not resolve those items or authorize public publication.

Safe operational stop: set the service-only policy `enabled=false` on the current metered application, or restore private Worker version `f3304e77-a53e-4d45-997a-73188036e090` which predates the native AI binding. Retain the additive tables and audit records. Do not use an older unmetered AI-enabled version as a rollback expecting the new database guard to protect code that never calls it.

Changed files:

```text
app/api/chat/route.js
app/components/ai/ChatProvider.jsx
app/components/ai/useVoice.js
lib/ai/chatRequest.mjs
lib/ai/workersBrain.mjs
lib/server/conciergeUsage.mjs
supabase/migrations/20261102030000_concierge_usage.sql
tests/concierge/route.test.mjs
tests/concierge/workers-ai.test.mjs
tests/concierge/usage-db.test.mjs
tests/concierge/usage.test.mjs
tests/concierge/hydration-browser.mjs
tests/concierge/voice-lifecycle-browser.mjs
scripts/concierge/audit-usage.mjs
scripts/concierge/audit-live-ai.mjs
docs/concierge/USAGE_CONTROL_20261101.md
```

The hosted audit scripts are QA additions and are not runtime dependencies. This report follows the final application snapshot and is not part of its compiled artifact. Final whitespace/documentation validation is recorded by the subsequent standalone `git diff --check` and `git show --check --oneline HEAD` commands.
