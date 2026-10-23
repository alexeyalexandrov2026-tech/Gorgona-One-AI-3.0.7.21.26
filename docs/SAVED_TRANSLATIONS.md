# Saved website translations

The current implementation serves checked-in translations for the 16 languages
in `lib/languages.js`. The additional saved catalog contains 920 messages per
language, alongside the existing `lib/i18n.js` and content dictionaries. These
are display translations: no translation provider is called when a visitor
opens a page or switches language.

## Content boundaries

- Translate our navigation, introductions, editorial cards, listing copy,
  forms, filters, errors and accessibility labels.
- Keep all event records in English, including names, descriptions, venues,
  dates and season cards. Translate our surrounding event UI.
- Leave the external YATR and Stay22 documents and widget implementations
  unchanged. Their landing pages update our text without refreshing the iframe.
- Keep the document language and direction synchronized after server refreshes,
  including refreshes that do not change the active client locale.
- Keep brands, product names, URLs, promotion codes, filter values and submitted
  data intact. Prices retain their original amount and currency.
- Preserve customer messages and supplier or partner submissions. A known
  listing receives saved copy only when its ID and current source match.

## Adding or changing owned content

1. Mark owned UI text with `LocalizedText`, `LocalizedElement` or `useSavedText`.
   Translate complete messages; use named slots for values or React elements.
   Do not wrap URLs, enums, event records or user input.
2. For a new data-driven section, explicitly add its owned display fields to
   `scripts/i18n/catalogue.mjs` or `owned-inventory.mjs`. Arbitrary new CMS data
   is not automatically translated by this implementation.
3. Run `npm run i18n:extract`. Import reviewed translations for each target
   language with `node scripts/i18n/import.mjs <locale> < translations.json`.
   The JSON object maps saved message IDs to translated strings.
4. Run `npm run i18n:check` and
   `node --test tests/content/*.test.mjs tests/i18n/*.test.mjs`.
5. Build and review the affected routes, long translations and RTL layouts.
   Preserve unsent drafts, existing filter values and supplier iframe state.

The checker fails for missing, stale or empty registered translations, changed
named slots, unmarked literal JSX/accessibility text and copied long English
sentences. It runs in CI and before `npm run build`. Reviewed dynamic arrays
are inventoried explicitly; the checker is not an automatic semantic audit of
every possible future data source. English fallback preserves unknown material
instead of displaying an unrelated or stale translation.

## Cloudflare packaging

The existing production build now runs `node scripts/i18n/build-worker.mjs`
after the Next.js build. This removes only the generated `.open-next` output,
rebuilds it from the current standalone Next output and checks that embedded
hashed JavaScript/CSS references exist in the packaged client assets. A stale
server manifest cannot silently pass this guard. The previous inconsistent
local package was replayed against the check and correctly rejected.

## Browser regression

After a production Next.js build, run `node tests/i18n/browser.mjs` with a local
Playwright Chromium installation. Case names can be supplied as arguments.
`I18N_BASE_URL` selects an already running test server; otherwise the suite
starts and stops an isolated Next.js server on port 3024.

The suite checks language/RTL state, layout overflow, persistence, booking and
chat drafts, localized authentication failures, role pages, event records,
iframe identity/state and all 48 route templates at desktop and mobile sizes.
The route matrices also detect registered long English prose that remains
visible after switching languages. `I18N_ROUTE_TEMPLATE` can select exact,
comma-separated route templates for diagnosis; leave it unset for full acceptance. The
`global-error-cold` case renders the actual root error boundary in a fresh
browser document for each language, without a mounted locale provider or a
preloaded target catalog, and verifies its recovery button. That fixture is
intercepted only in the test browser and adds no application route.

Supplier documents, chat,
booking and authenticated database traffic use deterministic test fixtures.
The test server alone preloads `tests/i18n/server-fixtures.cjs` to supply a
read-only sportsbook row for the unconfigured Supabase placeholder host. This
file is never loaded by the application or deployment. Real supplier payment,
booking and production account operations are outside these tests.

## Accepted verification scope

- All 16 saved catalogs contain 920 messages with no missing, stale, empty or
  mismatched named-slot entries. All 60 content/runtime tests pass.
- Both production bundles pass: standalone Next.js and a clean OpenNext
  Cloudflare package, with 81 referenced client assets validated.
- All 48 route templates were checked in all 16 languages at 1440×1000 and
  390×844: 1,536 route/language/viewport combinations. The consolidated result
  includes successful targeted repeats of five initial language-loading
  timeouts after the test began awaiting the rendered language selection.
- Fourteen functional browser cases pass, including all-language booking
  draft preservation, chat/role drafts, event records, authentication errors,
  404, iframe state, the cold root boundary and document-locale reconciliation.
- Six smoke cases pass in the local Workers runtime. A browser process crashed
  before opening the final 404 case; that case then passed separately.

These are local fixture-backed checks. Real supplier booking/payment,
production account operations, native-speaker review, Safari and deployment
are not established by this record. No merge or publication was performed.

## Deferred automation

General Translation/Locadex generation and CMS translation queues remain a
separate later step. This branch has no active GT workflow, paid generation or
runtime GT dependency. A future workflow should translate only new or changed
owned messages, save its output in git and require the same checks before
release. Existing saved translations should continue rendering without a paid
translation request. Publishing or merging this branch is a separate action.

Structural checks and browser coverage do not replace independent linguistic
review by native speakers.
