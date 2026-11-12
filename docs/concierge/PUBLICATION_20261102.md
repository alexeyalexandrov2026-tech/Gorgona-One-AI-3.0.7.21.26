# Production publication and post-release verification — November 2, 2026

**PUBLISHED AND VERIFIED:** [gorgona-one.com](https://gorgona-one.com) serves the approved Discovery Room / free navigation concierge release. All final checks listed below passed. No blocking application regression was found in the executed scope; rollback was not needed.

## Published identity

| Field | Verified value |
| --- | --- |
| Worker | `gorgonaoneai3072126` |
| Active version | `31762a75-2b42-41d0-8dad-97a4cb268907`, 100% traffic |
| Deployment ID | `97f7b15e-054b-453f-9a1a-b37170d67f53` |
| Activated at | `2026-11-02T17:41:22.313217Z` |
| Immutable artifact source | `1097c5871bc8eb444a887f93931dc03d4741eead` |
| Source tree | `a07d75605b91092c55195b3d1601a9455787e037` |
| Artifact hash | `e3a39f865f5c6a3d50c0de26a88fb4eec2ad6967500f1caadb4689f0cdccbc2b` |
| Production Supabase project | `ctszqhhvalyqxhbfqifx` |
| Previous version / rollback target | `2fb0f528-3310-44ec-b833-26c0bc418e14` |

The owner explicitly authorized publication and post-publication tests. The pre-activation guard rechecked the previous active version, all 11 binding definitions/API-visible values, runtime compatibility and the relevant non-versioned settings. The already uploaded and tested candidate was then activated with `wrangler versions deploy`; no new build or replacement runtime source was introduced. Subsequent CI, QA-helper and report changes are outside the application artifact. Unrelated dirty R5 editor/backend/migration work remains excluded and preserved.

Post-deployment Cloudflare metadata confirms the saved version at 100%. Twenty-five JavaScript assets referenced by the live home, Discovery Room and dining pages returned 200 and matched the saved production artifact byte-for-byte. The production public URL/key was found in those assets, with no staging-project reference. The guard also confirms preserved binding definitions/API-visible values, runtime settings, logpush off, empty tail consumers and observability enabled. Secret contents are opaque to version metadata; raw secret-value equality was not read or exposed. No DNS/trigger change, database migration, paid-service activation or new permanent credential was introduced.

Evidence: sibling `outputs/concierge-production-activation.log`, `concierge-production-postdeploy-guard.json`, and the [preparation sign-off](./RELEASE_SIGNOFF_20261102.md).

## Checks executed after publication

All PASS results below have structured process exit 0. Browser tests use isolated disposable contexts. The actual browser engines are Chromium 153.0.8010.12 and WebKit 27.2 on Windows, including mobile/RTL viewports.

| Check | Result | Evidence under sibling `outputs/` |
| --- | --- | --- |
| Immutable content/i18n/dashboard/concierge unit and integration suite | PASS: 448/448; zero skips/cancellations; 51.17 seconds, process concurrency 2 | `concierge-postpublish-linux-tests.log` |
| Live full UI suite | PASS: 44/44 per engine | `concierge-live-ui-{chromium,webkit}/results.json` |
| Live saved-history hydration/reload/recommendation return | PASS: 48/48 per engine, all 16 languages | `concierge-live-hydration-{chromium,webkit}/results.json` |
| Live visitor journeys | PASS: 112/112 per engine; 88 locale/destination combinations returned 200; 114 serialized chat requests aborted per engine; zero unexpected application writes | `concierge-live-journeys-final-{chromium,webkit}/results.json` |
| Actual main-domain chat requests | PASS: 112/112 scenarios, 114 HTTP requests, all 16 languages; primary/mixed intent, follow-up context and unrelated-topic clearing | `concierge-live-all-api.json` |
| Focused actual chat/transport smoke | PASS: 7/7 | `concierge-production-live-api.json` |
| Public pages, venue routes, exact image hashes, filters, preserved partner channels, accurate referral availability and disabled dining-write gate | PASS: 70/70 | `concierge-production-live-site.json` |
| Anonymous dashboard/transport security | PASS: 11/11; customer/partner/admin data routes reject unauthenticated access with 401 and no-store; invalid chat requests reject with 403/415/400/413 | `concierge-live-security.json` |
| Fresh dependency audit | PASS: 0 reported vulnerabilities across all severities | `concierge-postpublish-audit.json` |
| Published runtime/configuration/client assets | PASS: 11 bindings, runtime, relevant settings, correct public project, 25 exact asset hashes | `concierge-production-postdeploy-guard.json` |
| Public QA boundaries | PASS: four negative cases reject missing explicit opt-in or an unapproved domain before a browser/network starts; harness syntax checks pass | Command results |
| Aggregate release acceptance | PASS: all required report identities, counts, API statuses and safety invariants asserted | `concierge-publication-acceptance.json` |

The UI suite exercises the live chat transport where applicable, plus intentional network/voice fault fixtures. The journey suite separately aborts chat to verify the real form serialization and localized offline recovery; the history suite blocks API traffic except read-only listing photographs. The actual HTTP suite independently verifies the public server path. These layers are distinct and do not substitute a mocked answer for real model inference.

The public chat remains in the approved navigation fallback mode: HTTP 200, useful canonical buttons, localized unavailable-model text, `source:navigation`, `configured:false`, `error:true`. No successful model inference is claimed. Visitor access remains free. New native cloud AI and direct partner booking features remain disabled; referral links and existing supported requests retain their previous status. Reservations, payments and confirmations are not invented.

## QA corrections and retained evidence

The history/journey harnesses originally allowed protected staging only. For this authorized live release test, they now additionally accept the exact production domain with `CONCIERGE_PUBLIC_READONLY=1`; the existing hosted opt-in remains required. A staging gate cookie is added only when one exists. Production receives no staging credential. Existing write/model blockers, error assertions, scenario matrix and destination checks remain in place. This is QA-only code and did not require another production deployment.

The first main-domain journey run in each engine passed all 112 visitor scenarios but exited 1 at the final write-integrity assertion: 392 blocked `POST /cdn-cgi/rum` attempts were counted as unexpected application writes. That exact path/method is Cloudflare's existing performance beacon endpoint, as documented in the [official FAQ](https://developers.cloudflare.com/web-analytics/faq/) and [data collection documentation](https://developers.cloudflare.com/web-analytics/data-metrics/data-origin-and-collection/). The harness now still aborts those exact same-origin telemetry requests and records them separately; every other unexpected non-GET/HEAD application request remains blocked and fails acceptance. Both complete 112-case suites were rerun, rather than dropping cases or relaxing booking-write assertions. Final reports retain the blocked telemetry count and zero unexpected writes. Failed initial reports remain in `concierge-live-journeys-{chromium,webkit}/results.json` and were not overwritten.

The older forced-document-reload WebKit 106/112 diagnostic from preparation is also retained in the [candidate report](./RELEASE_CANDIDATE_20261102.md). It was not reclassified as a passing test or claimed fixed. This publication's normal visitor journeys and saved-history reload checks passed without a page-error filter.

Independent review inspected the pre/post activation guard, source scope, published asset matching, final JSON reports, full test summary and QA-only boundary changes. It made no extra provider, model or customer-write calls. The application was not changed to accommodate telemetry or test diagnostics.

## Data and remaining verification boundaries

Read-only production SQL snapshots at the start of post-publication QA and again after the suites matched in both row count and complete ordered-row digest. Digest definition: `md5(string_agg(to_jsonb(row)::text, E'\n' order by id))`.

| Production area | Rows | Unchanged digest |
| --- | --- | --- |
| Bookings | 4 | `9a1310840c93c17cf1e734bf9a9c5d78` |
| Request events | 4 | `a94cb12e9134f03118793b6e1130d036` |
| Notification events | 5 | `32d9215f09e2b958af4773e9b9d213a3` |
| Notification deliveries | 9 | `3ad0b04c1b6b9c3d23e07795c31b7f8c` |

No real reservation, cancellation, purchase, customer notification or partner outreach was created by these tests. The synthetic dining POST in the 70-check smoke is rejected by the existing disabled feature gate with 503 before database access. Customer/partner/admin authorization and booking-state transitions were tested with disposable fixtures; real authenticated customer submissions and notification delivery were not exercised on production.

Physical Safari/iPhone, actual microphone input, actual partner checkout/availability/confirmation and payment settlement remain untested. No new Headout/OpenTable/SevenRooms/Discotech/TablelistPro production API grant or commission is asserted. Remote GitHub CI, a main-branch merge and a GitHub push were not performed; publication used the saved approved Cloudflare version. The retained rollback version remains available; no rollback was needed for the executed release scope.

Changed repository files in this publication step: `tests/concierge/hydration-browser.mjs`, `tests/concierge/journeys-browser.mjs`, this report and the publication pointer in `docs/concierge/RELEASE_SIGNOFF_20261102.md`. The deployed application itself is the previously approved immutable artifact. Git, Node/npm, WSL, Playwright, Wrangler/Cloudflare, Supabase read-only SQL and Evidence Engineering independent review were reused. No new dependency was installed. Final documentation/whitespace validation is recorded by the subsequent standalone `git diff --check` and `git show --check --oneline HEAD` results.
