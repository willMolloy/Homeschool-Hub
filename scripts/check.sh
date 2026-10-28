#!/usr/bin/env bash
# The full gate: lint, typecheck, build, db reset, tests, test:tz, db validate.
# Needs Postgres 16 with a role that can create databases (default: the local hh_test from the README).
#   scripts/check.sh            # or: npm run check
# The full log is in $CHECK_LOG (default /tmp/hh-check.log); on failure its tail is printed.
set -uo pipefail
cd "$(dirname "$0")/.."
export DATABASE_URL="${DATABASE_URL:-postgres://hh:hh@localhost:5432/hh_test}"
case "$DATABASE_URL" in *_test|*_test\?*) ;; *) echo "DATABASE_URL must point at a *_test database (it is reset)"; exit 1 ;; esac
out="${CHECK_LOG:-/tmp/hh-check.log}"
: > "$out"
step() {
  echo "== $1" | tee -a "$out"
  if ! bash -c "$2" >> "$out" 2>&1; then
    echo "FAIL: $1"
    tail -40 "$out"
    exit 1
  fi
}
step lint "npm run lint"
step typecheck "npm run typecheck"
step build "npm run build"
step db:reset "npm run db:reset"
step test "npm test"
step test:tz "npm run test:tz"
step db:validate "npm run db:validate"
grep -E "Tests +[0-9]+|ALL CHECKS" "$out" | sort | uniq -c
echo "ALL GREEN"
