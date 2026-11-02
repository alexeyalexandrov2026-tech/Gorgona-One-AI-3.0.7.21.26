# Release sign-off — November 2, 2026

**READY TO ACTIVATE: the existing public Discovery Room / free concierge navigation, referral and supported request functionality.** Preparation and scoped acceptance are complete. No remaining application blocker was found in independent review. This is a release of the tested current functionality, not completion of every R1–R5 provider integration. New direct partner booking and native cloud-AI features remain disabled.

## Prepared production version

- Inactive production candidate: `31762a75-2b42-41d0-8dad-97a4cb268907`.
- [HTTPS candidate preview](https://31762a75-gorgonaoneai3072126.alexey-alexandrov2026.workers.dev).
- Immutable application/QA snapshot: `1097c5871bc8eb444a887f93931dc03d4741eead`; tree `a07d75605b91092c55195b3d1601a9455787e037`. All 13,509 tracked files matched Git objects. Runtime code is unchanged from the previously tested `d499562e`; subsequent changes are CI, QA and documentation only.
- Production Supabase project: `ctszqhhvalyqxhbfqifx`. This artifact was built separately from the staging artifact, using only the existing public URL/key and no privileged build values.
- Build completed at `2026-11-02T16:08:55.435Z`; artifact hash `e3a39f865f5c6a3d50c0de26a88fb4eec2ad6967500f1caadb4689f0cdccbc2b`.
- Current active public version and rollback target: `2fb0f528-3310-44ec-b833-26c0bc418e14`, still serving 100%. Uploading the candidate did not activate it, change DNS/triggers, apply a database migration or switch customer traffic.

## Completed release checks

Evidence is retained in the sibling local `outputs/` directory. Every PASS below has a structured process exit 0.

| Gate | Outcome | Evidence |
| --- | --- | --- |
| Production Next/OpenNext package | PASS: one handler, 108 referenced client assets | `concierge-production-build.log` |
| Immutable full content/i18n/dashboard/concierge suite | PASS: 448/448, zero failures, cancellations or skips; 47.53 seconds | `concierge-production-linux-bounded.log` |
| Production-artifact Chromium and WebKit UI | PASS: 44/44 per engine, original Worker entry, canonical localhost origin | `concierge-production-browser-final-{chromium,webkit}/results.json` |
| Local production-artifact site/photo/referral smoke | PASS: 70/70 | `concierge-production-site-smoke.json` |
| Local production-artifact chat/transport checks | PASS: 7/7, correct canonical destinations and rejection of foreign origins | `concierge-production-api.json` |
| Actual inactive HTTPS version site/photo/referral smoke | PASS: 70/70 | `concierge-production-preview-site.json` |
| Actual inactive HTTPS version chat/transport checks | PASS: 7/7 | `concierge-production-preview-api.json` |
| Artifact identity and credential/client-config scan | PASS: unchanged hash; 2,214 files; five checked private values absent; zero staging-project references in 670 client assets; production URL/key present | `concierge-production-final-validation.log`, `concierge-production-validation.json` |
| Packaging dry run and inactive upload | PASS, upload uses `--keep-vars`; no traffic activation | `concierge-production-preserved-dry-run.log`, `concierge-production-inactive-upload.log` |
| Production binding/runtime comparison | PASS: all 11 binding definitions and API-visible values preserved; runtime unchanged; active version unchanged | `concierge-production-version-guard.json` |
| Non-versioned settings | PASS: existing logpush off, zero tail consumers and observability on match the prepared release | Same version guard |
| QA allowlist and CI configuration | PASS: seven localhost/foreign-host/explicit-opt-in cases; helper syntax; parsed YAML retains all four test groups | Command results |

The HTTPS chat checks verify the honest navigation fallback: HTTP 200, usable destination buttons, `source:navigation`, `configured:false`, `error:true`. They do not claim successful model inference. A separate read of the already-published old chat also returned its unavailable response with a yacht destination before any activation. This release does not turn off an existing working public model service or enable a new paid one. Visitor use remains free. The earlier staging real-model acceptance is separate and remains documented in the [candidate report](./RELEASE_CANDIDATE_20261102.md).

The 70-check smoke verifies current venue routes and exact image hashes, filtering, preserved experience/private-jet channels, destination pages, accurate referral availability, unauthenticated dashboard rejection and the disabled dining-write gate. Its synthetic dining POST is rejected with 503 before database access. No external reservation, payment, email, partner application or agreement is made.

## Final corrections and retained diagnostics

The production packaging rehearsal initially failed because this WSL installation had no system CA bundle. The local runtime now uses the installed Node distribution's root certificates through `SSL_CERT_FILE`; certificate verification was not disabled. OpenNext's local request origin is `localhost`, so QA now permits the exact `http://localhost:3058` address alongside its existing exact loopback address. Foreign hosts, other ports, other loopback IPs and lack of explicit QA opt-in remain rejected. This is a QA helper change, not a public authentication exception. Initial origin probes/failed harness reports remain retained. An earlier 127.0.0.1 WebKit run had one unhydrated-page failure during the operator's server restart; the final original-entry localhost suites ran against a stable server and passed 44/44 in both engines.

A fresh unrestricted Linux test run failed at file level during an observed global out-of-memory event. The guest exposes 12 CPUs but only approximately 7.8 GiB RAM; parallel PGlite fixtures own separate database heaps. The kernel recorded killing a Node process at `2026-11-02T16:25:37` (`concierge-production-memory-cause.log`). The text test report does not map that killed PID to an exact test file, so no assertion failure is inferred. CI now uses `--test-concurrency=2`, preserving all four test groups and every assertion. The unchanged immutable suite then passed 448/448 with zero skips in 47.53 seconds. The initial failed log remains in `concierge-production-linux-tests.log`.

The prior strict WebKit forced-reload suite remains 106/112 and is not relabeled PASS. Independent document/fetch tracing supported cancellation/refusal during departure rather than an application exception; normal visitor journeys previously passed 112/112 in each engine. The [candidate report](./RELEASE_CANDIDATE_20261102.md) retains the raw failures, 11/11 diagnostic evidence, precise inference limits and upstream reference. This browser-harness limitation is not evidence that the existing customer flow fails and is not treated as an application activation blocker.

## Activation boundary and remaining scope

The prepared version preserves all 11 current binding definitions and their API-visible values using `--keep-vars` and an exact comparison against the active version. Secret contents are opaque in Cloudflare version metadata; their raw value equality was not independently read or exposed. Compatibility/runtime settings match. The public feature flags still disable the new dining schema/write path; no AI binding, sandbox provider capability or new subscription is added.

Before an eventual activation, rerun `outputs/concierge-production-version-guard.mjs` and refuse if active version, bindings, runtime or relevant non-versioned settings have changed. Activate the saved candidate only, then repeat same-origin chat, unauthenticated dashboard, site/referral and public-project checks on the main domain. Main-domain activation and its post-activation verification were not performed in this preparation task. Cloudflare distinguishes [uploading a version from activating a deployment](https://developers.cloudflare.com/workers/versions-and-deployments/).

Physical Safari/iPhone and actual microphone hardware remain untested. No new Headout/OpenTable/SevenRooms/Discotech/TablelistPro production booking grant is asserted. These integrations remain gated; they are not represented as operational direct bookings. Existing valid catalogue, referrals and request channels can be released independently of those permissions. Unrelated uncommitted R5 editor/backend/migration work is excluded and preserved. Remote GitHub CI was not dispatched; the listed checks were executed locally and against the HTTPS candidate.

Changed repository files in this final preparation: `.github/workflows/ci.yml` (memory-bounded complete test runner), `scripts/concierge/hosted-context.mjs` (exact canonical local QA origin), and this report. Existing application fixes and their full changed-file list remain in the earlier candidate report. External preparation scripts, receipts and logs are local evidence outside the repository. Tools reused: Git, Node/npm, WSL, Next/OpenNext, Wrangler, Playwright, Cloudflare's existing account and Evidence Engineering independent review. No new package or external integration was installed.
