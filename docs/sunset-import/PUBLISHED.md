# Published Sunset Exotics integration — November 8, 2026

**Published:** https://gorgona-one.com/rentals . The full source snapshot has 260
Sunset Exotics cars, 3,004 gallery photographs and 35 additional responsive cover
images. Combined with the unchanged existing fleet, the catalogue has 290 cars.

The site has native detail routes, complete source descriptions/specifications,
amenities, rich text, local galleries, sixteen-language controls, body/location
filters and 24-card pagination. Supplier text/testimonials remain English with
explicit attribution. Enquiries use Miami Elio's existing form and `/api/book`;
payment, availability and confirmation remain manual. There is no supplier
checkout redirect or newly enabled payment/confirmation service.

## Exact release

- Application source: `6105a2ce65a8b8e2dc9049776be513e89d3088d6`.
- Source tree: `aeba6fb25359bd0144d5b4cbbbec62d30356080c`.
- Linux archive verification: 19,603 tracked files matched Git objects.
- Artifact SHA-256: `510fc8c0333cd323cc9d2c2eb9ef4c451d73ab1575d3cf83a8757ec842c3733e`.
- Worker: `gorgonaoneai3072126`.
- Version: `ed33ea94-fa02-46ec-8635-d1d9e0f4142c`, 100% traffic.
- Deployment: `56f0fd7f-6be9-4ce1-8cf2-47bcf7b533ae`.
- Activated: `2026-11-09T02:38:01.400233Z` (November 8, New York).
- Previous version / rollback: `31762a75-2b42-41d0-8dad-97a4cb268907`.

The upload used `--keep-vars`; version metadata verified all 11 previous binding
definitions/API-visible values and runtime settings. Non-versioned logging,
observability and tail-consumer settings were checked before and after activation.
No routes, DNS, triggers, cron schedules, migrations, roles or secrets were
changed. Secret values are opaque; raw-value equality was not read or claimed.
The source branch was not pushed into the wildcard automatic publication flow.

## Fresh verification

Every PASS below has a successful process exit and retained evidence under the
sibling `outputs/` directory.

| Gate | Observed outcome | Evidence |
| --- | --- | --- |
| Full content, i18n, dashboard and concierge tests | PASS 456/456, zero failures/skips, Windows and immutable Linux source | `sunset-all-tests.log`, `sunset-linux-release.log` |
| Existing fleet and focused supplier checks after final data change | PASS 21/21 | `sunset-focused-tests.log` |
| Saved translations | PASS 16 catalogues, 919 messages each | `sunset-linux-release.log` |
| Dependency audit | PASS, zero reported vulnerabilities | `sunset-audit.log` |
| Next production build / lint / type checks | PASS, Next 15.5.28 | `sunset-next-build.log`, `sunset-linux-release.log` |
| OpenNext package and Wrangler dry-run | PASS, 1 handler, 108 referenced client assets, 6,880 assets | `sunset-linux-release.log`, `sunset-worker-dry-run.log`, `sunset-inactive-upload.log` |
| Published image files | PASS 6,078 local WebP files decoded/verified; source-to-gallery coverage and published hashes tested | `assets.json`, supplier tests and command result |
| Privileged-value/client-config artifact scan | PASS 1,621 text files, four known private values absent, production public project present, no staging client reference | `sunset-artifact-scan.json` |
| Actual local Worker | PASS 260 car pages, 11 retained routes, 21 image hashes | `sunset-local-smoke.json` |
| Inactive HTTPS version | PASS 260 car pages, 11 routes, 21 image hashes, unauthenticated dashboard 401 | `sunset-preview-smoke.json` |
| Inactive HTTPS browser | PASS 60 checks; 1440/390 viewports, 24 visible-card image decodes per viewport, selected cover/last-photo navigation, RU/HE forms, no overflow, errors or external writes | `sunset-preview-browser/results.json` |
| Main domain after activation | PASS 260 car pages, 11 routes, 21 exact image hashes, sitemap includes every car, dashboard rejects unauthenticated requests with 401 | `sunset-production-smoke.json` |
| Main-domain browser after activation | PASS 60 checks with the same desktop/mobile, gallery and locale scope; zero application errors/external writes | `sunset-production-browser/results.json` |
| Final deployment/configuration | PASS active version at 100%, 11 bindings, runtime and checked non-versioned settings preserved | `sunset-production-final.json` |
| Independent review | Initial cover and empty-filter issues corrected; final review found no source-level blocker | Reviewer messages for `6105a2ce` |

Local form acceptance intercepted exactly one explicitly labelled response and
checked the real same-origin serialized payload, idempotency key and source
pickup location. Separate PGlite tests persisted the actual supported SQL request
once, retained its exact supplier slug/title and pending status, and replayed its
receipt. The local Worker intentionally had no production server credentials;
its protected dashboard returned 503. That is not counted as a successful local
authentication test; actual inactive and production dashboard gates returned 401.

## Boundaries

No real production customer enquiry, payment, supplier confirmation, commission
credit or notification delivery was submitted/tested. Hosted checks were read-only
and intentionally blocked browser writes. The integration uses a captured price
snapshot; it does not promise automatic supplier price/availability synchronization.
Commercial availability and VIN/trim identities remain supplier assertions. The
signed partner agreement's text/media licence was not reviewed.

Raw originals total 9,959,515,871 bytes and remain in the ignored local archive.
The published display photos preserve all source images with bounded dimensions;
they are optimized copies, not byte-identical full-resolution original downloads.
Their 6,078 display/thumbnail files total 517,613,606 bytes, maximum 915,748 bytes.
No source image host is a runtime dependency of the imported galleries.

The subsequent documentation commit records these observations; it is not a new
application artifact or a second deployment.
