# Security tests

```bash
npm run test:security
```

The database tests load `database/*.sql` into PGlite, an in-process
Postgres, with stand-ins for the Supabase roles (`anon`, `authenticated`),
`auth.uid()` and the storage tables. Each test runs a statement as a visitor,
a user, a partner or an admin and checks what the database allowed. Nothing
connects to Supabase or to the live site.

The route tests import the API handlers directly, with email sending and the
browser Supabase client replaced by in-memory fakes.

## Showing the problems on main

`SECURITY_TEST_ROOT` points the same tests at another copy of the code. Export
`main` into a folder inside the repository (so it finds `node_modules`) and run
the tests against it; the checks that fail there are the problems this branch
fixes.

```bash
mkdir .baseline-main
git archive main app lib database .gitignore .env.example ai-router/scripts/test-combo-autoswitch.mjs | tar -x -C .baseline-main
SECURITY_TEST_ROOT=.baseline-main npm run test:security
```
