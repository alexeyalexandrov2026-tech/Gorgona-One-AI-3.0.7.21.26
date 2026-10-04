#!/usr/bin/env bash
# Applies database/00-03 to a throwaway database on a local PostgreSQL 15+
# server (twice, to prove the files are re-runnable) and runs the RLS tests.
#
#   PGHOST=localhost PGPORT=5432 PGUSER=postgres scripts/test-db.sh
#
# Needs a superuser connection (it creates roles and a database). Never point
# it at the Supabase project.
set -euo pipefail

cd "$(dirname "$0")/.."

DB="gorgona_db_test_$$"
psql -v ON_ERROR_STOP=1 -q -d postgres -c "create database $DB" >/dev/null
trap 'psql -q -d postgres -c "drop database if exists $DB" >/dev/null' EXIT

# Expected "does not exist, skipping" notices from the idempotent DROPs are
# hidden; warnings and errors still show.
run() { PGOPTIONS='-c client_min_messages=warning' psql -v ON_ERROR_STOP=1 -q -d "$DB" -f "$1" >/dev/null; }

run database/tests/supabase_stub.sql
for pass in 1 2; do
  for file in database/0*.sql; do
    run "$file"
  done
done

# Each check prints "ok - ..." as a notice; a failing one stops the run with
# "ERROR: FAIL: ..." and a non-zero exit status.
psql -v ON_ERROR_STOP=1 -q -d "$DB" -f database/tests/rls_test.sql 2>&1 \
  | sed -n -e 's/^psql:[^ ]* NOTICE:  //p' -e 's/^psql:[^ ]* ERROR:  /ERROR: /p'
