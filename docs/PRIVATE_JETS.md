# Private Jets

## Requested behavior

`/private-jets` is a separate section. Private Jets replaces the Discovery Room entry in the shared desktop/mobile header, footer directory, and homepage world directory. The existing AI chat, `/discovery` route and concierge band continue to function. This is a scoped navigation change, not removal of the AI subsystem.

## Integration and reuse

Reuses the existing locale provider, sixteen-language copy module pattern, shared typography/color tokens, buttons, homepage directory and local travel image. No dependency, API key, database migration, custom booking API or local checkout is added.

The authenticated PrivateJetFinder account explicitly reports tracker `716179668192` as Active. Its generated shared URL is `https://www.privatejetfinder.com/?tk=716179668192`. The generated English Black/Gold embed and provider attribution anchor are retained verbatim in `lib/privateJets.mjs`. The page includes a partner disclosure and direct attributed links before and after the form. Quotes, inventory, bookings and payment remain with the partner and its providers.

Unlike existing foreign-origin provider frames, PrivateJetFinder supplies a script/div embed. It runs in a fixed `srcDoc` document in an opaque sandbox, without `allow-same-origin`. It cannot read Miami Elio cookies, account data or parent DOM. Permissions allow scripts, forms, popups and user-activated top navigation required by the supplier flow. No camera/microphone/location permission is granted. No supplier script is installed in the application document. A failed supplier load leaves the direct link available. The English-only form is explicitly disclosed in all sixteen interface languages.

## Acceptance evidence — 2026-10-31

- New regression checks failed before implementation and passed afterward.
- 28 focused tests passed, zero failures/skips: private-jets, home, worlds, links, Headout, Viator, translation coverage and Worker packaging contracts.
- Saved translation gate passed for all sixteen languages; separate checks cover every new Private Jets label and navigation translation.
- Independent source review found no blocker.
- Production Next 15.5.28 build passed, including lint/type validation and all 37 static pages. OpenNext 1.20.13 packaging passed (1 handler, 103 referenced client assets); Wrangler dry-run passed (753 asset files).
- Local Cloudflare runtime returned HTTP 200 for `/` and `/private-jets`; browser inspection confirmed the new homepage directory/menu entries. Russian interface switching was verified. A later browser-automation timeout prevented a reliable automated click-transition assertion; direct route and asset delivery passed.
- Actual browser preview: supplier form loaded in the opaque sandbox; Miami airport autocomplete returned Miami KMIA/MIA and Opa-Locka KOPF/OPF; date picker opened.
- At measured 390 CSS pixels, the page and supplier body had no horizontal overflow; supplier content height 595px fits the 780px frame.
- No flight enquiry, booking, payment or commission settlement was submitted. Provider checkout and full end-to-end tracking are not tested.

Build/test logs and screenshots are recorded in the release evidence outside the repository. Local evidence is not a published deployment. Source is isolated on `feat/private-jets` from base `ff9878c1` so concurrent catalogue/dining work is not overwritten. A Git push is deliberately not used as a publishing mechanism because the current repository has a wildcard automatic build trigger.

Build environment corrections: dependencies were copied into the isolated Linux source and rebuilt to avoid absolute paths inherited through a shared dependency symlink. The minimal local Linux runtime had no CA certificate store; its smoke process was supplied a Mozilla CA bundle from the official curl project via process-scoped `SSL_CERT_FILE`, with TLS verification retained. Neither workaround changes application dependencies or the host trust store.

## Rollback

The integration has no persistent application data. Revert its source commit and rebuild. A future production release must first capture the then-current Worker version and preserve all runtime bindings. Restore that captured version if hosted acceptance fails. Do not publish an older isolated tree over a newer concurrent release.

## Published release — 2026-10-31

The owner explicitly approved publication. Source `fb59e25e` merges the approved Florida catalogue commit `cdb565e9` with Private Jets, so the parallel catalogue release is preserved. The source and isolated Linux runtime files were compared by SHA-256 before export. The release archive SHA-256 is `4eae414464ee01b85a949720553f83bfd9e4bb67a7996a428da41772bdd7c76a`.

PASS: 36 integrated tests, zero failures/skips; sixteen-language check; Next 15.5.28 build including lint/type validation; OpenNext 1.20.13 package with one handler and 104 referenced client assets; Wrangler dry-run with 763 assets; local Cloudflare HTTP 200 checks for home, Private Jets, Experiences, yachts, rentals, login and sitemap.

Worker version `b770b0ef-35c8-4b77-af67-baae58c88317` was uploaded with `--keep-vars`, inspected before activation, and deployed at 100%. All nine existing binding names/types were preserved. An immediate preactivation guard required the previous version to remain `47227de9-ca1c-459f-af29-58bc39e4f42e` at 100%. That version, containing the Florida catalogue, is the rollback target. Routes, custom domains and cron triggers were not redeployed. Final deployment inspection confirmed the new version remains active at 100%.

Hosted PASS at `https://gorgona-one.com/private-jets`: initial and repeated widget loads; actual Miami/Opa-Locka airport suggestions; date picker; Russian labels; mobile menu; keyboard navigation from the homepage; correct canonical, referral code and iframe sandbox. At measured 390px the page and widget had no horizontal overflow. Browser error log for the checked form was empty. The homepage header and directory contain Private Jets instead of their Discovery entries. The catalogue retained all 71 card IDs in the same order, with no hidden disclosure groups or landing-page supplier frames. Yachts, cars, villas, travel, events, sportsbook directory and login were inspected after publication without an application error.

Desktop production screenshot and structured verification are saved in `../outputs/aviation-partners-2026-10-31/`. Mobile screenshot capture hit a browser automation timeout; its viewport dimensions, layout and navigation were verified separately. No real charter enquiry, booking, payment or commission settlement was performed. No Git push or database migration was needed.
