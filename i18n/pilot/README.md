# Miami Elio localization qualification

Base: `71163a74d4df46caee59ddad29c363a94516608c` (`main`, 22 October 2026).
Branch: `i18n/gt-locadex-pilot`.

This opt-in pilot qualifies General Translation on Next.js 14.2.35, React 18,
and OpenNext Cloudflare 1.15.1. It does not enable localization sitewide.

## Isolation

- `MIAMI_I18N_PILOT=1` enables the SDK config and `/i18n-pilot`; otherwise the
  route returns 404 and existing Next configuration remains in effect.
  A build-time constant removes the SDK import from the disabled client graph;
  `check-disabled.mjs` verifies the 404, the existing yacht page and all client chunks.
- Only `app/i18n-pilot/fixtures/` enters the automatic JSX compiler. The vendor
  compiler's default includes all JSX; `compiler.cjs` narrows that boundary.
- Existing root layout, locale provider, supplier components, auth, business
  APIs, affiliate URLs, CSS, Next/React versions and deployment config stay intact.
- The controlled GT provider reads the existing locale controller. It has no
  locale key, navigation or refresh; its setter delegates back to that controller.
  GT uses a separate pilot cookie so it cannot replace the site's persistent cookie.
- `runtimeUrl: ''`, `cacheUrl: null` and bundled snapshots prevent visitor-time
  calls to the GT API/CDN. There are no browser credentials.

## Reproducible commands

```sh
npm ci
npm run i18n:pilot:extract
npm run i18n:pilot:check
npm run i18n:pilot:build
npx playwright install chromium
npm run i18n:pilot:e2e
```

The build/dev/start commands use Node rather than shell-specific environment
assignment and support Windows. Build enables the same standalone output that
the existing OpenNext build requires. The test server starts Next only, never
the separate AI router.

For local exploration: `npm run i18n:pilot:dev`, then open
`http://localhost:3100/i18n-pilot`.

## Translation provenance and validation

The ten fixture hashes were extracted with `gt generate`. All 16 locale files
were seeded from existing `lib/i18n.js` translations, without AI API calls.
`seed-pilot.mjs` is a one-time importer and refuses to overwrite existing files.
It is not a future translation engine.

`pilot-resources.mjs` rejects missing locales, missing/stale hashes, blank values,
changed simple `{variable}` placeholders and stale snapshots. A newly extracted
source string fails qualification until all target files contain it. This is
structural validation, not proof of linguistic quality. Rich ICU/plural/HTML
content needs additional validation before sitewide rollout.

## GT project connection and Locadex

The repository contains no account, project ID, credentials or active Locadex
installation. These are external setup requirements, not completed work.

1. Connect the intended GT project and this exact repository. Restrict GitHub
   repository access to this repository; separately set Locadex's target branch
   to the pilot branch. Repository access itself is not a branch permission.
2. Store `GT_PROJECT_ID` and a scoped `GT_API_KEY` in the GitHub environment
   `i18n-pilot`, with Files/Write and Translation queue enabled. Runtime
   translation permission is not needed for this pilot. Never prefix the key
   with `NEXT_PUBLIC_` or paste it into source.
3. For Locadex, target `i18n/gt-locadex-pilot`, use the prefix
   `locadex/miami-i18n-pilot/`, keep Auto-merge off, Changed files only on and
   Preserve local edits on. Limit code work to the pilot source directory.
   Validate with `npm ci` followed by `npm run i18n:pilot:check` and the build.
4. A manual `Localization pilot` workflow with `generate=true` invokes the real
   GT CLI and returns a versioned artifact for its exact GitHub source SHA.
   It refuses other branch prefixes, has read-only GitHub permissions, never
   commits, opens a PR, merges or deploys. This workflow file must first be
   available to GitHub Actions; an unmerged new workflow cannot be assumed
   dispatchable from the UI.
5. Existing PR qualification runs cancel on newer commits and run again for the
   latest revision. Generation remains manual during qualification. Locadex's
   default PR trigger does not restart on every commit, so sitewide automatic
   generation needs the additional orchestration in the approved plan.

## Qualification boundaries

Browser tests cover desktop 1440×1000 and mobile 390×844, all 16 locales, form
state, document navigation count, GT network requests and iframe element/state
preservation. They also visit the unchanged `/yachts` and `/vacation-rentals`
pages. Provider responses are local test fixtures; this tests our integration
without interacting with booking, payments, real provider forms or visitor data.
It does not certify the third-party providers' own translation or live state.

Pending before rollout: real GT generation and cost/quality measurements,
Locadex installation and orchestration, CMS/public-content queue, the 53 listing
IDs and the complete 48-route localization matrix. Passing this pilot is not a
claim that the existing site's translation gaps have already been fixed.

## Local qualification results — 22 October 2026

- Clean `npm ci`: passed; all pre-existing package versions preserved.
- Existing content/backend regression tests: 50 passed.
- Localization structure/compiler tests: 6 passed; CLI validates 10 hashes.
- Default Next build and disabled-build HTTP/chunk checks: passed.
- Enabled Next build and OpenNext Cloudflare bundle: passed. No deployment or
  live Cloudflare runtime qualification was performed.
- Browser scenarios: 6 passed across both viewports, including 16-language
  switching on the pilot and unchanged yacht/vacation-rental pages. No relevant
  console errors, document reloads, GT requests or iframe resets in these scenarios.
- Browser extension tool was not exposed; cloud browser navigation to localhost
  returned `ERR_CONNECTION_REFUSED`. Local Playwright used Chromium 149 from the
  official npm package `@sparticuz/chromium`, outside project dependencies. This
  environment required one fresh browser process per scenario; the standard
  Chromium workflow remains configured for GitHub Actions.
- Build-time sportsbook data fetching reported an upstream connection failure
  through the existing fallback path; the build completed. Live supplier/auth/
  booking/payment backends were not part of this localization test.

No existing supplier components, business modules, main commits or other branch
contents were changed. The root layout and language controller are byte-for-byte
unchanged from the base commit.

Rollback: omit `MIAMI_I18N_PILOT`; no business data migration or vendor changes
are required. Deployment and main-branch merge remain separate reviewed steps.
