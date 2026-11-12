# Headout API and dining inquiry staging — 2026-10-31

## Current result

This report records the initial migration/read-client slice. The subsequent [Headout admin sandbox preview](HEADOUT_SANDBOX_PREVIEW.md) is now deployed only to dedicated private staging, with fresh real API/browser evidence and exact release identity. Its report supersedes the current-staging statements below; the original phase evidence remains historical.

The dedicated private staging application now accepts structured dining and VIP nightlife inquiries through the existing authenticated server, bookings table, profile roles, RLS, event history and notification outbox. These are inquiries, not independently confirmed venue reservations.

The existing Headout account has a working sandbox API key. The initial server-only, read-only Affiliate API v2 client retrieved cities, attributed product records and date-level availability through an explicit acceptance command. The subsequent private admin preview imports it through a strictly staging-only route; it remains **disabled on production**. Existing public Headout referrals and galleries continue to provide checkout on Headout.

Production remains Worker `2fb0f528-3310-44ec-b833-26c0bc418e14` with the new schema/write flags disabled. This phase did not migrate or publish production, push Git, merge main, purchase a service, accept a new commercial agreement or create a provider reservation.

## Exact source and database scope

- Staging application source: `d12f27cc99e8200a2e94afb2cfb4cad925ec3edc`; tree `50fc43e407f942e1c34c6a6c234303ec24eb41ae`.
- Staging Worker: `f8f26110-52fb-4be1-ba54-193bca830127` at 100%, project `kaxslgjbrarapeyoifdh`. Previous staging version: `6a13b6d1-aea0-4739-a705-35fdd563d3fe`.
- The current read client and acceptance tooling are committed as `9d1d973540147c2d941c4198c1346b118b86429d`. Those additions are local; they are not claimed to be part of the staged application bundle.
- Existing migration `supabase/migrations/20261031210000_dining_requests.sql` was applied to dedicated staging through the Supabase migration API as `dining_requests_v1`, actual ledger version `20261031204420`. Source SHA-256: `2380d0836897c4fb0f890edf4c09d5c9b26b51d6da4c8dbb3df4243209373957`. Only the outer transaction wrappers were removed for the transactional API.
- The original eight bookings and sixteen request events retain the same row digests. Booking digest: `f76b9b963a29a0bcd359d929d77fbb9f`; event digest: `8f758b01209acb6fb432c2fa1b839ce5`.
- Five labelled fictitious inquiries were retained for audit and are closed. No real identity was created, elevated, reset or copied. Staging dispatch is blocked; no test email or Telegram notification was sent. New test outbox rows remain pending.
- Both RPCs remain invokers with execute restricted to the service role. Browser direct inserts and privileged RPC calls are denied; ownership and assigned-partner reads were verified through real Auth/PostgREST.

The pre-migration evidence includes the affected function definitions, constraints, policies, grants and row digests in the parent workspace's `outputs/dining-staging-before-snapshot.json`. This is a relevant schema/function snapshot, not a full database backup or a claim about production recovery readiness.

Rollback is data-preserving: turn off new request writes, retain the additive column and expanded RPCs, and keep the schema-read flag enabled while saved hospitality inquiries exist. Do not drop the column, purge history or replay unrelated migration files.

## Headout capability evidence

The authenticated account's Settings → API keys contains an existing test key. Its production-key panel states that production access is supplied by the account manager after the applicable contract process. The key was stored outside Git and release artifacts in the existing current-user-only, inheritance-disabled credential directory. Its value is not present in the read client, browser bundle or recorded API evidence.

The current contract is taken from the official [setup guide](https://partner.headout.com/docs/guide/setup), [Affiliate products API](https://partner.headout.com/docs/affiliate/v2/products/list) and [date availability API](https://partner.headout.com/docs/affiliate/v2/availabilities/normal-availabilities), inspected on 2026-10-31. The older developer site and current partner documentation describe different generations; implementation uses the current partner v2 paths and `Headout-Auth` header.

Actual sandbox requests succeeded for cities, all three pages of the Miami product response, and a culinary product's date-level availability. The internal audit covered 41 returned products. These culinary candidates appeared:

| Headout product | Returned title |
|---|---|
| `55702` | Miami Little Havana Walking Tour with Food Tastings and Cuban Coffee |
| `58903` | Miami Little Havana Food and Culture Walking Tour with Tastings |
| `58904` | Miami Little Havana Food & Culture Tour |

Product `55702`, variant `115082`, returned eight date records for 2026-11-01 through 2026-11-08. This verifies the sandbox contract, not production stock, prices, restaurant-table capacity or confirmed bookings. No sandbox inventory or price was published. Similar tour names require editorial/supplier matching before canonical production import.

The client:

- Pins HTTPS origins to the explicit sandbox or production environment, rejects redirects and follows validated numeric offsets rather than upstream pagination URLs.
- Snapshots configuration so a caller cannot relabel sandbox data as production.
- Counts decoded response bytes while streaming and cancels rejected or oversized responses before unbounded buffering.
- Validates nested records, calendar ranges, product/variant identity, safe numeric identifiers, prices and availability enums; errors contain no upstream payload or credentials.
- Requires one matching `affiliate_code`, preserves the account attribution and omits potential commission fields from normalized results.
- Supports observed `COMBO` records as referrals with no invented normal inventory. Calendar queries use a verified normal product/variant.
- Reports date granularity with `slots:null` and `confirmation:null`. It has no create-booking, payment, hold or cancellation methods.

The owner authorized requesting API access. A request was sent from the connected account to the official `partnerships@headout.com` contact for production eligibility, existing-agreement scope, any fees/additional agreement, Miami culinary inventory and permitted booking-status/event capabilities. Gmail returned `SENT`, message/thread `1a193c7905c8bc4d`. Access approval or a production key has not been received or claimed.

Viator's account verification succeeded, but the owner **declined its additional API licence**. The activation was cancelled; no Viator API key was created. Existing published Viator tools were not removed. Travelpayouts still showed Drive installation; Drive was not installed or enabled.

## Verification

| Check | Actual outcome | Parent-workspace evidence |
|---|---|---|
| Content, i18n, dashboard and new provider contract suite | PASS — 203/203, zero skipped | `outputs/dining-api-form-full-tests.log` |
| Headout transport/security contracts | PASS — 13/13, with failing-first reproductions for the corrected boundaries | `outputs/headout-api-green.log`, `headout-config-mutation-red.log`, `headout-boundary-red.log` |
| Existing SQL, staging isolation and immutable release checks | PASS — 23/23; independent migration review additionally passed 45/45 | `outputs/dining-staging-focused.log` |
| Isolated Linux application build/package | PASS — Next 15.5.28, OpenNext 1.20.13, one handler, 107 referenced client assets | `outputs/dining-stage-build.log` |
| Packaging/activation | PASS — dry-run, retained bindings, pinned project, exact-source health endpoint and dedicated staging activation | `outputs/dining-stage-dry-run.log`, `dining-stage-activation.log` |
| Real hosted API/Auth/RLS | PASS — 11/11, including dining replay/duplicate prevention, foreign-user denial, assignment/reply/stale version, owner withdrawal, VIP pending status and blocked dispatch | `outputs/dining-staging-acceptance-final.json` |
| Real hosted browser | PASS — customer mobile 390px and admin 1280px; no JavaScript errors or horizontal overflow | `outputs/dining-hosted-browser-final/results.json` |
| Browser fault recovery | PASS — saved response deliberately dropped, reload retained the original key, one created event, correct pending receipt/history, then owner withdrawal | Same hosted browser evidence |
| Headout sandbox integration | PASS — real city/product/date requests through the new read client | `outputs/dining-headout-api-acceptance.json` |
| Data preservation | PASS — original row digests unchanged; all five labelled inquiries closed | Direct staging SQL inspection |
| Independent final read-client review | PASS — 13/13 focused tests, syntax and diff checks; no remaining sandbox-increment blockers | Independent reviewer report |

Two early acceptance assertions were incorrect: the HTTP-only check expected a hydrated form while Auth was still loading, and a global alert count included Next's empty accessibility announcer. The checks now verify server content/API behavior separately, exercise the actual form in a real browser, and scope application errors to `main`. No product error was hidden. The Headout audit also exposed real `COMBO` records, which were explicitly modeled and regression-tested.

The first Windows upload ran out of disk space. Only two task-created, reproducible source archives were removed; runtime artifacts, Git source, user files and credential directories were preserved. During staging activation, a command initially inherited an observability setting from the default configuration. The stage-only script setting was explicitly restored to disabled and read back through Cloudflare's documented settings API; other settings and production were preserved.

## Remaining release boundaries

- Production Headout access, its final permitted scopes and any additional contract/fees need the partner's response and the owner's approval where required. Sandbox success is not production approval.
- A public Headout API calendar, provider-created reservations, booking confirmation synchronization, cancellation/refund handling, signature-verified event delivery and earned-commission reconciliation are not delivered by this read-only increment.
- New structured dining/VIP inquiries are enabled only in private staging. A production migration/flag release still needs its own exact-state review, relevant backup and explicit release authorization.
- Real payment, external reservation, guest-only hosted dining submission, Safari/iOS, screen-reader and load acceptance were not performed in this increment. Existing disposable local coverage is not labelled as those hosted checks.
- Admin catalogue/channel editing remains outside this completed slice. The complete R1–R5 objective is not marked complete.

## Changed source files in this phase

- `wrangler.dashboard-staging.json`
- `lib/server/headoutApi.mjs`
- `scripts/dining/check-headout.mjs`
- `tests/dashboard/headout-api.test.mjs`
- `tests/dashboard/staging/dining.mjs`
- `tests/dashboard/staging/dining-browser.mjs`
- `docs/dining/IMPLEMENTATION.md`
- `docs/dining/VERIFICATION.md`
- This report. The existing migration SQL was applied without changing its source file.
