# Dining R1–R5 continuation — 1 November 2026

Later acceptance is recorded in [R5 Linux verification](R5_LINUX_VERIFICATION.md):
18/18 real Chromium editor scenarios and the complete Linux pipeline passed,
including 230/230 tests, standalone Next, OpenNext and Wrangler dry-run. The
build/browser limits below describe this earlier stage. Hosted/production
activation and the full R1–R5 scope remain open.

## Result and release boundary

Continued the existing `feat/dining-gateway` checkout from `0ee830bf`, preserving
the latest published catalogue and Headout sandbox work. GitHub's connected API
confirmed remote `main` is still `dc66a872`; terminal `git fetch` failed DNS.
No push, PR, main merge, production application release, production migration,
provider reservation, payment or external notification was performed.

The venue editor is implemented in source. Its additive database migration is
applied and independently exercised in the dedicated staging Supabase project
`kaxslgjbrarapeyoifdh`. The new application/UI has **not** been deployed or
accepted in a browser. The complete R1–R5 objective remains open.

## Implemented

- Administrator-only venue reads and commands at
  `/api/dashboard/dining/venues/[slug]`, with awaited Next.js route parameters.
- Existing canonical venue identities and URLs; no second catalogue of venues.
  Editable metadata includes name, address, neighborhood, cuisine, official
  website, verification date, visibility, experience tags, evidence sources and
  provider destinations. Existing licensed photos and provenance remain fixed.
- Private draft, explicit review checkbox, separate publication, draft preview,
  revision conflicts, idempotent commands and transactional change history.
- Anonymous public reads expose only saved publication snapshots; drafts,
  administrator identities and history never enter public page props.
- Directory, detail page, availability boundary and new inquiry validation share
  the published metadata. Withdrawn venues retain their canonical detail route,
  show the existing unavailable state and reject new requests.
- Publication reads fail closed on an unavailable or malformed snapshot. They
  do not silently restore a venue that an administrator withdrew.
- Previously saved inquiry retries use historical canonical metadata and stable
  fingerprints. Rename, withdrawal and pausing new submissions do not break
  recovery or create another request/event. Other identities cannot replay it.
- Restaurant guest-list submissions are rejected; the option belongs to nightlife.
- The editor interface covers all sixteen languages. The existing description
  stays read-only, retaining reviewed translations; publishing a changed
  description is blocked until its language catalogue is reviewed. This release
  does not claim automatic translation of arbitrary new editorial prose.
- The dining inquiry-to-outbox-to-email path is covered with a simulated provider.
  No real email or Telegram message was sent or dispatch scheduler enabled.

## Database evidence

Local migration: `supabase/migrations/20261101064000_dining_editor.sql`.
SHA-256: `79b3fb49950e19b5cd2720e4f15b2f0534dd73aac6ea208f691831c1cdab70f4`.
Supabase recorded the applied staging migration as `20261101063950`, name
`dining_editor`. The CLI was unavailable and absent from the offline npm cache;
the reviewed SQL was applied using the connected Supabase migration tool.

New tables:

| Table | Access |
| --- | --- |
| `private.dining_venue_drafts` | Service-only, RLS enabled |
| `private.dining_editor_events` | Service-only, RLS enabled |
| `private.dining_editor_commands` | Service-only, RLS enabled |
| `public.dining_publications` | Anonymous/authenticated SELECT only, RLS enabled |

`dining_venue_read` and `dining_venue_command` are security invokers, executable
only by the service role. Each checks the current stored administrator profile.
Commands serialize by request key and venue, enforce expected revision, and
record the resulting receipt and event within the same transaction.

Actual staging PostgreSQL acceptance passed draft isolation, publication,
idempotent replay, stale-write rejection, independent draft/public versions,
withdrawal, audit counts, anonymous reads, private table denial and RPC/write
grants. Acceptance writes ran inside a transaction and were rolled back.

Existing data matched before migration, after migration and after acceptance:

| Existing data | Rows | Ordered row digest |
| --- | ---: | --- |
| Bookings | 13 | `6c1252b5b745e1c6c70d8efe5ae4bb05` |
| Request events | 30 | `7136399a9000de324f0dec910379d744` |
| Notification deliveries | 214 | `f70d62b633e2b2771e417aabe9b44d06` |

These are preservation checks on dedicated staging, not a production backup.
The security advisor added only the three expected private-table
[RLS-without-policy INFO findings](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy),
which enforce browser denial. The pre-existing
[leaked-password protection warning](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
remains unchanged. No additional security warning was introduced.

## Verification and limits

- PASS: 30/30 focused SQL/API/editor/inquiry/notification/route-context tests,
  including competing saves, publication rollback controls and inquiry recovery
  after catalogue changes. Evidence: parent `outputs/dining-r5-focused-final.log`.
- PASS: sixteen saved language catalogues, 918 messages each, no missing entries;
  editor-specific sixteen-language coverage is also asserted in focused tests.
- PASS: syntax and relative import resolution across all seventeen changed
  JavaScript modules; `git diff --check`.
- Full regression output is retained in parent
  `outputs/dining-r5-regression-final.log`: 227 passed out of 230, with three
  environment failures and no skips. The TicketNetwork native-Worker tests
  cannot connect to loopback (`EACCES`); the existing staging symlink-integrity
  test cannot create its Windows junction (`EPERM`). These environmental failures
  are not reported as passed or silently skipped.
- NOT ACCEPTED: complete Next.js build, OpenNext packaging, hosted editor,
  desktop/mobile/RTL visual checks, Safari and screen-reader acceptance.
  The first build could not fetch Google Fonts because DNS was unavailable.
  Reusing actual previously built font bytes removed that dependency, but normal
  and isolated builds then failed creating Next output directories with `EPERM`.
  A single-process diagnostic also reproduced this filesystem error. No
  application runtime or dependency versions were changed to hide it.
  The task-created `.r5-editor-build` diagnostic copy remains excluded from Git:
  automatic sandbox approval rejected its recursive cleanup. It contains public
  source/build data and synthetic fixture configuration, no production secrets.

## Activation and recovery

Both new controls default to false in `.env.example`; no deployed flag changed.

1. Complete a clean build and browser acceptance from the final saved source.
2. Use the dedicated staging environment, where the migration already exists.
   Enable `DINING_EDITOR_ENABLED=true` for published-snapshot reads, then
   `DINING_EDITOR_WRITES_ENABLED=true` for administrator editing.
3. Verify draft save, deliberate response loss/retry, review/publication, stale
   edits, withdrawal, unchanged route/photo provenance and all public readers.
4. Prepare the production schema/state review and recoverable backup before any
   production release; this document is not evidence that release happened.

To pause editing, turn off **only** `DINING_EDITOR_WRITES_ENABLED`. Keep publication
reads enabled once any snapshots exist, especially withdrawn venues. Disabling
the reader or rolling back to code without it could restore static content.
Preserve schema, snapshots, command receipts and audit events. Restore a prior
venue state by saving and publishing a new reviewed revision, preserving history.

## Remaining R1–R5 work

- Build/package and hosted browser acceptance for this editor; controlled
  production activation of the existing structured dining/VIP inquiry migration
  and new editorial workflow.
- Explicitly verified owner-channel setup/receipt and notification scheduling for
  live dining requests; no staging backlog may be drained unintentionally.
- Reviewed multilingual prose editing and additional current venue photography.
- Actual authorized provider API/widget scopes, provider-confirmed booking and
  cancellation/event synchronization, and verified commission reconciliation.
- Headout's production API request thread was reread on 1 November: it still
  contained only the original sent request, with no approval or production key.
  No new outreach was sent. Sandbox data is not production inventory.

Mobile homepage/navigation implementation remains paused pending completion of
the user's Dining & Nightlife condition.
