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
