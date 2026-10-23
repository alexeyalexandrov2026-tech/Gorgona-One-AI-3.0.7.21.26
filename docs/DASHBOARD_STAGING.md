# Real dashboard staging acceptance

Accepted on 2026-10-23 against `miami-elio-dashboard-staging`, project `kaxslgjbrarapeyoifdh`, PostgreSQL 17.11 in us-east-2. The owner selected Gargona One; Supabase quoted $0/month for project creation. This is subject to the account's free quotas, not a promise of unlimited free hosting. Production project `ctszqhhvalyqxhbfqifx` was inspected read-only and was not migrated.

## Setup and boundaries

- `tests/dashboard/staging/schema.sql` reconstructs the three relevant application tables and existing guards from schema metadata, including the real Auth signup trigger. It refuses an existing application schema. No production Auth users, customer records or images were copied.
- Apply the baseline to an empty staging project, then `20261023145628_dashboard_workspaces.sql`. `tests/dashboard/staging/storage.sql` creates the equivalent `listings_media` bucket and partner-folder policies for fictitious image acceptance.
- The temporary `bridge.mjs` adapter used the exact application server handlers and the Edge runtime's built-in server credentials. Its own SHA-256 gate, staging-host check and absolute deadline protected the temporary gateway without JWT verification. Keep the gate, test passwords and sessions outside Git; the checked-in placeholders refuse requests.
- Four fictitious `dashboard-qa-…@example.com` accounts exercised real Auth. The seed uses confirmed test accounts without sending mail. A database operation promoted only the test admin; forged browser-editable role metadata remained insufficient for admin access.
- After expansion checks, apply `20261023145804_dashboard_lockdown.sql`. The legacy insert policy is retained for audit but restricted to the service role. Role lookup's definer function is in `private_authz`; public wrappers are invokers.

## Reproduction

The harness is opt-in and pins the staging project. Deploy the adapter with fresh 64-hex `__QA_NONCE__`, a short absolute millisecond `__QA_DEADLINE__`, and the relative `lib/server` module dependencies alongside `dashboardHandlers.mjs`. Use a private, mode-600 config containing `project_ref`, `url`, `anonKey`, and `token`. Never commit injected adapter code or that config. Invoke `/__seed` through the gated adapter once; promote only the returned fictitious admin ID using a trusted database operation.

Run `DASHBOARD_STAGING_CONFIG=/private/config.json node tests/dashboard/staging/acceptance.mjs expand`, apply lockdown only after the new API succeeds, then run the same command with `lockdown`. The two phases share their private state/session files. A fresh deployment needs a fresh gate; the seed resets existing test-account passwords to match it.

After a production Next build, run `tests/dashboard/staging/browser.mjs` with the same private config and `DASHBOARD_APP_DIR` pointing to the build copy. `I18N_BROWSER_EXECUTABLE` and `I18N_BROWSER_ARGS_FILE` can select an existing multiprocess Chromium runtime. This test runs a local production UI with real staging Auth/PostgREST/Storage and proxies only dashboard API traffic to the temporary adapter. It blocks other Supabase project hosts. It is not a hosted Cloudflare staging-domain test.

## Accepted evidence

| Scope | Result |
| --- | --- |
| Local content/i18n/SQL/API tests | 95/95 passed; 16 saved catalogs × 935 messages |
| Real API/Auth/RLS, expansion | 5/5: metadata denial, ownership/replay/isolation, assignment/reply/version conflicts, guest replay without email ownership, listing moderation |
| Real API/Auth/RLS/Storage, lockdown | 5/5: denied legacy writes, protected roles/RPCs, legitimate API still works, admin profile lookup, partner upload/public image read with customer/foreign-folder denial |
| Production-UI browser acceptance | 4/4: Russian admin, Arabic mobile partner, Russian mobile customer, guest lost-response recovery after reload |
| Build | Production Next build and Cloudflare package passed; 1 handler, 82 referenced client assets |
| Final database inspection | Anonymous booking insert denied; zero public role-helper definers; zero duplicate request-created events per booking |

The real schema exposed `PGRST200` for the old admin `profiles:partner_id(...)` embed. The UI now obtains listings and their profiles through separate authorized queries; real API and browser acceptance cover this fix. Reload acceptance confirmed a successful receipt, a cleared pending journal and one persisted booking after the first response was lost. Browser checks also reject JS/hydration errors and horizontal overflow. Screenshots contain only fictitious test identities.

## Retirement and remaining acceptance

The adapter was replaced after acceptance with an inert `Not found` / 404 handler; JWT verification is enabled again. A request using the former gate and valid public JWT returned 404. Do not re-enable it merely to view screenshots. No service key was exposed to the browser or Git.

The security advisor's five private-table RLS-without-policy INFO results are intentional browser denial. Its remaining warning is disabled leaked-password protection, an Auth configuration setting; see [Supabase password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). That setting has not been enabled by this migration.

No real Telegram/Resend delivery, sender-domain setup, bot pairing or scheduled delivery job was activated. Hosting acceptance on the actual Cloudflare staging URL, owner-channel receipt confirmation, Safari/iOS/accessibility checks and the separate production rollout remain. Private acceptance results and credentials are not release artifacts.

## Separate hosted Worker

`wrangler.dashboard-staging.json` targets only `miami-elio-dashboard-staging`, without production routes or custom domains. The staging entry wraps the real OpenNext worker. `run_worker_first` protects static assets as well as HTML and API traffic. HTTP Basic uses username `preview` and a separate high-entropy `DASHBOARD_STAGING_ACCESS_SECRET`; successful access sets a signed, four-hour HttpOnly/Secure cookie, so subsequent Supabase bearer headers still reach the application. Rotating that secret revokes old cookies. Responses prohibit indexing and caching. Delivery credentials are refused and the dispatch endpoint remains disabled.

The wrapper fails closed if required runtime secrets are absent, a project differs from the staging ref, or the runtime public key differs from the key inlined at build time. Its authenticated `/__dashboard_staging/health` identifies the exact commit and project; it does not claim database or delivery acceptance.

`scripts/dashboard/staging-release.mjs` builds an immutable `git archive` snapshot into a new private temporary directory. Untracked files and local `.env` files are excluded. It uses only the public Supabase configuration during the Next build and packages Cloudflare output. A release receipt records commit/tree, public-key hash and artifact integrity; altered output or a different current commit is rejected before deployment. An optional `DASHBOARD_STAGING_NODE_MODULES` absolute directory reuses installed dependencies (Next 14.2.35, OpenNext 1.15.1); otherwise it runs `npm ci`.

Use the private mode-600 staging config already described above, outside the repository. The optional QA token in that file is not put in the build. From a clean, committed checkout:

```sh
node scripts/dashboard/staging-release.mjs build
```

Set `DASHBOARD_STAGING_BUILD_DIR` to the returned directory. `check` verifies its receipt without publishing. To deploy, `DASHBOARD_STAGING_SECRETS` must name an outside-repository mode-600 JSON file containing exactly `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `BOOKING_RATE_SECRET`, `DASHBOARD_OUTBOX_TOKEN`, and `DASHBOARD_STAGING_ACCESS_SECRET`. The last three should be distinct cryptographically random values of at least 32 characters. Do not reuse the temporary acceptance adapter's gate. No delivery-provider credentials belong in this file.

```sh
node scripts/dashboard/staging-release.mjs check
node scripts/dashboard/staging-release.mjs deploy
```

Deploy requires Wrangler authentication in the intended Cloudflare account, or its scoped API token and account ID. It verifies the service credential against the staging-only privileged RPC before uploading. The first version rejects traffic until encrypted runtime secrets are installed through `wrangler secret bulk`; secret values are never CLI arguments or saved build files. A failed intermediate step leaves a fail-closed staging worker, not a usable release. Do not substitute the production Wrangler config.

Use only the exact workers.dev URL returned by that deployment as `DASHBOARD_STAGING_URL`, then run:

```sh
node scripts/dashboard/staging-release.mjs probe
```

The probe checks unauthenticated denial, authenticated exact commit/project identity and invalid booking rejection. Full hosted role/browser/Storage acceptance must still follow. At preparation time, Wrangler was unauthenticated and the Cloudflare browser showed its login page; no hosted deployment or URL is claimed by these scripts.

The build/runtime split follows [OpenNext environment variables](https://opennext.js.org/cloudflare/howtos/env-vars); runtime credentials follow [Cloudflare Secrets](https://developers.cloudflare.com/workers/configuration/secrets/).

## Workers Builds through the existing Git integration

If local Wrangler authentication is unavailable, use the authenticated Cloudflare dashboard's existing GitHub integration to create a **separate** Worker named `miami-elio-dashboard-staging` from this repository and branch `dashboard/workspaces`. Keep the root directory at the repository root. Do not edit `gorgonaoneai3072126` or its production branch, domains or routes.

Set build command `node scripts/dashboard/workers-build.mjs` and deploy command `npx wrangler deploy --config wrangler.dashboard-staging.json`. In build variables set `NEXT_PUBLIC_SUPABASE_URL` to the staging URL and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to that project's public anon/publishable key. These two variables must also be available to the runtime (the URL is already pinned in the staging Wrangler config). Workers Builds supplies the checkout and `WORKERS_CI_COMMIT_SHA`; the entry verifies the commit, project and protected Worker config, builds in that checkout, then stamps the same release receipt. It does not require the developer-only `DASHBOARD_STAGING_CONFIG` file, nor does it upload secrets or run a deployment itself.

The five runtime bindings listed above remain necessary. Configure server credentials only as encrypted secrets in the separate Worker; do not copy them into build commands or source. Until the required configuration exists, the hosted wrapper returns 503 before serving application data. Provider credentials and notification dispatch remain disabled. A successful build with missing secrets is therefore not functional acceptance of hosted dashboards.

### Missing build entry after changing the source branch

`MODULE_NOT_FOUND` for `/opt/buildhome/repo/scripts/dashboard/workers-build.mjs` means Node could not load the entry itself. Check the source recorded on the failed build, not only the Worker's current settings. This is a Workers Builds integration; changing a Pages output directory does not repair it.

On 2026-10-23, builds `d0973aac-488c-466b-b498-bd445a6629cb` (manual) and `4989fb9a-0adb-43e9-bb6c-da5f9dc6f62d` (retry) both recorded `build_trigger_metadata.branch: main`. The latter log contains the exact missing-entry error. The entry was added by `413500de0504036e88dba60f5cd20a6e944ba5bf` on `dashboard/workspaces`; neither that entry nor `wrangler.dashboard-staging.json` exists on `main` at `5fcd0fa18cca537ea079a9a88a05b8109290d151`. The commit is present on GitHub and the entry has not moved. Both the root directory `/` and the configured build command are correct for the dashboard branch. Do not replace the staging build command with `npm run build`: that script also builds the unrelated AI router and uses the default production packaging configuration.

Recovery procedure:

1. Read the staging Worker's saved build configuration and confirm repository `alexeyalexandrov2026-tech/Gorgona-One-AI-3.0.7.21.26`, Git branch `dashboard/workspaces`, root `/`, and the build/deploy commands above. A saved branch filter alone does not prove which source a manual build or retry used.
2. Verify the intended commit contains both the entry and staging Wrangler configuration. Run the repository's tests, the managed staging entry with its public staging variables, and `wrangler deploy --dry-run --config wrangler.dashboard-staging.json` before publishing.
3. Start a **new build** with the dashboard source explicitly selected. Do not retry one of the old `main` builds to switch branches. For the Workers Builds API, `POST /accounts/{account_id}/builds/triggers/{trigger_uuid}/builds` accepts a body containing `branch` and `commit_hash`; supply the verified dashboard branch and full commit SHA, using only the staging trigger. Keep authentication in the connected tool or a scoped credential outside source and logs.
4. Read the new build back. Verify its actual `build_trigger_metadata.branch`, `commit_hash`, build command, deploy command and outcome. A successful configuration save or queue response is not a successful build. Preserve the old failed build IDs for comparison.
5. Check hosted access separately. Missing runtime secrets must still fail closed; packaging success does not establish database, role, browser or notification acceptance.

The inspected production Worker also has a non-main trigger matching `*` (excluding `main`) with deploy command `npx wrangler deploy`. Pushing a repair branch can therefore invoke a production-targeting command. Keep a local repair branch until that publishing path is explicitly authorized or safely isolated; do not silently modify production triggers, push merely to obtain CI, or open a PR without the owner's request. Existing CI run [49](https://github.com/alexeyalexandrov2026-tech/Gorgona-One-AI-3.0.7.21.26/actions/runs/39998580897) passed all 106 tests and the Next build on `413500de`; it did not exercise managed staging packaging or publish a hosted dashboard.

See [Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/) for build roots and commands, and the [Workers Builds API](https://developers.cloudflare.com/workers/ci-cd/builds/api-reference/) for explicit build sources. The correction is source selection on the isolated staging Worker; no application-code change, main merge, production deployment or credential change is needed to resolve this missing-entry error.

Fresh recovery evidence (2026-10-23):

- **PASS:** new staging build `94c53262-35cc-49d4-964c-7133334d94a1`, explicitly requested with branch `dashboard/workspaces` and commit `413500de0504036e88dba60f5cd20a6e944ba5bf`, independently finished with outcome `success`. Both build and deploy commands completed; deployed staging version `c6a512ab-e5c0-4385-834f-502e8bb87ca7`. No build settings, production triggers, runtime secrets or database configuration were changed.
- **PASS:** local execution of the same managed entry compiled 43 pages, packaged 1 handler and checked 82 referenced client assets. Staging Wrangler dry-run passed with 515 asset files. These are separate local checks, not a production deployment.
- **FAIL (local environment):** the local full suite passed 105/106 tests; the remaining file-symlink test cannot create its fixture on this Windows host (`EPERM`). **PASS:** the matching source's Linux CI run 49 passed 106/106. The 8 managed-build and staging-access guard tests also passed locally. No assertion was weakened or skipped.
- **PASS, fail-closed / BLOCKED, functional acceptance:** `https://miami-elio-dashboard-staging.alexey-alexandrov2026.workers.dev` returned `503 Staging unavailable` with `Cache-Control: no-store` for `/`, `/__dashboard_staging/health` and `/images/brands/nike-fashion.svg`. Inspection confirmed only the configured public variables and assets binding; required runtime secrets remain absent. Authenticated dashboards, database operations, browser flows and delivery were not retested on the hosted Worker.
- **Boundary:** production Worker `gorgonaoneai3072126` retained modification time `2026-10-23T17:55:31.574706Z`, and remote `main` remained `5fcd0fa18cca537ea079a9a88a05b8109290d151`. The repair branch contains documentation only and stays local to avoid the production-targeting non-main trigger.
- **Follow-up implemented on the partner-publication feature branch:** both `scripts/dashboard/workers-build.mjs` and `scripts/dashboard/staging-release.mjs` now pass `--config wrangler.dashboard-staging.json` into packaging. The shared packaging helper forwards that explicit configuration to OpenNext 1.15.1; its normal default remains `wrangler.jsonc`. Unsupported arguments fail before output removal. This aligns the compiled asset-routing behavior with staging deployment; it is separate from the original missing-entry cause. Authenticated hosted behavior still needs acceptance.

Historical setup context: on 2026-10-23 the user's existing TinyFish profile `Miami Elio — Cloudflare DNS` provided an authenticated Cloudflare dashboard session, without a new Google sign-in. At that earlier inspection the staging Worker was absent. That restored the dashboard route for setup; it did not provide a local Wrangler token or the staging service credential.
