# Sunset Exotics catalogue integration

Prepared November 8, 2026 (America/New_York) on `feat/sunset-fleet`, based on
`bae43b74`. The actual production baseline was checked read-only: Worker version
`31762a75-2b42-41d0-8dad-97a4cb268907` at 100%. The baseline application's source
files match its recorded `1097c587` source; subsequent baseline commits concern QA,
CI and documentation. Existing Experiences, Private Jets, dining, AI navigation,
authentication, booking and dashboard behavior must be preserved.

## Imported data

- 260 published car records, each with its own `sunset-<source-slug>` route. The
  30 existing Miami Elio vehicles retain their identities and data (290 total).
- All 3,004 gallery photographs plus 35 separately supplied responsive covers.
  No deduplication by model name or speculative merging of separate vehicles.
- All supplied descriptions, specifications, amenities, interesting facts,
  history, highlights, suggested routes and supplier testimonials. Source SEO,
  dates, identifiers, mileage/extra-mile charges and chauffeur fields are retained.
- Daily/weekly/monthly prices are copied only where supplied. Missing rates,
  deposits and ten missing locations display `On request`. Availability remains an
  enquiry; catalogue publication is not a guarantee that a vehicle is available.
- Supplier prose/testimonials remain verbatim English with an explicit source
  notice. Controls, navigation and new notices cover all sixteen site locales.
  Supplier content is excluded from the site-owned translation inventory.

`source-inventory.json` is the public snapshot captured from the request made by
the supplier's own public inventory page (`fleet_items_public`, published cars).
There is no credential in the snapshot and no private supplier table access.
`assets.json` maps every source image to local display files, original and
published SHA-256 values, source dimensions and the local original archive.

## Images and deployment size

9,959,515,871 bytes of original images are retained in the ignored
`.cache/sunset-originals/` directory. This archive is not needed by runtime/CI and
must not be deployed. Three original JPEGs exceed the static-host file limit;
they are retained in that archive and included in the display conversion.

All 3,039 images have 1600px-bounded WebP display copies and 360px-bounded WebP
thumbnails. Both preserve aspect ratio; detailed gallery photos use contain rather
than crop. The 6,078 published files total 517,613,606 bytes; largest 915,748 bytes.
The gallery's full-size link opens the local display image, not the raw archive.
There are no supplier image requests from the rendered integration.

## Reused architecture and request flow

`lib/rentalsData.js` includes compact supplier summaries. Complete galleries and
long text live in `lib/server/sunsetFleetDetails.json` and are assembled through
the canonical server repository `lib/data/listings.js`; they do not enter the
browser search/AI intent index. Live database reads retain supplier summaries and
search includes supplier matches. Existing partner-publication reads remain.

The original ListingCard, Specs, Gallery and BookingForm are reused. The catalogue
applies body/location filters before stable pagination (24 cards/page). Supplier
attribution is visible; duplicate model names retain different URLs/galleries.
The correct source-selected cover opens first, including nonzero cover indexes.

Enquiries post to the existing same-origin `/api/book` with the supplier's
namespaced slug and title plus `Sunset Exotics`. The first pickup choice uses the
source location rather than claiming the car is at Miami Elio's garage. Existing
idempotency, recovery journal, authorization, rate limits, pending request state,
owner dashboard and notification contracts remain in place. No new SQL, remote
database write, payment provider, supplier booking request or automatic
confirmation is introduced. Payment and availability are handled manually.

No direct supplier checkout/booking link is rendered. The owner can identify the
source car using the slug without losing model variants. Attribution of manually
passed leads/commissions must be reconciled with the partner separately; no
commission receipt or supplier-side acknowledgement is claimed by this import.

## Reproduction and checks

Use the installed Pillow tooling (import-time only; no new application dependency):

```powershell
python scripts/import/prepare-sunset.py --workers 8
npm run i18n:check
node --test --test-concurrency=2 tests/content/*.test.mjs tests/i18n/*.test.mjs tests/dashboard/*.test.mjs tests/concierge/*.test.mjs
node node_modules/next/dist/bin/next build
node tests/content/sunset-browser.mjs
```

The importer validates published car identities, source URL allowlists, response
types, bounded sizes, image decoding/dimensions, cover selection and cached raw
checksums. It rejects incomplete imports. `--metadata-only` regenerates metadata
without downloading or claiming image verification. A new source capture needs
fresh completeness and UI checks; no scraper runs during normal site requests.

Local PASS: 456 tests, zero failures/skips; sixteen saved catalogues; Next 15.5.28
production build with lint/type checks; 260 real local detail responses including
all source prose/gallery references; desktop 1440 and mobile 390; eight gallery
scenarios; one explicitly intercepted local form response; zero external writes
and JavaScript errors. Separate PGlite tests exercise actual request SQL,
supplier identity and idempotent persistence as pending. Fixture acceptance is
not a real production booking or supplier confirmation.

Independent review caught and corrected initial-cover selection and empty
combined filters. Existing source-fleet tests now explicitly retain their original
30-car scope; the new supplier tests cover all 260 additional records.

Release packaging, hosted verification, actual payment, supplier confirmation,
commission settlement, VIN/trim identity and media-reuse licence are not established
by these local checks. The partner approval and fully signed agreement notice were
read in Gmail, but the agreement text was not inspected. Release results must be
recorded separately, never inferred from this preparation report.

## Rollback

This is an application/static-asset change without a migration. Preserve the
then-current production version and all existing bindings/runtime settings before
activation. Roll back to that captured version if hosted checks fail. Do not push
the branch into the repository's wildcard publication flow. Reverting the import
commit restores the previous catalogue; no request/customer data is removed.

Tools: evidence-engineering skill, Chrome DevTools public catalogue capture,
Python/Pillow, Node tests/PGlite, Next, Playwright/Chrome, Wrangler, and an
independent read-only review. No email or message was sent to the supplier.
