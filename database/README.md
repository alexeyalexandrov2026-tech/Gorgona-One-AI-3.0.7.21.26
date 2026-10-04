# Database (Supabase)

SQL for the Supabase project behind the site. Run the files in order; each one
is idempotent, so re-running any of them is safe.

| File | Sets up |
| --- | --- |
| `00_profiles_schema.sql` | `profiles`, the role helpers (`current_app_role()`, `is_admin()`, `is_partner_or_admin()`), the sign-up trigger, the trigger that stops users changing their own role, and the profile policies |
| `01_partner_listings_schema.sql` | `partner_listings`, the moderation trigger (partner edits always go back to `pending`), its policies, and the `listings_media` bucket (images only, 10 MB) with owner-folder upload policies |
| `02_catalog_schema.sql` | catalog tables (stores, coupons, sportsbooks, events, …) and `bookings`, with RLS: catalog is public to read and admin-only to write; `bookings` is insert-only for guests |
| `03_security_hardening.sql` | revokes API access to internal functions and adds CHECK constraints on partner listings and bookings |

## Production status

Checked read-only against the production project on 2026-10-04:

- `00`–`02` match production. Production also has a duplicate set of
  `public_read_<table>` select policies from an earlier migration; they are
  identical to `<table>_public_read` and harmless.
- **`03_security_hardening.sql` has not been applied.** Paste it into the SQL
  editor and run it, then re-run **Advisors → Security**. Until then partners
  can store `javascript:` or third-party URLs as listing images, and
  `handle_new_user()` / the role helpers are callable through
  `/rest/v1/rpc/...`.
- There is no admin account yet (one profile, role `user`). Promote your own
  account in the SQL editor:

  ```sql
  update public.profiles set role = 'admin' where email = 'you@example.com';
  ```

Dashboard settings that SQL cannot change (Authentication settings; see
Supabase's [password security guide](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)):

- enable *leaked password protection* (flagged by the security advisor), and
- set the minimum password length to 8 - the site's forms already require 8.

## How access works

- Roles live in `public.profiles.role`: `user` (default), `partner` (chosen at
  partner sign-up; everything a partner submits is moderated), `admin` (only
  set by an existing admin or in the SQL editor). The app reads the role from
  `profiles`, never from `user_metadata`, which users can rewrite themselves.
- Policies call the `SECURITY DEFINER` role helpers instead of querying
  `profiles` inline; the earlier inline version made Postgres fail with
  *infinite recursion detected in policy for relation "profiles"*.
- `/api/book` inserts bookings without reading them back: guests have no
  SELECT policy on `bookings`, and PostgREST rejects an insert that asks for
  the new row (`.select()`) when the row is not readable.

## Testing

`scripts/test-db.sh` applies `00`–`03` twice to a throwaway database on a
local PostgreSQL 15+ server (with Supabase's `auth`/`storage` pieces stubbed by
`tests/supabase_stub.sql`) and runs `tests/rls_test.sql`, which checks what
guests, users, partners and admins can and cannot do:

```sh
PGHOST=localhost PGUSER=postgres scripts/test-db.sh
```

It needs a superuser connection. Never point it at the Supabase project.

## Not in this folder

- `public.listings` and the `search_listings()` RPC that `lib/data/listings.js`
  can use for `/api/search` do not exist in production; search falls back to the
  bundled data in `lib/*Data.js`.
- The `chat_*` tables belong to Gorgona Chat, a separate app that shares this
  Supabase project.
