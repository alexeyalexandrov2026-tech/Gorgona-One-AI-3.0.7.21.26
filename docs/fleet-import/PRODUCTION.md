# Fleet production integration

Approved on 23 October 2026. Release branch: `release/miami-fleet-only`.

## Source and preservation boundary

Fresh main is `5fcd0fa18cca537ea079a9a88a05b8109290d151`, but the current production Worker was built from `dashboard/workspaces` commit `413500de0504036e88dba60f5cd20a6e944ba5bf` (Cloudflare build `9cefc17d-a348-4c32-8ae3-f3bcda745d44`). A main-only fleet candidate would roll back already deployed functionality and is superseded.

This release merges the actual production source with the reviewed fleet. The 89 baseline files already deployed from `413500de` are reconciled into main through the PR. Application components, Auth, booking journal, dashboard/server handlers, migrations, package/lock, CI and Worker/build configuration are preserved byte for byte from that production source. The separate partner-publication release on shared staging is not promoted.

## Fleet delta

30 cars: 13 new and 17 historical records, including the corrected historical BMW X5 card. White/brown and Brooklyn Grey/brown X5 remain separate. CLE53/CLE300 and GLS variants with different interiors remain separate. The source white G550 is excluded. Numerical source prices and deposits are not published.

Changed content: `lib/rentalsData.js`, `lib/miamiFleetImport.js`, `lib/homeData.js`, `lib/data/listings.js`, `next.config.js`, fleet translations, `public/images/rentals/`, import/seed preparation scripts and fleet tests. The old mislabeled G-Class URL redirects to the white X5. The 163 imported JPEG originals and all 293 active images/thumbnails match the approved fleet. Existing ListingCard, Gallery, Specs and BookingForm components are preserved.

The public catalogue reads static data. No SQL seed or migration is executed by this integration. Migration source files belong to the already deployed baseline.

## Validation evidence

The previous main-only 70-test/build/browser reports are historical and do not establish readiness of this corrected candidate. Current local logs use the `fleet-production-preserved-` prefix in the parent folder.

The first full Windows run discovered 116 tests: 115 passed; one pre-existing staging-artifact symlink test failed because Windows denied creation of a file symlink (EPERM). This test must pass in exact-head Linux CI; it must not be skipped or weakened. The merged translation check passed: 16 languages, 948 messages each, zero missing entries.

Final build, browser, Worker packaging, exact-head Linux CI and hosted rollout results must be recorded separately after they finish. Never infer successful booking delivery from an invalid-payload 400 response.

## Deployment and rollback

Before any release-branch push, prevent the production wildcard trigger from publishing it. Preserve the main trigger and all unrelated build settings. Merge only through the reviewed PR after exact-head checks. Preserve the current production public build configuration and runtime bindings.

Pre-release production deployment: `7171ecdf-ec6a-491d-a90e-c0157d40dcf3`; version: `aa8627d1-2a7d-4f3a-ae74-46228ff10926`. Shared staging remains independently owned at unified source `fc91187572c1f6e5a17fb02a06a5310890288c28`.

## Unverified boundaries

VIN identity of two white photo collections, exact model years/trim/paint codes and commercial availability are not established. They are catalogue variants, not verified VIN identities. Successful real bookings, production database operations and external notification delivery are not tested; do not activate credentials, run SQL or submit real customer requests as part of this fleet release.
