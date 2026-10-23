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

## Browser regression

After a production Next.js build, run `node tests/i18n/browser.mjs` with a local
Playwright Chromium installation. Case names can be supplied as arguments.
`I18N_BASE_URL` selects an already running test server; otherwise the suite
starts and stops an isolated Next.js server on port 3024.

The suite checks language/RTL state, layout overflow, persistence, booking and
chat drafts, localized authentication failures, role pages, event records,
iframe identity/state and all 48 route templates. Supplier documents, chat,
booking and authenticated database traffic use deterministic test fixtures.
The test server alone preloads `tests/i18n/server-fixtures.cjs` to supply a
read-only sportsbook row for the unconfigured Supabase placeholder host. This
file is never loaded by the application or deployment. Real supplier payment,
booking and production account operations are outside these tests.

## Deferred automation

General Translation/Locadex generation and CMS translation queues remain a
separate later step. This branch has no active GT workflow, paid generation or
runtime GT dependency. A future workflow should translate only new or changed
owned messages, save its output in git and require the same checks before
release. Existing saved translations should continue rendering without a paid
translation request. Publishing or merging this branch is a separate action.

Structural checks and browser coverage do not replace independent linguistic
review by native speakers.
