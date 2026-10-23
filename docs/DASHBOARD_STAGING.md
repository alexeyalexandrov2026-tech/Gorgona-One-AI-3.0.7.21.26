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

On 2026-10-23 the user's existing TinyFish profile `Miami Elio — Cloudflare DNS` provided an authenticated Cloudflare dashboard session, without a new Google sign-in. Read-only inspection confirmed the staging Worker was absent. This restores the dashboard route for setup; it does not provide a local Wrangler token or the staging service credential.
