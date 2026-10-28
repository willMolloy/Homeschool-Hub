# db/

Plain SQL migrations, applied in file-name order (`001_init.sql`, `002_...`). Each migration
records itself in `schema_migration`. There is no migration runner yet — that's ticket S1-08.

## Migrations

| File | What it does |
|---|---|
| `001_init.sql` | The schema below |
| `002_auth.sql` | Family login and sessions |
| `003_minutes_unit.sql` | RF-10: a `minutes` assignment stores no `minutes_per_unit` |
| `004_weight_per_unit.sql` | S2b-03, expand step: `assignment.weight_per_unit` (0.01–100, NULL = subject default, then built-in), backfilled from `minutes_per_unit` ÷ 2 (2 minutes = 1 point) |
| `005_weight_choice.sql` | S2b-04: append-only `weight_choice` history (child, pages/chapters, weight or NULL, `chosen_at`), backfilled one row per child from weighted pages/chapters assignments |
| `006_subject_default_weight.sql` | S2b-30: optional subject default bar width, `default_weight_unit` + `default_weight` (0.01–100), both or neither |
| `007_drop_minutes_per_unit.sql` | S2b-15, contract step: drops `assignment.minutes_per_unit` and 003's `assignment_minutes_unit_no_mpu`. Older migrations still mention the column; they are history and are never edited |

## Tables (001_init.sql)

| Table | What it is |
|---|---|
| `family` | The household. `week_start` (`mon`/`sun`) is the one definition of a week; `school_days` (0=Sun..6=Sat) |
| `child` | A kid in the family |
| `subject` | Literature, Math, ... (name unique per family, case-insensitive) |
| `assignment` | A book/course with total units, start/end DATE, optional `weight_per_unit` (004; NULL = subject default, then built-in). 001's `minutes_per_unit` was dropped by 007 |
| `assignment_child` | Which kids do an assignment (several rows = shared) |
| `event` | Weekly recurring event (co-op, piano): weekdays, capacity fraction, default rule |
| `event_child` | Kids the event takes time from (no rows = whole family) |
| `event_subject_rule` | Per-subject `skip` / `lighter` / `normal` |
| `blocked_range` + `blocked_range_child` | Vacation/holiday/sick days (no child rows = whole family) |
| `week_override` | "This week do N units", `keepEndDate` / `pushEndDate`. **Added beyond the original table list** so overrides persist |
| `log_entry` | One recorded thing, `kind` = `checkoff` or `session`. `id` is the **client-generated UUID** (no default) |
| `log_child_progress` | Units per child for a log entry. Partial unique index: one `checkoff` per (assignment, date, child) |

Design notes
- Dates are `DATE` (local calendar days). The engine's rate and per-day loads are never stored.
- Every child table carries `family_id` with composite foreign keys, so cross-family references are impossible.
- `log_child_progress` copies `assignment_id`, `log_date`, `kind` from its `log_entry` so the partial unique index can live on it;
  a composite FK with `ON UPDATE CASCADE` keeps the copies in sync.
- `units >= 0` in the DB: a mistake is fixed by editing or deleting the entry, not by a negative row.
  (The engine tolerates negatives anyway.)

## Validate

```bash
# what the gate and CI run: creates hh_validate_test on the DATABASE_URL server, validates, drops it
npm run db:validate
# against any EMPTY database you own
DATABASE_URL=postgres://user:pass@localhost:5432/hh_scratch node db/test/validate.cjs
# or with a throwaway embedded Postgres (no install needed)
npm i --prefix /tmp/pgtest embedded-postgres pg
NODE_PATH=/tmp/pgtest/node_modules node db/test/validate.cjs
```

Validated on every gate run and in CI (PostgreSQL 16); also passed on PostgreSQL 18.4 (embedded-postgres).
Not tested on older versions; it uses only features available since PostgreSQL 13 (`gen_random_uuid()` in core).
