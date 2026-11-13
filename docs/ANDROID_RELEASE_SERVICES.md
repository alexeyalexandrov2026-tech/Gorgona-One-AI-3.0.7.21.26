# Miami Elio Android server release

This worktree was based on `origin/main` at `1a31a3f7`. The Android
client needs the plan API, the favorites bridge with write receipts, in-app
AI answer reports and the account-deletion path. The server uses the existing
catalogue, Supabase Auth and dashboard role checks.

## Migration and rollout

Follow the [controlled database release procedure](CONTROLLED_DATABASE_RELEASE.md).
Compare the active project schema and migration ledger with these three files.
Before applying them, verify the relevant backup, prerequisite tables, roles and
functions, and obtain approval for the exact reviewed SQL. The source SHA-256
values below are for the files in this worktree.

| Order | Source file | SHA-256 |
| --- | --- | --- |
| 1 | `20261111150000_booking_plans.sql` | `d4e55b2196c398890c3e3d1f80ba1d11b33505dfbd2c68f291dc0e549f95611b` |
| 2 | `20261112100000_my_miami.sql` | `5343f40a1eccc282b3d0115e778de3eee9c7fa7cd604822d53f317a0c3d7728a` |
| 3 | `20261113140000_app_support_requests.sql` | `75f51b95b81263acac16f0ae29d04acc8f82e593f3b701aae76e7f0ea2b3c99a` |

The November 13 read-only preflight found the dashboard prerequisites and
dining column in production. The three new tables and their migration entries
were absent. Production also has a separate per-booking Telegram outbox
trigger. Check its dispatcher and notification count during the rollout
before using a live plan request as acceptance evidence.

After migration read-back, deploy the reviewed application commit. Verify
`BOOKING_RATE_SECRET` and the existing Supabase configuration in the environment.
Enable `MY_MIAMI_ENABLED` and `PLAN_REQUESTS_ENABLED` after confirming their
database dependencies. Restaurant plan items also require
`DINING_REQUESTS_ENABLED` and `DINING_SCHEMA_ENABLED`.

Use a designated test account and labelled requests in the acceptance
environment. Confirm that replay returns the original plan and booking IDs,
including after verified-email claim. Confirm that another account cannot read
those IDs or receive its favorites. Check that a guest favorite survives
restart and becomes an account favorite after sign-in. In the staff dashboard,
confirm AI report receipt, visibility to administrators, and audited closure.
Check `/privacy` and `/account/delete` from a signed-out browser and from the app.

Keep existing data when rolling back the application. Use the two existing
feature flags to stop new plan requests or account favorite changes while
diagnosing an issue. Record actual applied versions and live acceptance results
alongside the source hashes.

## Staff processing for account deletion

The form records a request for the verified account. Staff see it in the
`App support requests` section of the administrator dashboard. The dashboard
can close it once the linked Auth record has been removed. Closure records the
administrator and time.

1. Assign the request to the account-support operator. Use the request ID and
   verified account email. Contact the requester through the approved support
   channel and record the request ID in the restricted operations record.
2. Review active bookings, organization membership, partner listings and media
   ownership before deletion. Confirm the applicable retention decision with
   the responsible operator. A booking, plan, free-text note, chat/session log,
   support report, notification copy or backup may contain identifying data.
   The Auth account foreign key does not erase those copies.
3. Remove the profile and non-retained data, or redact identifying fields where
   a record must be retained. Check database references, external processors and
   backups according to the approved retention schedule. Delete the Supabase
   Auth user after resolving required ownership transfers and revoking access.
4. Verify that the old session no longer accesses account data, the profile and
   favorites are gone, and the remaining data matches the approved retention
   decision. Close the request in the dashboard and confirm completion to the
   requester through the approved channel.

Before the Play submission, assign a named operator and rehearse these steps
using a disposable account in the deployed acceptance environment. Record the
applicable retention periods and contact channel in the public privacy notice.
The local fixture covers request intake and guarded closure, with the hosted
deletion process pending. [Google Play account deletion guidance](https://support.google.com/googleplay/android-developer/answer/13327111)
