# Partner display copy cleanup — 2026-10-31

The owner approved removing the platform commission sentence and equivalent claims throughout Miami Elio's own interface. Booking, payment, provider and order-support information remains. The existing partner-information URL, referrals, widgets, attribution, checkout, catalogue, design and Private Jets navigation are preserved.

## Changed files

- `lib/headoutCopy.mjs`: shortened notices in sixteen languages; Viator reuses this copy with its own provider name.
- `lib/privateJetsCopy.mjs`: shortened PrivateJetFinder notices in sixteen languages.
- `lib/yatrCopy.js`: shortened English yacht notice.
- `lib/i18n.js`: neutral partner-services heading/body in sixteen languages and neutral Arabic copyright wording.
- `app/events/TicketProviders.jsx` and `app/events/TicketNetworkCatalogue.jsx`: removed the claim while retaining checkout, support and resale information.
- `i18n/source.json` and `i18n/context.json`: updated four messages, with new identifiers for the two changed event paragraphs.
- `i18n/locales/{en,ru,es,he,zh,pt,uk,ja,ko,de,ar,tr,fa,it,fr,pl}.js`: matching yacht, accommodation and event translations; Arabic copyright synchronized with the legacy dictionary.
- `i18n/revisions/{ru,es,he,zh,pt,uk,ja,ko,de,ar,tr,fa,it,fr,pl}.json`: current English source hashes for those messages.
- `tests/content/partner-copy.test.mjs`: checks all sixteen languages, the provider names, event paragraphs and saved copyright text.
- This evidence document.

## Fresh checks

PASS: the new regression failed against the original English Headout claim before implementation and passed after removal. A broad initial search also matched the Arabic translation of the generic affiliate-program label; coverage was scoped to the actual notices rather than removing unrelated labels. The independent reviewer identified missing Portuguese regex coverage; `comiss` was added and the regression passed again.

PASS: 24 focused tests, zero failures/skips, using `node --test tests/content/partner-copy.test.mjs tests/content/headout.test.mjs tests/content/viator.test.mjs tests/content/experience-layout.test.mjs tests/content/private-jets.test.mjs tests/content/ticketnetwork.test.mjs`. The final regex-only change was checked again with the partner-copy test: 1/1 PASS.

PASS: `node --test tests/dashboard/workers-build.test.mjs tests/dashboard/worker-packaging.test.mjs`: 4/4, zero failures/skips. The managed build still pins the checkout, prevents production-Worker misuse and rejects inherited dependency mismatches.

PASS: `node scripts/i18n/check.mjs`: 901/901 messages, zero missing, for each of sixteen languages. Existing Node module-type warnings remain; they do not fail these checks.

PASS: isolated Linux Next 15.5.28 production build, including lint/type validation and static-page generation; OpenNext 1.20.13 package with one server handler and 104 referenced client assets. An initial attempt ran while dependency copying was still in progress and failed to resolve `styled-jsx`; after copying completed, the full build passed. No dependency or source workaround was added.

PASS: SHA-256 comparison of all 863 tracked files available in the sparse Windows checkout against the Linux build source. Unmaterialized files elsewhere in the repository are outside that comparison. The full source archive was extracted from Git before building. Artifact archive SHA-256: `7da06bf14f3255f374112efb88109b17c3b00020384a74215a48bf7d5d60d44c`.

PASS: Wrangler dry-run; local Cloudflare runtime returned HTTP 200 for all 78 affected routes, with no English/Russian commission claim in their HTML. The catalogue retained all 71 card IDs in the same order, without hidden disclosure groups; the Private Jets tracker and sandbox remained present.

PASS: independent source review found no blockers. Its AST comparison confirmed unchanged functional structure and URLs in the six changed application/dictionary modules. The reviewer independently passed the copy regression, all sixteen translation catalogues and the diff whitespace check.

## Published result

Source commits: `b728aaec` (display copy) and `c96223b9` (Portuguese regression coverage), based on production source `c242f745`, which already contains Private Jets and the Florida catalogue. No Git push, database migration, trigger/route redeployment or partner application was performed.

Worker version `2dae06cd-f876-4b5d-a871-11bd351f144f` was uploaded with `--keep-vars`. All nine previous binding names/types were compared and preserved. Immediately before activation, a guard confirmed production still used `b770b0ef-35c8-4b77-af67-baae58c88317` at 100%. The new version was activated at 100% and independently confirmed in the deployment list. The captured previous version is the rollback target.

PASS: hosted HTTP checks for the same 78 routes, including 48 Headout detail pages, 25 event overview/category pages, Experiences, yachts, accommodation, partner information and Private Jets. All returned 200 and omitted the old claim; the 71 catalogue card IDs/order and Private Jets isolation/tracker checks also passed.

PASS: actual production browser inspection in English and Russian. The partner-services page displays the new heading/body. In Russian, Experiences, yachts, accommodation, Events and Private Jets show no commission claim and retain their provider/payment information. The surrounding navigation still contains Private Jets. The published screenshot is saved as `partner-copy-published.png` in this chat's visualization directory. Structured logs are under the workspace's `outputs/disclosure-*` files.

## Boundaries

This change covers Miami Elio-owned display text. Foreign supplier documents inside widgets were not modified or comprehensively audited. No real booking, flight enquiry, payment, affiliate settlement or end-to-end attribution transaction was performed. Full browser-by-browser and mobile regression suites were not rerun for this copy-only change. Existing generic affiliate labels remain where they do not state that Miami Elio earns a commission.
