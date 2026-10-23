# Dashboard workspaces

Implemented against main `5fcd0fa18cca537ea079a9a88a05b8109290d151` on 2026-10-23. This replaces the unavailable local foundation branch; it does not depend on that branch. No production migration, deployment, bot creation or external delivery is included in this change.

## Available workflows

| Role | Route | Tools |
| --- | --- | --- |
| Customer | `/profile` | Own authenticated requests, status filter, pagination, details, history and partner replies |
| Partner | `/partner` | Assigned requests, replies, existing listing submission/editing tools |
| Admin | `/admin` | All requests, review/assign/respond/close, existing listing moderation, real account counts, notification configuration and delivery counts |

Empty and failed queries are distinct. Removed simulated profile metrics and the pretend SMS settings. Interface copy is saved for all 16 supported languages. Request titles and replies remain in their original language.

The API verifies each bearer token with Supabase Auth and obtains the role from the protected profile table. Customer ownership comes from that verified user ID, never email matching or body fields. Assigned partners have a database RLS policy; admin commands independently check the actor's database role. Browser-editable auth metadata does not grant access. Changing accounts unmounts the previous workspace and stale session reads cannot restore it.

New requests save a booking, history and notification deliveries in one transaction. A UUIDv4 idempotency key replays the receipt; different contents with that key conflict. Commands also have idempotency receipts and a version check, so stale edits return 409. Server routes reject malformed/oversized inputs and produce no-store responses. Privileged RPC execution is restricted to the service role; private delivery data is unavailable to browser roles.

An outgoing form attempt is retained in same-tab `sessionStorage`, scoped to the account and item. Reloading replays its original payload and idempotency key; contact fields stay locked until a receipt or a definite validation/rate-limit rejection. A confirmed receipt clears the entry. Pending contact data has a 30-minute validity limit checked on read; closing the tab or blocked storage can prevent recovery. Auth tokens are not stored in this journal. Account changes remount the form and cannot replay another account's pending attempt.

Admin listing moderation resolves partner profiles with a separate RLS-protected batch query. The live schema's `partner_id` points to Auth users, so embedding `profiles:partner_id(...)` caused PostgREST `PGRST200` and prevented the old admin summary from loading.

## Notification delivery

Saved requests, request changes, profile registrations and partner listing changes produce durable events. These are supported business events, not every page view, keystroke or payment event. The old browser-triggered `/api/notify` cannot send arbitrary messages and responds 410 to an authenticated caller.

`/api/internal/notifications` is protected by a server bearer secret. The separate scheduled Worker calls it once per minute. Delivery claims use row locks, leases, a maximum batch of five and bounded retries. Channels without configuration are not claimed. Provider configuration failures become visible failures. Telegram throttling honors retry-after, with paid broadcasts disabled. Emails reserve a conservative 80 attempts/day and 2700/month budget. This budget is local to this sender: other services using the same Resend account must share its provider quota. Free plans can change; the implementation does not promise unlimited free delivery.

Messages go only to the configured owner destinations, contain a minimal event summary and an authenticated admin link, and omit full customer contact details. Tokens and payloads are not logged. Resend receives an event idempotency key. Telegram is at-least-once: if its response is lost after acceptance, a retry can duplicate a notification. Unsent events expire after 23 hours; `sent` records remain available in counts.

Required server configuration (never `NEXT_PUBLIC_`): `SUPABASE_SERVICE_ROLE_KEY`, `BOOKING_RATE_SECRET` (32+ characters), `DASHBOARD_OUTBOX_TOKEN` (32+ characters). Telegram needs `TELEGRAM_BOT_TOKEN` and numeric `TELEGRAM_OWNER_CHAT_ID`. Email needs `RESEND_API_KEY`, `ADMIN_EMAIL`, `NOTIFICATIONS_FROM_EMAIL` and a verified sending domain. The scheduled Worker needs the same outbox token and `NOTIFICATIONS_JOB_URL`. Public Supabase URL and anon key remain the existing public configuration.

## Staging and release order

1. Recheck the target database against `tests/dashboard/live-guards.sql`, take a recoverable backup, and record the currently deployed app and migration state. The fixture is a schema/guard snapshot, not a production setup script.
2. On an isolated Supabase staging project with the current schema, apply **only** `20261023145628_dashboard_workspaces.sql`. Do not run an unqualified migration push: the next migration intentionally has a later release boundary. Do not run the old `database/setup.sql` against a populated project.
3. Deploy the new app to staging with server secrets. Test real Auth/PostgREST/RLS as customer A/B, assigned/unassigned partner, guest and admin; test form receipts, expired sessions, concurrent edits, listings and Storage. Do not silently attach old guest bookings to accounts by email.
4. Apply `20261023145804_dashboard_lockdown.sql` to staging after the new server is working. Verify direct anonymous inserts, direct booking updates, profile role writes and privileged RPCs are denied; verify legitimate new flows and the existing signup/moderation triggers still work.
5. Pair the owner's bot/chat through BotFather and an explicit `/start`; verify the sender domain and owner email. Activate the scheduled Worker only after checking both endpoint authentication and the exact destinations. Use a marked test event to confirm delivery and dashboard counts. Clear or intentionally expire fixture/test queues; never drain an old production backlog without review.
6. Repeat the same expand → app → acceptance → lockdown sequence for production as a separate release. Configure the deployment gate so both migrations cannot automatically run before the app. Check anonymous `/api/book`, authenticated role flows, notification retries and alarms after release.

Before lockdown, the old direct booking insert policy remains and does not provide the new atomic guarantees. Keep that transition short and prevent public use of the new workspace until acceptance. After lockdown, rolling back to the old browser/API code breaks booking writes; retain the expansion schema and roll forward to a corrected new app, or prepare a separately reviewed compatibility rollback. Do not drop customer data as a rollback.

## Verification

Run `npm run i18n:check`, `node --test tests/content/*.test.mjs tests/i18n/*.test.mjs tests/dashboard/*.test.mjs`, a production Next build, and `node scripts/i18n/build-worker.mjs` after that build. CI includes dashboard SQL/API tests. The current local run passed 95 tests, all 16 catalogs with 935 messages each, the production build and Cloudflare packaging (1 handler, 82 client assets). PGlite uses PG18; acceptance also ran against a separate real Supabase project on PG17.11.

`node tests/dashboard/browser.mjs` starts an isolated SQL-backed provider fixture plus a local production Next server. It exercises customer history, admin triage/assignment, an Arabic mobile partner response, customer receipt of that response, forged admin metadata and a lost booking response followed by reload. All identities and contact information are fictitious, and provider sends are mocked. `DASHBOARD_APP_DIR` may point to a clean build copy; `I18N_BROWSER_EXECUTABLE`/`I18N_BROWSER_ARGS_FILE` support an existing Chromium runtime. The explicit QA preload never ships with the product.

Real staging acceptance passed 10 API/Auth/RLS/Storage checks and four production-UI browser flows, including reload recovery without a duplicate booking. The UI ran locally against real staging services through a temporary gated adapter; this does not certify a hosted Cloudflare staging deployment. That adapter has been replaced with an inert 404 handler and JWT verification re-enabled. See `docs/DASHBOARD_STAGING.md` for the environment, evidence and remaining limits.

## Remaining stages

- Hosted Cloudflare staging and production rollout; actual owner channel setup and receipt confirmation. Real Supabase staging acceptance is complete.
- Organization provisioning, invitations, workspace switching and staff permission UI. Only the protected organization/membership schema is included here.
- Recovery across closed tabs, devices or expired journals; current recovery covers a reload in the same tab within the pending attempt's validity window.
- Guest-to-account linking with proof of ownership, richer request search and full history pagination (details currently show at most 100 events; partner lookup at most 100 accounts).
- Verified invoices, Stripe/payment/provider operations, richer analytics and document workflows. No placeholder balances or simulated tools imply those are available.
- Real Safari/iOS, keyboard/screen-reader acceptance and production Storage/media upload verification. This stage retains the existing villa visual language rather than introducing a new design system.
