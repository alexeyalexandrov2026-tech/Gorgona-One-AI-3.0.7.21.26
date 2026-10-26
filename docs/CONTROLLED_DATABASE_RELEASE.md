# Controlled database releases

Status: proposed policy change; not deployed. Application release PR31 is live at
main `b74b16784e63e18411cbcf26dfdec1291439ca07` with the reviewed source tree
`1731e4b4e4c683a0518008c594bb5879317db2d8`.

## Reason and scope

The production project `ctszqhhvalyqxhbfqifx` is shared with other components.
Seven earlier database migration versions are absent from this repository.
The four explicitly approved dashboard SQL operations were applied through the
Supabase migration API, which recorded generated versions rather than the source
filenames. The integration's exact-main Supabase Preview check failed with
`Remote migration versions not found in local migrations directory` before any
automatic application of this repository's SQL.

The source directory is not a complete baseline for this shared database, and its
timestamp order is not the reviewed application/acceptance/lockdown release order.
Do not repair this failure by deleting migration history, resetting the database,
importing unrelated schemas, or replaying the source files.

`supabase/config.toml` proposes an explicit manual database release contract:
automatic migration and seed steps are disabled. This preserves the real schema
and migration history; it does not synchronize them or prove migrations passed.
The local `project_id` does not select a remote project. No remote/Auth/API/Storage
configuration or Edge Function settings are introduced.

Supabase documents this supported control in its
[GitHub integration guide](https://supabase.com/docs/guides/deployment/branching/github-integration).
The policy must be approved and its hosted check observed on the exact new main
commit before restoring the held Cloudflare auto-deploy command. A skipped
migration step must be reported as disabled, not as successful migration execution.

## Recorded dashboard release

Only outer transaction wrappers were removed for the transactional migration API.
The original files remain unchanged. Applied order and hashes:

| Source | Applied version | Source SHA256 |
| --- | --- | --- |
| `supabase/migrations/20261023145628_dashboard_workspaces.sql` | `20261026022849` | `6fe970a72f529e3861010b12a1e6627962aa6dc523bd9d218f94bc3f65c67fa3` |
| `supabase/migrations/20261023200000_partner_publication.sql` | `20261026022854` | `18a0468e003ac4c4725b0cc4f32db087f6724c5a4b4afabd799186c039f7be11` |
| `supabase/storage/partner-listing-images.sql` | `20261026022901` | `f33dacc1b17daa827198de00340309e99a81143af7177180719e87b736957045` |
| `supabase/migrations/20261023145804_dashboard_lockdown.sql` | `20261026023058` | `7c737c69210a4f306eacdc3bf6b75bc84fbd598b341c045a52ff0420555720c8` |

The first three expansions preceded activation of the supported server. A labelled
guest booking and replay passed before lockdown, and a second passed afterwards.
Four browser-role direct-write/RPC attempts were denied with SQLSTATE `42501`.
The exact confirmed owner received the admin role and opened the real dashboard
using an existing normal session. No password/session was created or reset.

Two technical bookings and four unsent deliveries are retained for audit. Email,
Telegram and cron remain disabled. Queue disposition and any notification activation
require a separate approved step.

## Future release requirements

Inspect the exact remote project, active application, affected data, source hashes
and migration ledger. Preserve a fresh relevant backup and review SQL independently.
Apply only the approved SQL in the reviewed order, verify each result, and reconcile
actual state before retrying any uncertain operation. Record source hash, actual
applied version, role/permissions checks and live acceptance. Never run an
unqualified `db push`, `migration repair` or reset against the shared project.

Application rollback after lockdown must remain compatible with the protected
server path and preserve new data. Do not restore the old browser-write application
or drop audit/customer tables to obtain a rollback.

The long-term baseline and ownership of the shared database need a separately
reviewed project-wide migration plan. This two-file change makes no such claim.
