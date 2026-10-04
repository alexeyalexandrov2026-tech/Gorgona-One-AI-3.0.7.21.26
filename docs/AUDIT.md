# Gorgona One - audit, October 2026

Audit of `alexeyalexandrov2026-tech/Gorgona-One-AI-3.0.7.21.26` at `19e121a`
(identical to `main`), carried out on 2026-10-04. Fixes are on branch
`claude/trusting-davinci-wefc6v`; each finding below links to the commit that
addresses it, or says who has to act.

## Summary

The site's code, API routes, SQL, build and deploy configuration,
dependencies and full git history were reviewed. The production Supabase
project (`Gorgona-one-claude`) was inspected read-only, and before/after
behavior was compared on local production builds and on the Cloudflare Worker
bundle running in `wrangler dev`.

What was actually broken in production:

- **Reservations were never stored.** `/api/book` asked for the inserted row
  back, which the insert-only RLS policy on `bookings` rejects (the table had
  0 rows). Guests were still told "Request Sent!", so a lead survived only if
  the email got through.
- **The AI concierge did not answer on Cloudflare.** Both engines default
  to `localhost`, which a Worker cannot reach; commits `b02e018`-`19e121a`
  show the fallback firing in production, and the latest one hid the
  fallback line, so guests got silence.
- **Every page told search engines it was a duplicate of the homepage**
  (`<link rel="canonical" href="https://gorgona-one.com">` site-wide). The
  sitemap also left out yachts, cars, villas, dining and experiences, and
  listed sportsbooks under `/stores/...`.
- **All ten sportsbook profile pages returned 404**, because the table they
  read is empty in production.
- **Browsers that block storage got the "Critical Error" page**, from a
  provider in the root layout. Reproduced on the original build.
- **The "Mercedes-Benz G-Class (white)" listing shows a BMW X5** in all six
  of its photos.

What would have gone wrong next: the SQL files in `database/` no longer
matched production, which had been hardened by hand. Re-running them would
have re-opened admin sign-up, self-promotion to admin, and write access to
every catalog table for anyone holding the public key. They now mirror
production, and 42 policy tests prove the access rules.

## Owner actions

These need you; none can be done from code.

1. **Apply `database/03_security_hardening.sql`** in the Supabase SQL editor,
   then re-run *Advisors → Security*. Until then partners can store
   `javascript:` or tracking URLs as listing images, and `handle_new_user()` /
   `is_admin()` are callable through `/rest/v1/rpc/...`.
2. **Create an admin.** Production has one profile and it is a plain `user`,
   so nobody can open `/admin`:
   `update public.profiles set role = 'admin' where email = 'you@example.com';`
3. **Supabase Auth settings:** enable leaked password protection (flagged by
   the advisor) and set the minimum password length to 8 to match the site.
4. **Check the Cloudflare variables** (`.env.example` lists them):
   `NEXT_PUBLIC_SUPABASE_URL`/`_ANON_KEY` (needed to store bookings),
   `RESEND_API_KEY`, `ADMIN_EMAIL`, and `NOTIFICATIONS_FROM_EMAIL` on a domain
   verified in Resend. Resend's default test sender only delivers to the
   Resend account owner.
5. **Decide on a production AI engine.** Set `AI_ROUTER_URL` or
   `GORGONA_AI_URL` to a hosted service; until then the concierge answers
   every message with a polite "temporarily unavailable" line.
6. **Replace the photos in `public/images/rentals/mercedes-g-class-white/`**
   (they are a white BMW X5), or relabel that listing.
7. **Legal review:** the privacy policy is one sentence although the site
   collects names, emails, phones, accounts and chat messages and uses
   Supabase, Resend and Cloudflare. The new gambling disclosure (21+,
   1-800-GAMBLER) needs state-specific wording checks. Confirm that every
   listed operator still trades under that name (for example ESPN BET).
8. **Rate limits:** add Cloudflare WAF rate-limiting rules for `/api/book`,
   `/api/chat` and `/api/notify`.
9. **Plan the Next.js upgrade** (see H8).
10. **Identify the `<meta name="verification" content="c64f…">` tag** in
    `app/layout.js`. No search engine reads that name; it was left in place in
    case an affiliate network does.

## Findings

Status: **Fixed** (commit on this branch), **Owner** (action list above),
**Follow-up** (not done here, reason given), **Not live** (only in repo files).

### Critical

| # | Finding | Status |
|---|---|---|
| C1 | `database/00_profiles_schema.sql` let anyone become admin: `handle_new_user()` copied any role passed to `signUp()` (including `admin`), "Users can update own profile" allowed changing one's own role, and the admin policy queried `profiles` from inside a `profiles` policy (infinite recursion). Reproduced against the old file. | Not live (production already hardened). Fixed in repo [`0f186c9`](https://github.com/alexeyalexandrov2026-tech/Gorgona-One-AI-3.0.7.21.26/commit/0f186c9) |
| C2 | `database/schema.sql` created 14 public tables without row level security, so the public anon key could rewrite stores, coupons and sportsbook affiliate links. | Not live (production has RLS). Fixed in repo [`0f186c9`](https://github.com/alexeyalexandrov2026-tech/Gorgona-One-AI-3.0.7.21.26/commit/0f186c9) |

### High

| # | Finding | Status |
|---|---|---|
| H1 | `/api/book`: no booking was ever stored (insert-then-select vs insert-only RLS); guest input went unescaped into the admin email; with `ADMIN_EMAIL` unset it emailed the guest-supplied address; it answered success even when nothing was delivered; Resend errors were never checked. | Fixed [`9ba1164`](https://github.com/alexeyalexandrov2026-tech/Gorgona-One-AI-3.0.7.21.26/commit/9ba1164) |
| H2 | Concierge silent in production: engines on `localhost`, and `19e121a` dropped the fallback reply. | Reply fixed [`e48d2e1`](https://github.com/alexeyalexandrov2026-tech/Gorgona-One-AI-3.0.7.21.26/commit/e48d2e1); engine = Owner #5 |
| H3 | Admin console rendered partner-supplied image URLs unchecked as links and images; production accepts `javascript:` URLs in `partner_listings.images`. | UI fixed [`4c37c44`](https://github.com/alexeyalexandrov2026-tech/Gorgona-One-AI-3.0.7.21.26/commit/4c37c44); database check = Owner #1 |
| H4 | Admin and partner portals could not work: no user id in the session, a `loading` flag that never existed (instant redirect to `/login`), partner edits that silently changed nothing, and roles read from user-editable `user_metadata`. | Fixed [`4c37c44`](https://github.com/alexeyalexandrov2026-tech/Gorgona-One-AI-3.0.7.21.26/commit/4c37c44) |
| H5 | `GET /api/seed` let anyone trigger hundreds of database writes and returned stack traces. | Fixed [`bb2ee35`](https://github.com/alexeyalexandrov2026-tech/Gorgona-One-AI-3.0.7.21.26/commit/bb2ee35) |
| H6 | Every page declared the homepage as its canonical URL; every hreflang pointed at the homepage. | Fixed [`e47cedc`](https://github.com/alexeyalexandrov2026-tech/Gorgona-One-AI-3.0.7.21.26/commit/e47cedc) |
| H7 | Repo SQL had drifted from production, and production's `bookings`, triggers and helper functions were not in the repo at all. | Fixed [`0f186c9`](https://github.com/alexeyalexandrov2026-tech/Gorgona-One-AI-3.0.7.21.26/commit/0f186c9) |
| H8 | Next.js 14.2.35 is end-of-life with open advisories (RSC denial of service: GHSA-h25m-26qc-wcjf, GHSA-q4gf-8mx6-v5v3, GHSA-8h8q-6873-q5fj), fixed only in 15.5+/16. `npm audit --omit=dev`: 1 critical, 8 high, 1 moderate (32 including dev tools). | Follow-up: a major upgrade (React 19) needs its own branch and test pass |
| H9 | Vendored `new ia/` holds 246 MB (11,199 files including two zips) that the site never uses, and `npm run build` installs and builds `ai-router/` on every deploy although nothing ships it. | Owner decision: kept as-is for now |

### Medium

| # | Finding | Status |
|---|---|---|
| M1 | `/api/notify` accepted anonymous requests (inbox spam). | Fixed [`9ba1164`](https://github.com/alexeyalexandrov2026-tech/Gorgona-One-AI-3.0.7.21.26/commit/9ba1164) |
| M2 | No security headers (clickjacking, MIME sniffing, referrer, permissions, HSTS). | Fixed [`e47cedc`](https://github.com/alexeyalexandrov2026-tech/Gorgona-One-AI-3.0.7.21.26/commit/e47cedc) |
| M3 | `GET /api/chat` exposed engine URLs, service version, model and session counts. | Fixed [`e48d2e1`](https://github.com/alexeyalexandrov2026-tech/Gorgona-One-AI-3.0.7.21.26/commit/e48d2e1) |
| M4 | Sportsbook profiles 404 with an empty `sportsbooks` table. | Fixed [`bb2ee35`](https://github.com/alexeyalexandrov2026-tech/Gorgona-One-AI-3.0.7.21.26/commit/bb2ee35) |
| M5 | Sitemap: sportsbooks under `/stores/<slug>`, core sections missing, nine placeholder "SEO Page" stubs listed. | Fixed [`e47cedc`](https://github.com/alexeyalexandrov2026-tech/Gorgona-One-AI-3.0.7.21.26/commit/e47cedc): 231 URLs, all return 200 |
| M6 | Root-layout providers read `localStorage` unguarded; storage-blocked browsers crashed every page. | Fixed [`31ed2c0`](https://github.com/alexeyalexandrov2026-tech/Gorgona-One-AI-3.0.7.21.26/commit/31ed2c0) |
| M7 | Sportsbook promotions had no age limit or problem-gambling helpline. | Fixed [`0fc4752`](https://github.com/alexeyalexandrov2026-tech/Gorgona-One-AI-3.0.7.21.26/commit/0fc4752); wording = Owner #7 |
| M8 | One-sentence privacy policy. | Owner #7 (needs company and contact details) |
| M9 | Page weight: no lazy images, 0.6-1.5 MB car photos, an unused 15 MB video, hashed JS revalidated on every view. | Fixed [`6d370e7`](https://github.com/alexeyalexandrov2026-tech/Gorgona-One-AI-3.0.7.21.26/commit/6d370e7), [`22e907a`](https://github.com/alexeyalexandrov2026-tech/Gorgona-One-AI-3.0.7.21.26/commit/22e907a): `/rentals` 14.7 MB → 4.5 MB initial load |
| M10 | Every page ships all 16 locales (`lib/i18n.js`, ~240 KB uncompressed) through the root providers; the homepage is a client component. | Follow-up: per-locale loading touches ~40 components |
| M11 | Supabase advisor: SECURITY DEFINER functions executable by guests; leaked password protection off. | Owner #1, #3 (SQL in `03`) |
| M12 | Config drift: two names for the Supabase keys, unused `GEMINI_API_KEY` documented, stale seed SQL with eight invented cars. | Fixed [`7b1999f`](https://github.com/alexeyalexandrov2026-tech/Gorgona-One-AI-3.0.7.21.26/commit/7b1999f), [`ab13a49`](https://github.com/alexeyalexandrov2026-tech/Gorgona-One-AI-3.0.7.21.26/commit/ab13a49) |
| M13 | `npm run dev`/`start` used Windows-only `set PORT=...&&`; on macOS/Linux the router missed port 20128. | Fixed [`ab13a49`](https://github.com/alexeyalexandrov2026-tech/Gorgona-One-AI-3.0.7.21.26/commit/ab13a49) |
| M14 | Root-level agent instructions targeted another repository and included `git reset --hard`; architecture notes described removed modules as live. | Fixed [`7b1999f`](https://github.com/alexeyalexandrov2026-tech/Gorgona-One-AI-3.0.7.21.26/commit/7b1999f) |

### Low

| # | Finding | Status |
|---|---|---|
| L1 | Homepage discovery links to `/deals` and `/entertainment` returned 404. | Fixed [`31ed2c0`](https://github.com/alexeyalexandrov2026-tech/Gorgona-One-AI-3.0.7.21.26/commit/31ed2c0) |
| L2 | Service worker never registered (no install prompt); orphan `ai.webmanifest`; `/favicon.ico` 404; SVG social image (ignored by Facebook, X and LinkedIn). | Fixed [`31ed2c0`](https://github.com/alexeyalexandrov2026-tech/Gorgona-One-AI-3.0.7.21.26/commit/31ed2c0), [`e47cedc`](https://github.com/alexeyalexandrov2026-tech/Gorgona-One-AI-3.0.7.21.26/commit/e47cedc) |
| L3 | Placeholder promo pages, `/ai-ready` and `/draft/*` indexable; robots allowed portals and `/api`. | Fixed [`e47cedc`](https://github.com/alexeyalexandrov2026-tech/Gorgona-One-AI-3.0.7.21.26/commit/e47cedc) |
| L4 | About 1,750 lines of dead code (`CategoryOrb`, `lib/ai/brain.js`, `lib/ai/voice.js`, ...), including a dead `/api/tts`. | Fixed [`ccbf790`](https://github.com/alexeyalexandrov2026-tech/Gorgona-One-AI-3.0.7.21.26/commit/ccbf790), [`5a025da`](https://github.com/alexeyalexandrov2026-tech/Gorgona-One-AI-3.0.7.21.26/commit/5a025da) |
| L5 | Committed test reports and scratch scripts with personal `C:\Users\...` paths. | Fixed [`ccbf790`](https://github.com/alexeyalexandrov2026-tech/Gorgona-One-AI-3.0.7.21.26/commit/ccbf790), [`ab13a49`](https://github.com/alexeyalexandrov2026-tech/Gorgona-One-AI-3.0.7.21.26/commit/ab13a49) |
| L6 | Profile page showed made-up numbers (12 / 8 / 44). | Fixed [`4c37c44`](https://github.com/alexeyalexandrov2026-tech/Gorgona-One-AI-3.0.7.21.26/commit/4c37c44) |
| L7 | Minimum password 6; raw Supabase error text. | Fixed [`4c37c44`](https://github.com/alexeyalexandrov2026-tech/Gorgona-One-AI-3.0.7.21.26/commit/4c37c44); dashboard = Owner #3 |
| L8 | No CI and one smoke test. | Fixed [`ae084eb`](https://github.com/alexeyalexandrov2026-tech/Gorgona-One-AI-3.0.7.21.26/commit/ae084eb), [`3d11c4a`](https://github.com/alexeyalexandrov2026-tech/Gorgona-One-AI-3.0.7.21.26/commit/3d11c4a) |
| L9 | Content: white G-Class gallery is a BMW X5; the events catalogue is empty; operator names need checking. | Owner #6, #7 |
| L10 | `.env.example` shipped a guessable default `GORGONA_AI_API_KEY`. | Fixed [`7b1999f`](https://github.com/alexeyalexandrov2026-tech/Gorgona-One-AI-3.0.7.21.26/commit/7b1999f) |

Correction: an earlier draft of this audit said `playwright` was a production
dependency. It is a devDependency already.

## Verification

- `next build` before and after; the OpenNext Cloudflare bundle built and run
  in `wrangler dev`. Pages carry the security headers and their own
  canonical; `/api/seed` and `/api/tts` return 404; chat falls back in the
  guest's language; an undeliverable booking answers 503; the sitemap has 231
  URLs, each returning 200.
- Headless Chromium against the original build and this branch: no service
  worker vs. active; storage blocked → "Critical Error" vs. normal page; no
  gambling notice vs. present. Initial load at 1280×800: `/rentals` 14.7 MB →
  4.5 MB; a rental detail page 6.1 MB → 4.3 MB.
- `npm test`: 22 unit and route tests. They call the real handlers, including
  an escaped admin email checked through a stubbed Resend.
- `npm run test:e2e`: 15 Playwright tests (pages, headers, canonical, gambling
  notice, booking failure path, concierge always replies).
- `npm run test:db`: 42 role-by-role policy checks on PostgreSQL 16, run on a
  fresh database and on one built from the old SQL. The old holes were
  reproduced first; without `03` the suite fails on `javascript:` image URLs.
- Production Supabase was only read: tables, RLS, policies, functions,
  triggers, grants, bucket settings, advisors, row counts by role. No writes.
- Not verified: the variables set in Cloudflare, and any live deployment.

## Production database snapshot (2026-10-04, read-only)

- RLS enabled on every table. Policies: catalog public-read/admin-write,
  `bookings` insert-only for guests, `profiles` and `partner_listings` scoped
  to owner or admin through `is_admin()` / `is_partner_or_admin()`. Triggers
  protect roles and force moderation. The `listings_media` bucket takes images
  only, up to 10 MB, into the uploader's own folder.
- Rows: `bookings` 0, catalog tables 0, `partner_listings` 0, `profiles` 1
  (role `user`). The `chat_*` tables belong to Gorgona Chat, another app in the
  same project (RLS on, service-role access only).
- Advisor warnings: SECURITY DEFINER functions executable by `anon`
  (addressed by `03`), leaked password protection disabled.

## What was already good

- No secrets anywhere in git history. The full history was scanned for common
  key formats; the only hits in the vendored code are test fixtures.
- Production RLS had been hardened carefully, beyond what the repo showed.
- The local AI brain adapter is defensive (timeouts, circuit breaker, never
  throws), and all 16 locales have all 300 translation keys.
- External links use `rel="noopener noreferrer"`, and nothing uses
  `dangerouslySetInnerHTML`.
