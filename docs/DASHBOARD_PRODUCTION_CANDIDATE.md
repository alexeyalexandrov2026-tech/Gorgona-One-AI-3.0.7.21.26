# Dashboard production candidate

Preparation only, 25 October 2026. Isolated branch `release/dashboard-owner-email` combines current production/main `5dd85fdc6c643be5383d4f356e79e11e3ee553bf` with accepted dashboard/email preparation `4879bc6afb649b672c7b760ed8a52e64c39959c6`. It does not authorize a production deployment, migration, role grant, scheduler activation or old-key rotation.

## Integration boundary

Preserve the production fleet, original photographs, redirects and translations. Retain `docs/fleet-import/PRODUCTION.md`, `docs/fleet-import/README.md` and `scripts/import/package-miami.py` from main. In the inventory mapper, keep the accepted partner fields and thumbnail, with one existing gallery mapping rather than duplicate object keys. No replacement card/gallery implementation or mail queue is introduced.

The owner and administrator share the protected admin role. Partners draft cars, yachts and accommodation with photos and private contact fields, then submit for owner approval before publication. Customers enquire through Miami Elio. The verified email channel uses the existing transactional outbox and dispatcher; its single provider smoke and owner inbox receipt passed on 24 October. This does not activate automatic production delivery.

## Fresh read-only checkpoint

Remote main remains `5dd85fdc6c643be5383d4f356e79e11e3ee553bf`. The latest production deployment is `33a7d776-6080-4e00-aa0a-fdb9ce3ec657`, version `200b505e-702d-4e05-88d8-737ec33ec607` at 100 percent. The production Supabase project `ctszqhhvalyqxhbfqifx` still has 2 profiles, 0 bookings and 0 partner listings; dashboard history, publication and outbox tables are absent. Existing role helpers, signup and column/moderation guards match the reviewed legacy flow. These reads are not a backup or a successful production booking test.

## Release boundary

Follow `OWNER_EMAIL_ACTIVATION.md`: recoverable backup and restore evidence; reviewed workspace/publication/storage expansions; the complete supported candidate with encrypted server configuration; real booking acceptance before lockdown; then the authorized owner grant and production-safe workspace acceptance. The local SQL rehearsal verifies that publication expansion may precede lockdown and preserves a legacy listing; do not redeploy unsupported Next 14 as an intermediate foundation. Keep provider credentials and the scheduler disabled until queue disposition and the approved canary window are controlled. An encrypted mail key already exists locally; do not create another or reuse the exposed legacy key. Its dependencies and separately authorized remediation remain open.

The normal production entry is `.open-next/worker.js`. The protected staging wrapper/build command is not a production entry. Prepare immutable artifacts with no privileged/provider values in the build environment. Uploading or deploying is a separate operation; secret installation commands can themselves deploy a version.

Validation results must name the resulting candidate SHA, exact commands, build configuration and browser fixture boundaries. Earlier staging, fleet and provider acceptance remain historical evidence until rerun against this candidate. No CI, build, browser or hosted acceptance result is claimed by this initial preparation note.

## Primary operational references

- [Supabase backup and recovery](https://supabase.com/docs/guides/platform/backups)
- [Supabase logical backup and restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
- [Cloudflare runtime secrets and deployment effects](https://developers.cloudflare.com/workers/configuration/secrets/)
