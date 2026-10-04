# GORGONA ONE

A luxury concierge and lifestyle marketplace: yacht charters, exotic car
rentals, villas, dining and nightlife, experiences, events, sportsbook
promotions and store deals, with an AI concierge ("The Discovery Room") in
16 languages.

Next.js 14 (App Router), React 18 and Tailwind CSS; Supabase for accounts,
the partner portal and bookings; Resend for email; deployed to Cloudflare
Workers with OpenNext.

## Local development

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in what you need. Every value
   is optional: without Supabase the catalog still renders, but sign-in, the
   portals and stored bookings do not work.
3. `npm run dev` starts the site on http://localhost:3000 and the bundled
   ai-router on port 20128.

## Tests

- `npm test` - unit and API route tests (node:test, no server needed).
- `npm run test:e2e` - Playwright smoke tests; starts `next dev` itself.
- `npm run test:db` - database policy tests; needs a local PostgreSQL 15+
  superuser (`PGHOST`, `PGUSER`, ...). See `database/README.md`.

CI (`.github/workflows/ci.yml`) runs the unit tests, the production build
and the database tests on pull requests and pushes to `main`.

## Build and deploy

- `npm run build` builds the site, the OpenNext Cloudflare bundle
  (`.open-next/`) and the ai-router.
- Cloudflare Workers Builds deploys `main` (`wrangler.jsonc`).

## Layout

- `app/` - routes; `app/api/` holds book, chat, notify and search.
- `lib/` - catalog data (`*Data.js`), translations, AI helpers.
- `database/` - Supabase SQL with run order and production status in
  `database/README.md`.
- `scripts/` - seed SQL generator, `optimize-images.mjs` (run it after
  adding photos), `test-db.sh`.
- `tests/`, `e2e/` - test suites.
- `docs/ARCHITECTURE.md` - current architecture and roadmap;
  `docs/AUDIT.md` - the October 2026 audit and its open owner actions.
- `ai-router/` - vendored 9router, the concierge's model router in
  development. `new ia/` - vendored copies of OmniRoute and 9router that the
  site does not use.
