# Dining R5 — verified Linux checkpoint, 1 November 2026

## Current result

The venue editor has passed real Chromium component workflows and the complete
Linux test/build/package/dry-run pipeline. This closes the build verification
blocker recorded in `R5_VENUE_EDITOR.md`. It does not activate the editor or
structured dining requests on the public website, certify hosted staging UI,
or complete the full R1–R5 business/provider scope.

Verified application/workflow commit:
`510ddc2227ea60f39a85cd6d31f204db2dd0d0ab`.
Git tree: `f25ae33ce1b749bd69b4f6515880f9f9762cfd61`.
Branch: `codex/dining-r5-verification-20261101`.
[Successful Linux CI run](https://github.com/alexeyalexandrov2026-tech/Gorgona-One-AI-3.0.7.21.26/actions/runs/41284891656).

The checkpoint includes the current unpublished repository baseline as well as
the R5 changes, preserving existing catalogue, navigation, translations and
staging integrations. All 204 changed/new files were uploaded with matching Git
blob SHAs; the complete 13,495-file tree was independently computed locally and
matched GitHub. No file was deleted. A documentation-only follow-up may advance
the branch; the application/build acceptance above belongs to the pinned commit.

Remote `main` remained `dc66a872e9c4d902b89ab82f933748a614722414` after verification.
No PR, main merge, production deployment/migration, reservation, payment,
provider outreach or real email/Telegram delivery was performed.

## Acceptance evidence

| Check | Result | Scope |
| --- | --- | --- |
| Complete Linux regression suite | **230 passed, 0 failed, 0 skipped** | Content, i18n, SQL, dashboard, provider and release contracts |
| Saved translations | **16 locales, 918 messages each, zero missing** | Existing saved catalogues plus editor-specific copy checks |
| Next.js standalone build | **PASS** | Next 15.5.28, Node 22, normal Linux filesystem/network |
| Cloudflare packaging | **PASS** | OpenNext 1.20.13, 1 server handler, 108 referenced client assets |
| Wrangler dry-run | **PASS** | Complete staging-wrapper import graph, no deployment |
| Upload size | **14,144.47 KiB; gzip 2,779.04 KiB** | Wrangler bundle report; not a runtime/startup benchmark |
| Actual Chromium editor workflows | **18/18 PASS** | Real React editor and SQL-backed server handlers; synthetic identities only |
| JavaScript syntax/imports | **PASS** | 19 changed JS modules, 88 resolved relative imports |
| Whitespace/diff check | **PASS** | `git diff --check` |

The Linux run also passed the two native Workers/loopback tests and the junction
integrity test that the Windows sandbox could not execute. Windows still has
intermittent `EPERM` during output-directory creation and `EACCES` for loopback;
no host security setting, filesystem ACL or production runtime was altered.

## Browser coverage and fixes

`tests/dashboard/dining-editor-browser.mjs` renders the actual editor and locale
provider with real licensed font bytes. Only the Next navigation hooks are
replaced; page routing, the full admin page, hosted Auth, Safari/iOS and provider
checkout are not represented as tested by this harness. No HTTP server or
provider connection is used; calls go through the real handlers and disposable
PGlite SQL fixture.

Passed scenarios:

- Desktop: save followed by deliberate response loss, retry with one revision,
  draft isolation, review checkbox, publication and public snapshot readback.
- Mobile: a competing administrator edit, visible conflict with local text
  retained, explicit reload, withdrawal and public unavailable state.
- All sixteen languages at 320px, including Arabic/Hebrew/Persian RTL: controls
  present, no JavaScript errors and no horizontal document overflow.

The browser run exposed an actual accessible-name defect: the description hint
was inside its label. The field now has an independent label and
`aria-describedby`. URL/reference fields explicitly retain LTR direction in RTL;
native controls use the editor's light color scheme. The final browser run
passed after these changes; desktop and Arabic screenshots were inspected.

Local evidence: parent `outputs/dining-r5-editor-browser/results.json` and its
18 screenshots, `dining-r5-browser-run.log`, `dining-r5-continued-tests.log` and
`dining-r5-continued-i18n.log`.

## Verification artifact, not a live release

GitHub artifact `dining-r5-qa-worker`, ID `13074609123`, retained until
8 November 2026. Archive digest:
`sha256:0d37256af8b5872dfc5483e59131573b7ad96fddf103c1809284426cd3bd344f`.
The artifact is available from the successful run above; it was not downloaded
again onto the laptop.

This is deliberately a **QA-only** artifact with synthetic public configuration.
Its wrapper metadata has `verificationOnly=true`, an invalid QA project ID and
null tree/key/artifact verification fields. Both staging runtime identity checks
and the existing exact-release activation guard reject it. It must not be
promoted as an approved staging or production bundle.

The first Linux run passed all tests, standalone compilation and packaging,
then correctly failed the dry-run because its QA scenario had not created the
wrapper's release JSON. Only the verification workflow was corrected to supply
the explicitly non-deployable QA metadata. The complete second run passed.
No application gate or release verification was weakened.

## Next release boundaries

1. Build a separate exact-source, dedicated-staging release using the real
   public project configuration and approved immutable release metadata. Run
   hosted Auth/customer/partner/admin/editor acceptance on that release.
2. Review production schema/state and recoverable backup before enabling the
   existing structured dining/VIP requests and editorial snapshot reader there.
3. Confirm actual owner notification configuration/receipt before scheduling
   live dispatch; do not drain the staging test backlog.
4. Obtain actual provider grants/scopes and validate inventory, confirmations,
   cancellations/events and commission reconciliation. Headout production access
   is still not confirmed; sandbox success does not authorize production access.
5. Complete reviewed multilingual prose editing and any additional venue-photo
   permissions. Existing reviewed descriptions and licensed photo provenance
   remain protected.

The source, staging SQL and local editor checks are complete for this increment.
The full R1–R5 objective remains open, so the mobile homepage/navigation work
remains paused under the owner's earlier condition.
